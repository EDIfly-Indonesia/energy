'use strict';

/**
 * Helper bersama untuk suite test promo.
 *
 * ATURAN KESELAMATAN:
 *   - Semua data uji memakai prefix TEST_ agar mudah dibersihkan.
 *   - setiap suite wajib memanggil cleanup() di before/after.
 *   - Tidak pernah menyentuh data produksi: penghapusan difilter prefix.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const db = require(path.join(ROOT, 'src/services/database.service'));
const { query, run } = db;

const API = process.env.TEST_API_URL || 'http://127.0.0.1:8080';
const PREFIX = 'TEST_';

/** Kode promo uji selalu diawali prefix ini. */
const kode = (suffix) => `${PREFIX}${suffix}`.toUpperCase();

// ------------------------------------------------------------------ AUTH

async function adminToken() {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const svg = Buffer.from(c.data.image.split(',')[1], 'base64').toString('utf8');
  const chars = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]);
  const login = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.TEST_ADMIN_USER || 'admin',
      password: process.env.TEST_ADMIN_PASS || 'Pltsapp2026**',
      captcha_id: c.data.id,
      captcha: chars.join(''),
    }),
  }).then((r) => r.json());

  if (!login.token) throw new Error('Gagal login admin: ' + JSON.stringify(login));
  return login.token;
}

function mobileToken() {
  const jwt = require(path.join(ROOT, 'node_modules/jsonwebtoken'));
  const crypto = require('crypto');
  require(path.join(ROOT, 'node_modules/dotenv')).config({ path: path.join(ROOT, '.env') });

  const email = process.env.TEST_USER_EMAIL || 'ariefsumaila@gmail.com';
  const data = { id_user: 8, email, nama: 'Test' };
  const key = crypto.createHmac('sha256', process.env.PENGACAK).update(email).digest('hex');
  return jwt.sign({ data, key }, process.env.SECRET_KEY, { expiresIn: '30m' });
}

// ------------------------------------------------------------------ HTTP

