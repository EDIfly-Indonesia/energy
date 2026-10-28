'use strict';

/**
 * Portal mitra (hotel / asuransi) — API-PROMO.md §8.
 *
 * Portal dipakai front office hotel / petugas asuransi untuk mendaftarkan
 * email/no_hp pelanggan yang berhak memakai kode promo.
 *
 * ATURAN KERAS: setiap query difilter dengan id_mitra_promo dari TOKEN
 * (request.portal.id_mitra_promo), bukan dari parameter request. Promo milik
 * mitra lain harus menghasilkan 404 (bukan 403) agar keberadaannya tidak bocor.
 */

const crypto = require('crypto');
const db = require('../services/database.service');
const { query } = db;
const { signPortal } = require('../middleware/portal-auth');

function gagal(reply, message, code) {
  if (code) reply.code(code);
  return reply.send({ success: false, message, data: null });
}

function ok(reply, message, data) {
  return reply.send({ success: true, message, data });
}

function angka(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function tanggalValid(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** sha256 hex — dipakai untuk password dan API key (tanpa salt tambahan). */
function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/**
 * Verifikasi password dengan perbandingan waktu-konstan.
 * Format yang didukung: sha256 hex biasa.
 */
function cocokPassword(plain, hash) {
  const a = Buffer.from(sha256(plain), 'utf8');
  const b = Buffer.from(String(hash || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ================================================================== LOGIN

async function login(request, reply) {
  const b = request.body || {};
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');

  if (!email || !password) {
    return gagal(reply, 'Email dan password wajib diisi', 400);
  }

  try {
    const rows = await query(
      `SELECT pu.id_portal_user, pu.id_mitra_promo, pu.email, pu.nama, pu.role,
              pu.password_hash, pu.aktif,
              m.nama AS nama_mitra, m.jenis_mitra, m.aktif AS mitra_aktif
         FROM t_portal_user pu
         JOIN t_promo_mitra m ON m.id_mitra_promo = pu.id_mitra_promo
        WHERE lower(pu.email) = $1
        LIMIT 1`,
      [email]
    );

    // Pesan seragam: jangan bocorkan mana yang salah.
    if (!rows.length) return gagal(reply, 'Email atau password salah', 401);

    const u = rows[0];
    if (!u.aktif) return gagal(reply, 'Akun portal tidak aktif', 403);
    if (!u.mitra_aktif) return gagal(reply, 'Mitra tidak aktif', 403);
    if (!cocokPassword(password, u.password_hash)) {
      return gagal(reply, 'Email atau password salah', 401);
    }

    await query(`UPDATE t_portal_user SET last_login = now() WHERE id_portal_user = $1`, [u.id_portal_user]);

    const token = signPortal({
      id_portal_user: u.id_portal_user,
      id_mitra_promo: u.id_mitra_promo,
      email: u.email,
      role: u.role,
    });

    return ok(reply, 'Berhasil', {
      token,
      id_mitra_promo: u.id_mitra_promo,
      nama_mitra: u.nama_mitra,
      jenis_mitra: u.jenis_mitra,
      role: u.role,
    });
  } catch (err) {
    console.error('[portal.login]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// =================================================================== PROMO

async function listPromo(request, reply) {
  const idMitra = request.portal.id_mitra_promo;

  try {
    const rows = await query(
      `SELECT p.id_promo, p.kode_promo, p.nama, p.deskripsi,
              p.tipe_potongan, p.nilai_potongan,
              to_char(p.tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(p.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
              p.aktif,
              (SELECT count(*)::int FROM t_promo_peserta ps
                WHERE ps.id_promo = p.id_promo AND ps.status = 'active') AS jumlah_peserta,
              (SELECT count(*)::int FROM t_promo_pemakaian pk
                WHERE pk.id_promo = p.id_promo AND pk.status = 'aktif')  AS jumlah_pemakaian
         FROM t_promo p
        WHERE p.id_mitra_promo = $1
        ORDER BY p.id_promo DESC`,
      [idMitra]
    );
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[portal.listPromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

/**
 * Pastikan promo milik mitra ini. Mengembalikan row promo atau null.
 * Dipakai semua endpoint peserta supaya guard-nya satu tempat.
 */
async function promoMilikMitra(idPromo, idMitra) {
  const rows = await query(
    `SELECT id_promo, tanggal_mulai, tanggal_selesai
       FROM t_promo WHERE id_promo = $1 AND id_mitra_promo = $2`,
    [idPromo, idMitra]
  );
  return rows[0] || null;
}

async function listPeserta(request, reply) {
  const idPromo = angka(request.params && request.params.id);
  if (!idPromo) return gagal(reply, 'ID promo tidak valid', 400);

  try {
    const promo = await promoMilikMitra(idPromo, request.portal.id_mitra_promo);
    // 404, bukan 403: jangan bocorkan keberadaan promo mitra lain.
    if (!promo) return gagal(reply, 'Promo tidak ditemukan', 404);

    const rows = await query(
      `SELECT id_peserta, email, no_hp, status, catatan, created_at,
              to_char(tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai
         FROM t_promo_peserta
        WHERE id_promo = $1
        ORDER BY id_peserta DESC
        LIMIT 500`,
      [idPromo]
    );
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[portal.listPeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

/**
 * Tambah peserta — tunggal atau massal (front office hotel butuh input cepat).
 *
 * Body tunggal : { email, no_hp, catatan }
 * Body massal  : { peserta: [ { email, no_hp }, ... ] }
 */
async function createPeserta(request, reply) {
  const idPromo = angka(request.params && request.params.id);
  if (!idPromo) return gagal(reply, 'ID promo tidak valid', 400);

  const b = request.body || {};
  const daftar = Array.isArray(b.peserta)
    ? b.peserta
    : [{ email: b.email, no_hp: b.no_hp, catatan: b.catatan }];

  if (!daftar.length) return gagal(reply, 'Tidak ada peserta untuk ditambahkan', 400);
  if (daftar.length > 200) return gagal(reply, 'Maksimal 200 peserta per permintaan', 400);

  try {
    const promo = await promoMilikMitra(idPromo, request.portal.id_mitra_promo);
    if (!promo) return gagal(reply, 'Promo tidak ditemukan', 404);

    const berhasil = [];
    const gagalBaris = [];

    for (const item of daftar) {
      const email = item && item.email ? String(item.email).trim().toLowerCase() : null;
      const noHp = item && item.no_hp ? String(item.no_hp).trim() : null;

      if (!email && !noHp) {
        gagalBaris.push({ email: item && item.email, alasan: 'EMAIL_ATAU_HP_KOSONG' });
        continue;
      }

      try {
        // Isi id_user bila akun mobile sudah ada; kalau belum, tetap didaftarkan
        // (validasi promo mencocokkan email/no_hp saat pengguna memakainya).
        let idUser = null;
        const u = await query(
          `SELECT id_user FROM t_user_mobile
            WHERE (lower(email) = $1 AND $1 IS NOT NULL)
               OR (no_hp = $2 AND $2 IS NOT NULL)
            LIMIT 1`,
          [email, noHp]
        );
        if (u.length) idUser = u[0].id_user;

        const res = await query(
          `INSERT INTO t_promo_peserta
             (id_promo, id_user, email, no_hp, status, tanggal_mulai,
              tanggal_selesai, id_portal_user, catatan)
           VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8)
           RETURNING id_peserta`,
          [idPromo, idUser, email, noHp,
           promo.tanggal_mulai, promo.tanggal_selesai,
           request.portal.id_portal_user,
           item.catatan ? String(item.catatan).trim() : null]
        );
        berhasil.push({ id_peserta: res[0].id_peserta, email, no_hp: noHp });
      } catch (e) {
        if (e.code === '23505') {
          gagalBaris.push({ email, no_hp: noHp, alasan: 'SUDAH_TERDAFTAR' });
        } else {
          console.error('[portal.createPeserta.item]', e.message);
          gagalBaris.push({ email, no_hp: noHp, alasan: 'GAGAL_SIMPAN' });
        }
      }
    }

    const pesan = gagalBaris.length
      ? `${berhasil.length} dari ${daftar.length} peserta ditambahkan`
      : `${berhasil.length} peserta ditambahkan`;

    return ok(reply, pesan, { berhasil, gagal: gagalBaris });
  } catch (err) {
    console.error('[portal.createPeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deletePeserta(request, reply) {
  const idPeserta = angka(request.params && request.params.id);
  if (!idPeserta) return gagal(reply, 'ID peserta tidak valid', 400);

  try {
    // Filter lewat join ke t_promo: peserta hanya boleh dihapus bila promonya
    // milik mitra ini.
    const res = await db.run(
      `DELETE FROM t_promo_peserta ps
        USING t_promo p
        WHERE ps.id_peserta = $1
          AND p.id_promo = ps.id_promo
          AND p.id_mitra_promo = $2`,
      [idPeserta, request.portal.id_mitra_promo]
    );
    if (res.rowCount === 0) return gagal(reply, 'Peserta tidak ditemukan', 404);
    return ok(reply, 'Peserta dihapus', { id_peserta: idPeserta });
  } catch (err) {
    console.error('[portal.deletePeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

module.exports = { login, listPromo, listPeserta, createPeserta, deletePeserta, sha256 };
