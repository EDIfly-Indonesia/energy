'use strict';

/**
 * DOKU Wallet-as-a-Service (WaaS) — Sub Account v1 client.
 *
 * Endpoint resmi (developers.doku.com/wallet-as-a-service/sub-account/sub-account-v1):
 *   POST /sac-merchant/v1/accounts              buat sub account
 *   POST /sac-merchant/v1/transfers             transfer antar wallet
 *   GET  /sac-merchant/v1/balances/{account_id} saldo wallet
 *   POST /sac-merchant/v1/payouts               tarik ke rekening bank
 *
 * Model wallet di SPKLU:
 *   - Wallet PUSAT  : satu sub account milik merchant, menampung transfer dari
 *                     wallet user (bayar pakai saldo) dan menjadi sumber dana
 *                     untuk refund ke wallet user.
 *   - Wallet USER   : satu sub account per pelanggan, dibuat saat registrasi,
 *                     ID-nya disimpan di t_user_mobile.id_wallet.
 *
 * Signature (HMAC-SHA256, base64) atas komponen:
 *   Client-Id:<id>\nRequest-Id:<id>\nRequest-Timestamp:<iso8601>\n
 *   Request-Target:<path>\nDigest:<base64(sha256(body))>
 * `Digest` hanya disertakan bila ada body (POST). GET tidak memakai Digest.
 */

const crypto = require('crypto');

const SANDBOX_BASE = 'https://api-sandbox.doku.com';
const PRODUCTION_BASE = 'https://api.doku.com';

function sha256Base64(body) {
  return crypto.createHash('sha256').update(body, 'utf8').digest('base64');
}

/**
 * Timestamp ISO-8601 UTC TANPA milidetik, persis seperti contoh di dokumentasi
 * DOKU (`2020-08-11T08:45:42Z`). `Date#toISOString()` menghasilkan
 * `2020-08-11T08:45:42.000Z` — bentuk itu tidak ada di contoh mana pun, jadi
 * jangan dipakai untuk header yang ikut ditandatangani.
 */
function isoTanpaMilidetik(d = new Date()) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * @param {object} o
 * @param {string} o.clientId
 * @param {string} o.secretKey
 * @param {string} o.requestId
 * @param {string} o.timestamp  ISO-8601 UTC, mis. 2026-10-28T09:00:00.000Z
 * @param {string} o.target     path saja, mis. /sac-merchant/v1/accounts
 * @param {string} [o.body]     body mentah (string) untuk POST
 */
function buildSignature({ clientId, secretKey, requestId, timestamp, target, body }) {
  let component = `Client-Id:${clientId}`;
  component += `\nRequest-Id:${requestId}`;
  component += `\nRequest-Timestamp:${timestamp}`;
  component += `\nRequest-Target:${target}`;
  if (body !== undefined && body !== null && body !== '') {
    component += `\nDigest:${sha256Base64(body)}`;
  }
  const hmac = crypto.createHmac('sha256', secretKey).update(component, 'utf8').digest('base64');
  return `HMACSHA256=${hmac}`;
}

/** Konfigurasi dari environment. Tidak pernah mencetak nilainya. */
function configFromEnv(env = process.env) {
  const isProd = String(env.IS_PROD ?? '0') === '1';
  const clientId = isProd ? env.CLIENT_ID_DOKU : env.CLIENT_ID_DOKU_DEV;
  const secretKey = isProd ? env.SECRET_KEY_DOKU : env.SECRET_KEY_DOKU_DEV;
  const baseUrl = (isProd ? env.URL_DOKU : env.URL_DOKU_DEV) || (isProd ? PRODUCTION_BASE : SANDBOX_BASE);

  const hilang = [];
  if (!clientId) hilang.push(isProd ? 'CLIENT_ID_DOKU' : 'CLIENT_ID_DOKU_DEV');
  if (!secretKey) hilang.push(isProd ? 'SECRET_KEY_DOKU' : 'SECRET_KEY_DOKU_DEV');

  return {
    ok: hilang.length === 0,
    hilang,
    isProd,
    clientId,
    secretKey,
    baseUrl: String(baseUrl).replace(/\/+$/, ''),
  };
}