function makeClient(token) {
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const call = async (method, url, body, extraHeaders = {}) => {
    const headers = { ...auth, ...extraHeaders };
    const opts = { method, headers };

    // DELETE tanpa body: jangan pasang Content-Type, Fastify menolaknya.
    if (body !== undefined && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const r = await fetch(API + url, opts);
    let json = null;
    try { json = await r.json(); } catch { /* respons non-JSON */ }
    return { status: r.status, body: json };
  };

  return {
    get: (u, h) => call('GET', u, undefined, h),
    post: (u, b, h) => call('POST', u, b, h),
    put: (u, b, h) => call('PUT', u, b, h),
    del: (u, h) => call('DELETE', u, undefined, h),
  };
}

// --------------------------------------------------------------- FIXTURE

/**
 * Buat mitra + promo untuk satu test. Mengembalikan { idMitra, idPromo, kodePromo }.
 */
async function buatPromo(opts = {}) {
  const {
    suffix, jenis = 'atpm', tipe = 'per_kwh', nilai = 600,
    budget = 1000000, mulai = '2026-01-01', selesai = '2027-12-31',
    butuhPeserta = false, cekKendaraan = false, kebijakan = 'hangus',
    maksTayang = null,
  } = opts;

  const kodePromo = kode(suffix);
  const kodeMitra = `TM_${suffix}`.toUpperCase().slice(0, 20);

  const m = await query(
    `INSERT INTO t_promo_mitra (jenis_mitra, kode, nama)
     VALUES ($1, $2, $3) RETURNING id_mitra_promo`,
    [jenis, kodeMitra, `Mitra ${suffix}`]
  );
  const idMitra = m[0].id_mitra_promo;

  const p = await query(
    `INSERT INTO t_promo
       (kode_promo, id_mitra_promo, nama, tipe_potongan, nilai_potongan,
        budget_rupiah, tanggal_mulai, tanggal_selesai,
        butuh_peserta, cek_kendaraan, kebijakan_sisa)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id_promo`,
    [kodePromo, idMitra, `Promo ${suffix}`, tipe, nilai, budget, mulai, selesai,
     butuhPeserta, cekKendaraan, kebijakan]
  );
  const idPromo = p[0].id_promo;

  let idIklan = null;
  if (maksTayang !== null) {
    const ik = await query(
      `INSERT INTO t_promo_iklan (id_promo, foto, judul, maks_tayang_per_hari)
       VALUES ($1,$2,$3,$4) RETURNING id_iklan`,
      [idPromo, `test-${suffix}.jpg`, `Iklan ${suffix}`, maksTayang]
    );
    idIklan = ik[0].id_iklan;
  }

  return { idMitra, idPromo, idIklan, kodePromo, kodeMitra };
}

/**
 * Hapus SEMUA data uji. Urutan penting karena foreign key.
 * Difilter ketat: hanya baris dengan prefix TEST_ / TM_.
 */
async function cleanup() {
  const q = [
    `DELETE FROM t_promo_iklan_tayang WHERE id_iklan IN (
       SELECT i.id_iklan FROM t_promo_iklan i
       JOIN t_promo p ON p.id_promo = i.id_promo
       WHERE p.kode_promo LIKE '${PREFIX}%')`,
    `DELETE FROM t_promo_iklan WHERE id_promo IN (
       SELECT id_promo FROM t_promo WHERE kode_promo LIKE '${PREFIX}%')`,
    `DELETE FROM t_promo_pemakaian WHERE id_promo IN (
       SELECT id_promo FROM t_promo WHERE kode_promo LIKE '${PREFIX}%')`,
    `DELETE FROM t_promo_peserta WHERE id_promo IN (
       SELECT id_promo FROM t_promo WHERE kode_promo LIKE '${PREFIX}%')`,
    `DELETE FROM t_promo_rollover WHERE id_promo_asal IN (
       SELECT id_promo FROM t_promo WHERE kode_promo LIKE '${PREFIX}%')`,
    `DELETE FROM t_promo WHERE kode_promo LIKE '${PREFIX}%'`,
    `DELETE FROM t_user_kendaraan WHERE id_mitra_promo IN (
       SELECT id_mitra_promo FROM t_promo_mitra WHERE kode LIKE 'TM_%')`,
    `DELETE FROM t_portal_user WHERE id_mitra_promo IN (
       SELECT id_mitra_promo FROM t_promo_mitra WHERE kode LIKE 'TM_%')`,
    `DELETE FROM t_promo_mitra WHERE kode LIKE 'TM_%'`,
    // transaksi uji (dibuat lewat API order)
    `DELETE FROM t_transaction WHERE kode_promo LIKE '${PREFIX}%'`,
    `DELETE FROM berita WHERE no_trans IN (
       SELECT no_trans::text FROM t_transaction WHERE kode_promo LIKE '${PREFIX}%')`,
  ];

  for (const sql of q) {
    try { await query(sql); } catch (e) { /* abaikan, lanjut bersihkan sisanya */ }
  }
}

/** Hitung baris uji yang tersisa — dipakai test terakhir. */
async function sisaDataUji() {
  const r = await query(
    `SELECT
       (SELECT count(*)::int FROM t_promo WHERE kode_promo LIKE '${PREFIX}%') AS promo,
       (SELECT count(*)::int FROM t_promo_mitra WHERE kode LIKE 'TM_%') AS mitra,
       (SELECT count(*)::int FROM t_transaction WHERE kode_promo LIKE '${PREFIX}%') AS transaksi`
  );
  return r[0];
}

/** Pastikan server hidup sebelum suite dijalankan. */
async function pastikanServerHidup() {
  try {
    const r = await fetch(`${API}/admin/me`, { method: 'GET' });
    // 401 = hidup tapi butuh auth. Itu cukup.
    return r.status === 401 || r.status === 200;
  } catch {
    return false;
  }
}

module.exports = {
  API, PREFIX, ROOT, kode,
  query, run,
  adminToken, mobileToken, makeClient,
  buatPromo, cleanup, sisaDataUji, pastikanServerHidup,
};
