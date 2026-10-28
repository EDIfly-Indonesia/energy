'use strict';

/**
 * Admin: pengelolaan wallet DOKU (WaaS sub account).
 *
 * Wallet pusat disimpan di t_setting.admin_wallet (produksi) /
 * admin_wallet_sandbox (sandbox). Wallet pelanggan di t_user_mobile.id_wallet.
 *
 * Semua endpoint butuh kredensial DOKU di .env. Bila belum diisi, endpoint
 * mengembalikan pesan yang jelas alih-alih error 500 yang misterius.
 */

const db = require('../services/database.service');
const { query } = db;
const wp = require('../services/wallet-provision');

function gagal(reply, message, data = null) {
  return reply.send({ success: false, message, data });
}

/** true bila request datang dari mode produksi (IS_PROD=1). */
function isProd() {
  return String(process.env.IS_PROD) === '1';
}

async function status(request, reply) {
  const prod = isProd();
  try {
    const r = await wp.ringkasan(prod);
    let verifikasi = null;
    if (r.wallet_pusat) {
      verifikasi = await wp.verifyWallet(r.wallet_pusat).catch((e) => ({ ok: false, alasan: e.message }));
    }

    // Daftar pelanggan yang belum punya wallet (maks 50), supaya admin tahu
    // siapa yang perlu di-backfill tanpa membuka SQL.
    const belum = await query(
      `SELECT id_user, email, nama, wallet_status, wallet_error
         FROM t_user_mobile
        WHERE deleted_at IS NULL AND (id_wallet IS NULL OR id_wallet = '')
        ORDER BY id_user LIMIT 50`
    );

    const gagalRows = await query(
      `SELECT id_user, email, wallet_status, wallet_error
         FROM t_user_mobile
        WHERE deleted_at IS NULL AND wallet_status = 'failed'
        ORDER BY id_user LIMIT 50`
    );

    return reply.send({
      success: true,
      message: 'Berhasil',
      data: {
        mode: prod ? 'produksi' : 'sandbox',
        nama_setting: wp.kunciSetting(prod),
        wallet_pusat: r.wallet_pusat,
        wallet_pusat_verifikasi: verifikasi,
        pelanggan: r.pelanggan,
        belum_punya_wallet: belum,
        gagal: gagalRows,
      },
    });
  } catch (err) {
    console.error('[admin.walletStatus]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createCentral(request, reply) {
  const b = request.body || {};
  if (!b.name || !b.email) return gagal(reply, 'name dan email wajib diisi');

  try {
    const r = await wp.createCentralWallet({
      name: b.name,
      email: b.email,
      isProd: isProd(),
      force: b.force === true,
    });
    if (r.dilewati) {
      return reply.send({
        success: true,
        message: 'Wallet pusat sudah terisi, tidak ada sub account baru yang dibuat',
        data: r,
      });
    }
    return reply.send({
      success: true,
      message: `Wallet pusat dibuat (${r.id_wallet}) dengan status ${r.status}`,
      data: r,
    });
  } catch (err) {
    console.error('[admin.createCentralWallet]', err);
    // Pesan konfigurasi dari doku-waas sudah menyebut variabel yang kurang,
    // jadi diteruskan apa adanya. Nilainya tidak pernah ikut tercetak.
    return gagal(reply, err.konfigurasi ? err.message : err.message || 'Gagal membuat wallet pusat');
  }
}

async function setCentral(request, reply) {
  const b = request.body || {};
  const id = String(b.id_wallet ?? '').trim();
  if (!/^SAC-/.test(id)) return gagal(reply, 'ID wallet harus berformat SAC-...');

  try {
    const r = await wp.setCentralWalletId(id, isProd());
    const v = await wp.verifyWallet(id).catch((e) => ({ ok: false, alasan: e.message }));
    return reply.send({
      success: true,
      message: v.ok ? 'Wallet pusat disimpan dan terverifikasi' : 'Wallet pusat disimpan (belum terverifikasi)',
      data: { ...r, verifikasi: v },
    });
  } catch (err) {
    console.error('[admin.setCentralWallet]', err);
    return gagal(reply, err.message || 'Gagal menyimpan wallet pusat');
  }
}

async function backfill(request, reply) {
  const b = request.body || {};
  const limit = Number.isInteger(b.limit) && b.limit > 0 ? Math.min(b.limit, 500) : 100;

  try {
    const r = await wp.backfillUserWallets({
      limit,
      force: b.force === true,
      dryRun: b.dry_run === true,
    });

    // Sertakan alasan kegagalan pertama supaya admin tahu penyebabnya
    // (biasanya kredensial DOKU belum diisi) alih-alih hanya "0 berhasil".
    const alasanPertama = r.hasil.find((h) => h.ok === false)?.alasan;
    let pesan = b.dry_run
      ? `${r.total} pelanggan akan dibuatkan wallet`
      : `${r.berhasil} berhasil, ${r.gagal} gagal dari ${r.total} pelanggan`;
    if (alasanPertama) pesan += ` — ${alasanPertama}`;

    return reply.send({
      success: r.gagal === 0,
      message: pesan,
      data: r,
    });
  } catch (err) {
    console.error('[admin.backfillWallet]', err);
    return gagal(reply, err.konfigurasi ? err.message : 'Gagal membuat wallet');
  }
}

async function createForUser(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID pelanggan tidak valid');

  try {
    const r = await wp.createUserWallet(id, { force: request.body?.force === true });
    if (!r.ok) return gagal(reply, r.alasan || 'Gagal membuat wallet', r);
    return reply.send({
      success: true,
      message: r.dilewati
        ? `Pelanggan sudah punya wallet (${r.id_wallet})`
        : `Wallet dibuat (${r.id_wallet})`,
      data: r,
    });
  } catch (err) {
    console.error('[admin.createUserWallet]', err);
    return gagal(reply, err.konfigurasi ? err.message : 'Gagal membuat wallet');
  }
}

module.exports = { status, createCentral, setCentral, backfill, createForUser };