class DokuWaasError extends Error {
  constructor(message, { status, body, target } = {}) {
    super(message);
    this.name = 'DokuWaasError';
    this.status = status;
    this.body = body;
    this.target = target;
  }
}

/** Pesan error yang bisa dibaca manusia dari body DOKU. */
function pesanDari(body) {
  if (!body) return null;
  if (typeof body === 'string') return body.slice(0, 300);
  const kandidat = [
    body.message,
    body.error?.message,
    body.error_message,
    body.error?.description,
    Array.isArray(body.errors) ? body.errors.map((e) => e.message || e).join('; ') : null,
  ].filter(Boolean);
  if (kandidat.length) return String(kandidat[0]).slice(0, 300);
  try {
    return JSON.stringify(body).slice(0, 300);
  } catch {
    return null;
  }
}

/**
 * Terjemahkan kode error DOKU yang paling sering muncul saat commissioning
 * menjadi langkah perbaikan. Tanpa ini, "Invalid Client-Id" terlihat seperti
 * bug kode padahal penyebabnya ada di sisi akun/konfigurasi DOKU.
 */
function petunjukUntuk(kode, target) {
  if (kode === 'invalid_client_id') {
    return (
      'Client-Id tidak dikenali untuk endpoint ini. Periksa: (1) header Client-Id harus berisi ' +
      'BRAND ID (BRN-...), bukan Business ID (BSN-...); (2) produk Sub-Account harus sudah ' +
      'DIAKTIFKAN oleh DOKU (docs: "Contact Sales to activate Sub-Account") — tanpa aktivasi, ' +
      'Client-Id yang valid di endpoint lain tetap ditolak di /sac-merchant/*; ' +
      '(3) pastikan environment cocok: Brand ID sandbox hanya berlaku di api-sandbox.doku.com, ' +
      'Brand ID produksi hanya di api.doku.com.'
    );
  }
  if (kode === 'invalid_signature') {
    return (
      'Signature ditolak. Secret yang dipakai harus SECRET KEY (format SK-...) dari ' +
      'Dashboard > Integrations > API Keys. "API Key" berformat doku_key_... BUKAN secret ' +
      'untuk HMAC dan selalu menghasilkan signature tidak valid.'
    );
  }
  if (kode === 'invalid_header_request') {
    return `Header wajib belum lengkap untuk ${target} (Client-Id, Request-Id, Request-Timestamp, Signature).`;
  }
  return null;
}

