'use strict';

/**
 * Adapter Xendit — Virtual Account (fixed/closed) + QRIS (QR Code).
 *
 * Auth      : Basic auth — `XENDIT_API_KEY` sebagai username, password kosong.
 *             (`Basic base64(api_key:)`). Xendit TIDAK punya "secret key" kedua.
 * Secret    : dibaca dari .env (XENDIT_API_KEY, opsional XENDIT_FOR_USER_ID).
 * Base URL  : XENDIT_URL_API (default https://api.xendit.co).
 *
 * PENTING — format external_id / reference_id:
 *   Nilai yang dikirim WAJIB memakai format invoice kita
 *   `no_trans-id_user-jenis[-idwallet]` (contoh `1794210694330-8-topup`),
 *   supaya callback `/xendit/callback` bisa memecahnya menjadi no_trans,
 *   id_user, dan jenis_trans. Ini sama dengan konvensi DOKU yang sudah ada.
 *
 * Response: dikembalikan MENTAH (persis JSON Xendit), konsisten dengan cara
 * doku.js mengembalikan respons DOKU. Pemanggil yang menyimpan/menampilkan.
 */

const crypto = require('crypto');
require('dotenv').config({ path: './.env' });

function apiKey() {
  const k = (process.env.XENDIT_API_KEY || '').trim();
  if (!k) throw new Error('XENDIT_API_KEY belum diisi di .env');
  return k;
}

function baseUrl() {
  return (process.env.XENDIT_URL_API || 'https://api.xendit.co').replace(/\/+$/, '');
}

/** URL callback Xendit (dipakai sebagai callback_url di body QRIS). */
function callbackUrl() {
  return (process.env.XENDIT_CALLBACK_URL || 'https://energy.edifly-si.com/spklu/api/xendit/callback').replace(/\/+$/, '');
}

function authHeader() {
  return 'Basic ' + Buffer.from(apiKey() + ':').toString('base64');
}

/** Header untuk request. for-user-id (xenPlatform) hanya bila diisi. */
function requestHeaders({ withBody = true } = {}) {
  const h = { Authorization: authHeader() };
  if (withBody) h['Content-Type'] = 'application/json';
  const forUserId = (process.env.XENDIT_FOR_USER_ID || '').trim();
  if (forUserId) h['for-user-id'] = forUserId;
  return h;
}

/**
 * POST ke Xendit. Melempar Error dengan .status/.body bila gagal, supaya
 * pemanggil bisa membedakan validasi (4xx) dari auth (401) dari error server.
 */
async function post(target, body) {
  const url = baseUrl() + target;
  const res = await fetch(url, {
    method: 'POST',
    headers: requestHeaders({ withBody: true }),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // respons non-JSON (jarang) — tetap disertakan sebagai teks
  }
  if (!res.ok) {
    const err = new Error(
      `Xendit ${target} -> HTTP ${res.status}: ${text.slice(0, 200)}`
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/**
 * Buat Fixed Virtual Account (closed amount).
 *
 * @param {object} p
 * @param {string} p.externalId  Format invoice: `no_trans-id_user-jenis[-idwallet]`
 * @param {string} p.bankCode    Kode bank Xendit (mis. BNI, BRI, MANDIRI, BCA, PERMATA, BJB, BSI, CIMB, ...)
 * @param {string} p.name        Nama penerima VA
 * @param {number} p.amount      Nominal (IDR)
 * @param {boolean} [p.isClosed] true = VA tertutup dengan nominal pasti (default)
 */
async function createVa({ externalId, bankCode, name, amount, isClosed = true }) {
  if (!externalId) throw new Error('externalId wajib diisi');
  if (!bankCode) throw new Error('bankCode wajib diisi (mis. BNI/BRI/MANDIRI/BCA)');
  if (!name) throw new Error('name wajib diisi');
  if (amount == null || Number(amount) <= 0) throw new Error('amount harus > 0');

  return post('/callback_virtual_accounts', {
    external_id: externalId,
    bank_code: bankCode,
    name,
    expected_amount: Number(amount),
    is_closed: isClosed,
  });
}

/**
 * Buat QRIS (QR Code).
 *
 * @param {object} p
 * @param {string} p.referenceId  Format invoice: `no_trans-id_user-jenis[-idwallet]`
 * @param {number} p.amount       Nominal (IDR)
 * @param {string} [p.type]       DYNAMIC (default) | STATIC
 * @param {string} [p.currency]   IDR (default)
 */
async function createQris({ referenceId, amount, type = 'DYNAMIC', currency = 'IDR' }) {
  if (!referenceId) throw new Error('referenceId wajib diisi');
  if (amount == null || Number(amount) <= 0) throw new Error('amount harus > 0');

  // Endpoint /qr_codes Xendit (API QR Code) mewajibkan external_id (sebagai
  // kunci idempotensi) dan callback_url. reference_id tetap dikirim sebagai
  // penanda bisnis; keduanya kita isi nilai yang sama = format invoice kita,
  // supaya callback (payload qr.payment -> data.qr_code.external_id) bisa
  // dipecah menjadi no_trans-id_user-jenis oleh /xendit/callback.
  return post('/qr_codes', {
    reference_id: referenceId,
    type,
    currency,
    amount: Number(amount),
    external_id: referenceId,
    callback_url: callbackUrl(),
  });
}

/**
 * Cek kredensial tanpa efek samping: panggil GET /balance (read-only).
 * Mengembalikan { ok, saldo, error }.
 */
async function verify() {
  try {
    const res = await fetch(baseUrl() + '/balance', {
      headers: requestHeaders({ withBody: false }),
    });
    const text = await res.text();
    if (res.status === 401) return { ok: false, error: 'auth ditolak (401)' };
    return { ok: res.ok, saldo: safeJson(text)?.balance ?? null, error: res.ok ? null : text.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

module.exports = {
  createVa,
  createQris,
  verify,
  apiKey,
  baseUrl,
  callbackUrl,
  authHeader,
};
