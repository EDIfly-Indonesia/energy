'use strict';

/**
 * Service konfigurasi payment gateway (t_payment_gateway).
 *
 * Prinsip keamanan (kesepakatan):
 *  - Config NON-RAHASIA (endpoint, callback, client_id, flags, dsb) disimpan di DB.
 *  - SECRET (secret key / api key / private key) TIDAK disimpan di DB — tetap di .env.
 *    Service ini HANYA memeriksa "apakah secret terisi di .env" (boolean + nama kunci),
 *    tidak pernah mengembalikan nilainya.
 */

const db = require('./database.service');
const { query, run } = db;

const KOLOM = `id_payment_gateway, kode_provider, nama_provider, client_id, is_prod, aktif,
  url_api, url_callback, endpoint_va, endpoint_qris, expired_menit, metadata, keterangan,
  created_at, updated_at, updated_by`;

// Nama variabel .env yang menyimpan secret per provider (nilai TIDAK pernah dibaca di sini).
const ENV_CREDENTIAL = {
  doku: ['CLIENT_ID_DOKU', 'SECRET_KEY_DOKU', 'API_KEY_DOKU'],
  xendit: ['XENDIT_API_KEY', 'XENDIT_CALLBACK_TOKEN'],
};

/** Nama kunci .env yang wajib terisi untuk provider tertentu. */
function credentialEnvKeys(kode) {
  const k = String(kode || '').toLowerCase();
  if (ENV_CREDENTIAL[k]) return ENV_CREDENTIAL[k];
  const up = String(kode || '').toUpperCase();
  return [`${up}_API_KEY`, `${up}_SECRET_KEY`];
}

/** Cek status secret di .env tanpa membocorkan nilainya. */
function credentialStatus(kode) {
  const kunci = credentialEnvKeys(kode);
  const status = kunci.map((nama) => ({ nama, terisi: !!(process.env[nama] && String(process.env[nama]).trim()) }));
  return { kunci, status, lengkap: status.every((s) => s.terisi) };
}

function denganCredential(row) {
  return { ...row, credential: credentialStatus(row.kode_provider) };
}

async function list() {
  const rows = await query(`SELECT ${KOLOM} FROM t_payment_gateway ORDER BY id_payment_gateway`);
  return rows.map(denganCredential);
}

async function get(id) {
  const rows = await query(`SELECT ${KOLOM} FROM t_payment_gateway WHERE id_payment_gateway = $1`, [id]);
  return rows[0] ? denganCredential(rows[0]) : null;
}

async function getByKode(kode) {
  const rows = await query(`SELECT ${KOLOM} FROM t_payment_gateway WHERE kode_provider = $1`, [kode]);
  return rows[0] ? denganCredential(rows[0]) : null;
}

/** Gateway yang sedang aktif (satu per sistem). */
async function aktif() {
  const rows = await query(`SELECT ${KOLOM} FROM t_payment_gateway WHERE aktif = true ORDER BY id_payment_gateway LIMIT 1`);
  return rows[0] ? denganCredential(rows[0]) : null;
}

async function create(data, updatedBy) {
  const r = await run(
    `INSERT INTO t_payment_gateway
       (kode_provider, nama_provider, client_id, is_prod, aktif, url_api, url_callback,
        endpoint_va, endpoint_qris, expired_menit, metadata, keterangan, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING ${KOLOM}`,
    [
      data.kode_provider, data.nama_provider, data.client_id ?? null,
      data.is_prod === true, data.aktif === true, data.url_api ?? null,
      data.url_callback ?? null, data.endpoint_va ?? null, data.endpoint_qris ?? null,
      Number.isInteger(data.expired_menit) ? data.expired_menit : 20,
      data.metadata ?? null, data.keterangan ?? null, updatedBy ?? null,
    ]
  );
  return r.rows[0] ? denganCredential(r.rows[0]) : null;
}

async function update(id, data, updatedBy) {
  const r = await run(
    `UPDATE t_payment_gateway SET
       kode_provider = $2, nama_provider = $3, client_id = $4, is_prod = $5,
       aktif = $6, url_api = $7, url_callback = $8, endpoint_va = $9,
       endpoint_qris = $10, expired_menit = $11, metadata = $12, keterangan = $13,
       updated_at = now(), updated_by = $14
     WHERE id_payment_gateway = $1
     RETURNING ${KOLOM}`,
    [
      id,
      data.kode_provider, data.nama_provider, data.client_id ?? null,
      data.is_prod === true, data.aktif === true, data.url_api ?? null,
      data.url_callback ?? null, data.endpoint_va ?? null, data.endpoint_qris ?? null,
      Number.isInteger(data.expired_menit) ? data.expired_menit : 20,
      data.metadata ?? null, data.keterangan ?? null, updatedBy ?? null,
    ]
  );
  return r.rows[0] ? denganCredential(r.rows[0]) : null;
}

/** Aktifkan satu gateway, nonaktifkan semua yang lain (atomik). */
async function aktifkan(id, updatedBy) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE t_payment_gateway SET aktif = false WHERE aktif = true');
    const r = await client.query(
      `UPDATE t_payment_gateway SET aktif = true, updated_at = now(), updated_by = $2
       WHERE id_payment_gateway = $1 RETURNING ${KOLOM}`,
      [id, updatedBy ?? null]
    );
    await client.query('COMMIT');
    return r.rows[0] ? denganCredential(r.rows[0]) : null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function remove(id) {
  const r = await run('DELETE FROM t_payment_gateway WHERE id_payment_gateway = $1 RETURNING id_payment_gateway', [id]);
  return r.rowCount > 0;
}

module.exports = { list, get, getByKode, aktif, create, update, aktifkan, remove, credentialEnvKeys, credentialStatus };