function buatClient(cfg, { fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  if (!cfg.ok) {
    const err = new DokuWaasError(
      `Kredensial DOKU belum diisi di .env: ${cfg.hilang.join(', ')}. ` +
      'Tanpa ini tidak ada panggilan API yang bisa dilakukan.'
    );
    err.konfigurasi = true;
    throw err;
  }

  async function request(method, target, bodyObj) {
    const body = bodyObj === undefined ? '' : JSON.stringify(bodyObj);
    // Request-Id harus unik per request. Dipakai juga sebagai kunci idempotensi
    // DOKU, jadi jangan diambil dari data bisnis (bisa bentrok saat retry).
    const requestId = crypto.randomUUID();
    const timestamp = isoTanpaMilidetik();

    const headers = {
      'Client-Id': cfg.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      Signature: buildSignature({
        clientId: cfg.clientId,
        secretKey: cfg.secretKey,
        requestId,
        timestamp,
        target,
        body,
      }),
    };
    if (body) headers['Content-Type'] = 'application/json';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(cfg.baseUrl + target, {
        method,
        headers,
        body: body || undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      const sebab = e.name === 'AbortError' ? `timeout ${timeoutMs}ms` : e.message;
      throw new DokuWaasError(`Gagal menghubungi DOKU (${target}): ${sebab}`, { target });
    }
    clearTimeout(timer);

    const teks = await res.text();
    let json = null;
    try {
      json = teks ? JSON.parse(teks) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const kode = json?.error?.code || null;
      const pesan = pesanDari(json) || teks.slice(0, 200);
      const petunjuk = petunjukUntuk(kode, target);
      throw new DokuWaasError(
        `DOKU menolak ${method} ${target} (HTTP ${res.status}): ${pesan}` +
          (petunjuk ? `\n  → ${petunjuk}` : ''),
        { status: res.status, body: json || teks, target, kode }
      );
    }
    return json;
  }

  return {
    /**
     * Buat sub account. Tipe STANDARD untuk wallet (bukan MERCHANT).
     * Batas panjang mengikuti dokumentasi Sub Account V1:
     *   account.email max 40, account.type max 20, account.name max 100.
     * Divalidasi di sini supaya gagal cepat dengan pesan jelas, bukan setelah
     * satu round-trip ke DOKU.
     * @returns {{id: string, status: string, email: string, name: string, type: string}}
     */
    async createSubAccount({ email, name, type = 'STANDARD' }) {
      if (!email) throw new DokuWaasError('email wajib untuk membuat sub account');
      if (!name) throw new DokuWaasError('name wajib untuk membuat sub account');

      const e = String(email).trim();
      const n = String(name).trim();
      const t = String(type).trim();

      if (e.length > 40) {
        throw new DokuWaasError(`email terlalu panjang (${e.length} karakter, maksimal 40 sesuai DOKU)`);
      }
      if (n.length > 100) {
        throw new DokuWaasError(`name terlalu panjang (${n.length} karakter, maksimal 100 sesuai DOKU)`);
      }
      if (t.length > 20) {
        throw new DokuWaasError(`type terlalu panjang (${t.length} karakter, maksimal 20 sesuai DOKU)`);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        throw new DokuWaasError(`email tidak valid: ${e}`);
      }

      const json = await request('POST', '/sac-merchant/v1/accounts', {
        account: { email: e, type: t, name: n },
      });
      const acc = json && json.account;
      if (!acc || !acc.id) {
        throw new DokuWaasError(
          'Respons DOKU tidak memuat account.id: ' + JSON.stringify(json).slice(0, 200)
        );
      }
      return acc;
    },

    /** Saldo wallet. */
    async getBalance(accountId) {
      if (!accountId) throw new DokuWaasError('accountId wajib untuk cek saldo');
      return request('GET', `/sac-merchant/v1/balances/${encodeURIComponent(accountId)}`);
    },

    /**
     * Transfer antar wallet.
     * @param {object} o
     * @param {string} o.origin       wallet asal
     * @param {string} o.destination  wallet tujuan
     * @param {number|string} o.amount
     * @param {string} o.invoiceNumber
     */
    async transfer({ origin, destination, amount, invoiceNumber }) {
      if (!origin || !destination) throw new DokuWaasError('origin dan destination wajib diisi');
      const nilai = Number(amount);
      if (!Number.isFinite(nilai) || nilai <= 0) {
        throw new DokuWaasError(`amount tidak valid: ${amount}`);
      }
      return request('POST', '/sac-merchant/v1/transfers', {
        transfer: {
          origin,
          destination,
          amount: nilai,
          invoice_number: invoiceNumber,
        },
      });
    },

    /** Payout ke rekening bank (penarikan). */
    async payout({ accountId, amount, invoiceNumber, bankCode, bankAccountNumber, bankAccountName }) {
      const nilai = Number(amount);
      if (!Number.isFinite(nilai) || nilai <= 0) {
        throw new DokuWaasError(`amount tidak valid: ${amount}`);
      }
      return request('POST', '/sac-merchant/v1/payouts', {
        account: { id: accountId },
        payout: { amount: nilai, invoice_number: invoiceNumber },
        beneficiary: {
          bank_code: bankCode,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
        },
      });
    },
  };
}

module.exports = {
  buildSignature,
  sha256Base64,
  isoTanpaMilidetik,
  configFromEnv,
  buatClient,
  DokuWaasError,
  SANDBOX_BASE,
  PRODUCTION_BASE,
};
