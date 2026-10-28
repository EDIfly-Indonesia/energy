'use strict';

/**
 * Penyediaan wallet DOKU (WaaS sub account) untuk SPKLU.
 *
 * Dua jenis wallet:
 *   1. Wallet PUSAT — satu, ID-nya disimpan di `t_setting.admin_wallet`
 *      (produksi) dan `t_setting.admin_wallet_sandbox` (sandbox). Dipakai untuk
 *      menampung transfer dari wallet user (bayar pakai saldo) dan menjadi
 *      sumber dana refund ke wallet user.
 *   2. Wallet USER — satu per pelanggan, ID-nya di `t_user_mobile.id_wallet`,
 *      dibuat saat registrasi (atau lewat backfill untuk data lama).
 *
 * Status di `t_user_mobile.wallet_status`:
 *   none    belum dibuat
 *   pending DOKU menerima pembuatan tetapi sub account belum aktif
 *   active  sudah terbukti bisa dipakai (cek saldo berhasil)
 *   failed  pembuatan gagal, alasannya di `wallet_error`
 */

const db = require('./database.service');
const { query, run } = db;
const waas = require('./doku-waas');

const NAMA_SETTING_PROD = 'admin_wallet';
const NAMA_SETTING_SANDBOX = 'admin_wallet_sandbox';

function kunciSetting(isProd) {
  return isProd ? NAMA_SETTING_PROD : NAMA_SETTING_SANDBOX;
}

/** Klien WaaS, atau error yang jelas bila kredensial belum diisi. */
function klien() {
  const cfg = waas.configFromEnv(process.env);
  const c = waas.buatClient(cfg);
  return { client: c, cfg };
}

// ------------------------------------------------------------------ pusat

/** ID wallet pusat yang tersimpan di t_setting. null bila belum diatur. */
async function getCentralWalletId(isProd) {
  const nama = kunciSetting(isProd);
  const rows = await query('SELECT value_setting FROM t_setting WHERE nama_setting = $1', [nama]);
  const v = rows.length ? String(rows[0].value_setting ?? '').trim() : '';
  return v || null;
}

/** Simpan/ubah ID wallet pusat di t_setting (upsert). */
async function setCentralWalletId(idWallet, isProd) {
  const nama = kunciSetting(isProd);
  const nilai = String(idWallet ?? '').trim();
  if (!nilai) throw new Error('ID wallet pusat tidak boleh kosong');

  const ada = await query('SELECT 1 FROM t_setting WHERE nama_setting = $1', [nama]);
  if (ada.length) {
    await run(
      'UPDATE t_setting SET value_setting = $1, updated_at = now() WHERE nama_setting = $2',
      [nilai, nama]
    );
  } else {
    await run(
      'INSERT INTO t_setting (nama_setting, value_setting) VALUES ($1, $2)',
      [nama, nilai]
    );
  }

  // configs/global.js membaca t_setting sekali saat startup. Tanpa baris ini,
  // transfer/refund tetap memakai wallet lama sampai pm2 di-restart.
  if (isProd) global.gwallet_admin = nilai;
  else global.gwallet_admin_sandbox = nilai;

  return { nama_setting: nama, value_setting: nilai };
}

/**
 * Buat sub account wallet pusat lalu simpan ID-nya ke t_setting.
 * Idempoten secara praktis: bila setting sudah terisi dan `force` tidak
 * diberikan, tidak ada sub account baru yang dibuat (mencegah duplikat yang
 * tidak bisa dihapus lewat API).
 */
async function createCentralWallet({ name, email, isProd, force = false }) {
  const sudah = await getCentralWalletId(isProd);
  if (sudah && !force) {
    return { dilewati: true, alasan: 'wallet pusat sudah terisi', id_wallet: sudah };
  }

  const { client } = klien();
  const acc = await client.createSubAccount({ email, name });
  await setCentralWalletId(acc.id, isProd);
  return {
    dilewati: false,
    id_wallet: acc.id,
    status: acc.status,
    email: acc.email,
    name: acc.name,
    tipe: acc.type,
  };
}

// ------------------------------------------------------------------ user

/**
 * Buat wallet untuk satu pelanggan dan simpan ke t_user_mobile.
 * Tidak pernah melempar error: kegagalan dicatat sebagai wallet_status='failed'
 * supaya registrasi tetap berhasil dan admin bisa mencoba ulang.
 */
