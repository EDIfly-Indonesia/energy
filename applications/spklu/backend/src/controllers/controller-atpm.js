'use strict';

/**
 * Endpoint ATPM (machine-to-machine) — API-PROMO.md §9.
 *
 * ATPM mengirim { email, kode_promo } dan sistem mencatat:
 *   1. klaim merek kendaraan di t_user_kendaraan
 *   2. keanggotaan promo di t_promo_peserta
 * Keduanya dibutuhkan karena validasi ATPM mewajibkan DUA syarat sekaligus
 * (peserta + merek kendaraan).
 *
 * Autentikasi: header X-Api-Key, satu key per mitra (hash sha256 di
 * t_promo_mitra.api_key_hash).
 */

const crypto = require('crypto');
const db = require('../services/database.service');
const { query } = db;

function gagal(reply, message, code) {
  if (code) reply.code(code);
  return reply.send({ success: false, message, data: null });
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/**
 * Middleware: validasi X-Api-Key dan tempelkan request.atpm = { id_mitra_promo }.
 * Juga memperbarui api_key_last_used supaya key mati bisa dideteksi.
 */
async function atpmAuth(request, reply) {
  const key = request.headers['x-api-key'];
  if (!key) return gagal(reply, 'API key tidak valid', 401);

  const hash = sha256(String(key).trim());

  try {
    const rows = await query(
      `SELECT id_mitra_promo, nama, aktif
         FROM t_promo_mitra
        WHERE api_key_hash = $1
        LIMIT 1`,
      [hash]
    );
    if (!rows.length) return gagal(reply, 'API key tidak valid', 401);
    if (!rows[0].aktif) return gagal(reply, 'Mitra tidak aktif', 403);

    request.atpm = { id_mitra_promo: rows[0].id_mitra_promo, nama: rows[0].nama };

    // Catat pemakaian terakhir; kegagalan di sini tidak boleh menolak request.
    query(
      `UPDATE t_promo_mitra SET api_key_last_used = now() WHERE id_mitra_promo = $1`,
      [rows[0].id_mitra_promo]
    ).catch((e) => console.error('[atpmAuth.lastUsed]', e.message));
  } catch (err) {
    console.error('[atpmAuth]', err);
    return gagal(reply, 'Terjadi kesalahan', 500);
  }
}

/**
 * POST /atpm/kendaraan — body { email, kode_promo }
 *
 * Memakai fn_kendaraan_daftar() yang sudah menangani idempotensi dan validasi
 * (kode bukan milik ATPM, email tidak terdaftar, dll).
 */
async function daftarKendaraan(request, reply) {
  const b = request.body || {};
  const email = String(b.email ?? '').trim();
  const kode = String(b.kode_promo ?? '').trim();

  if (!email) return gagal(reply, 'Email wajib diisi', 400);
  if (!kode) return gagal(reply, 'Kode promo wajib diisi', 400);

  try {
    // Pastikan kode promo memang milik ATPM yang memanggil. Tanpa cek ini,
    // ATPM A bisa mendaftarkan kendaraannya ke promo ATPM B.
    const milik = await query(
      `SELECT 1 FROM t_promo p
        WHERE p.kode_promo = $1 AND p.id_mitra_promo = $2
        LIMIT 1`,
      [kode.toUpperCase(), request.atpm.id_mitra_promo]
    );
    if (!milik.length) {
      return gagal(reply, 'Kode promo bukan milik ATPM ini', 403);
    }

    const rows = await query(
      `SELECT ok, status, id_user, id_mitra_promo, id_peserta
         FROM fn_kendaraan_daftar($1, $2, 'atpm_endpoint')`,
      [email, kode]
    );
    const r = rows[0] || {};

    const pesan = {
      TERDAFTAR: 'Terdaftar',
      EMAIL_KOSONG: 'Email kosong',
      KODE_KOSONG: 'Kode promo kosong',
      KODE_TIDAK_DITEMUKAN: 'Kode promo tidak ditemukan',
      BUKAN_PROMO_ATPM: 'Kode promo bukan milik ATPM',
      USER_TIDAK_DITEMUKAN: 'Email belum terdaftar sebagai pengguna EZ Charge',
    }[r.status] || 'Selesai';

    if (r.status === 'KODE_TIDAK_DITEMUKAN') return gagal(reply, pesan, 404);
    if (r.status === 'BUKAN_PROMO_ATPM') return gagal(reply, pesan, 403);
    if (r.status !== 'TERDAFTAR') return gagal(reply, pesan, 400);

    return reply.send({
      success: true,
      message: pesan,
      data: {
        ok: r.ok === true,
        status: r.status,
        id_user: r.id_user,
        id_mitra_promo: r.id_mitra_promo,
        id_peserta: r.id_peserta,
      },
    });
  } catch (err) {
    console.error('[atpm.daftarKendaraan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

module.exports = { atpmAuth, daftarKendaraan };