async function createUserWallet(idUser, { force = false } = {}) {
  const rows = await query(
    `SELECT id_user, email, nama, no_hp, id_wallet, wallet_status
       FROM t_user_mobile WHERE id_user = $1`,
    [idUser]
  );
  if (rows.length === 0) return { ok: false, id_user: idUser, alasan: 'pelanggan tidak ditemukan' };
  const u = rows[0];

  if (u.id_wallet && !force) {
    return { ok: true, id_user: idUser, id_wallet: u.id_wallet, dilewati: true };
  }
  if (!u.email) {
    await tandaiGagal(idUser, 'email kosong');
    return { ok: false, id_user: idUser, alasan: 'email kosong' };
  }

  await run(
    `UPDATE t_user_mobile SET wallet_status='pending', wallet_error=NULL,
            wallet_updated_at=now() WHERE id_user=$1`,
    [idUser]
  );

  try {
    const { client } = klien();
    // Nama wajib; pakai nama pelanggan, atau email bila nama kosong.
    const acc = await client.createSubAccount({
      email: u.email,
      name: (u.nama && String(u.nama).trim()) || u.email,
    });
    await run(
      `UPDATE t_user_mobile
          SET id_wallet=$1, wallet_status=$2, wallet_error=NULL, wallet_updated_at=now()
        WHERE id_user=$3`,
      [acc.id, acc.status === 'ACTIVE' ? 'active' : 'pending', idUser]
    );
    return { ok: true, id_user: idUser, id_wallet: acc.id, status: acc.status };
  } catch (e) {
    await tandaiGagal(idUser, e.message);
    return { ok: false, id_user: idUser, alasan: e.message };
  }
}

async function tandaiGagal(idUser, pesan) {
  await run(
    `UPDATE t_user_mobile
        SET wallet_status='failed', wallet_error=$1, wallet_updated_at=now()
      WHERE id_user=$2`,
    [String(pesan).slice(0, 500), idUser]
  ).catch(() => {});
}

/**
 * Buat wallet untuk semua pelanggan yang belum punya.
 * @param {{limit?: number, force?: boolean, dryRun?: boolean, onProgress?: Function}} o
 */
async function backfillUserWallets({ limit = 100, force = false, dryRun = false, onProgress } = {}) {
  const where = force ? '1=1' : "(id_wallet IS NULL OR id_wallet = '')";
  const rows = await query(
    `SELECT id_user, email FROM t_user_mobile
      WHERE deleted_at IS NULL AND ${where}
      ORDER BY id_user LIMIT $1`,
    [limit]
  );

  const hasil = [];
  for (const u of rows) {
    if (dryRun) {
      hasil.push({ id_user: u.id_user, email: u.email, rencana: 'akan dibuat' });
      if (onProgress) onProgress(u, { dryRun: true });
      continue;
    }
    const r = await createUserWallet(u.id_user, { force });
    hasil.push({ id_user: u.id_user, email: u.email, ...r });
    if (onProgress) onProgress(u, r);
  }
  return {
    total: rows.length,
    berhasil: hasil.filter((h) => h.ok || h.rencana).length,
    gagal: hasil.filter((h) => h.ok === false).length,
    hasil,
  };
}

// ------------------------------------------------------------------ cek

/**
 * Buktikan wallet benar-benar bisa dipakai dengan memanggil endpoint saldo.
 * Ini satu-satunya cara memverifikasi tanpa endpoint "get account": sub account
 * baru dibuat berstatus PENDING dan belum tentu langsung bisa ditransfer.
 *
 * Bentuk respons DOKU (Sub Account V1, Get Balances):
 *   { "balance": { "pending": "600000", "available": "1700500" } }
 * Keduanya STRING, dan tidak ada kunci `account` di dalamnya. Membaca
 * `r.account.balance` menghasilkan undefined, dan `r.balance` menghasilkan
 * objek — yang kalau di-Number() menjadi NaN di dashboard.
 */
async function verifyWallet(idWallet) {
  const { client } = klien();
  try {
    const r = await client.getBalance(idWallet);
    const b = r?.balance ?? null;
    const keAngka = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const tersedia = keAngka(b?.available);
    const tertunda = keAngka(b?.pending);
    return {
      ok: true,
      id_wallet: idWallet,
      // `saldo` = dana yang bisa dipakai (available), dipertahankan sebagai
      // angka tunggal karena itu yang ditampilkan dashboard.
      saldo: tersedia,
      saldo_tersedia: tersedia,
      saldo_tertunda: tertunda,
    };
  } catch (e) {
    return { ok: false, id_wallet: idWallet, alasan: e.message, status: e.status };
  }
}

/** Status ringkas wallet pusat + pelanggan, untuk laporan commissioning. */
async function ringkasan(isProd) {
  const pusat = await getCentralWalletId(isProd);
  const u = await query(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE id_wallet <> '')::int AS punya_wallet,
       count(*) FILTER (WHERE id_wallet = '' OR id_wallet IS NULL)::int AS belum,
       count(*) FILTER (WHERE wallet_status='failed')::int AS gagal
     FROM t_user_mobile WHERE deleted_at IS NULL`
  );
  return { wallet_pusat: pusat, pelanggan: u[0] };
}

module.exports = {
  getCentralWalletId,
  setCentralWalletId,
  createCentralWallet,
  createUserWallet,
  backfillUserWallets,
  verifyWallet,
  ringkasan,
  kunciSetting,
};
