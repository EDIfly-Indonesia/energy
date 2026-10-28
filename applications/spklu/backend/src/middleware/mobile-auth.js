'use strict';

/**
 * Mobile auth preHandlers (Fastify). Replace the legacy `lib.cektoken`/`cekkey`
 * "send a response then keep executing" pattern with real enforcement.
 *
 * Two mechanisms (mirrors the mobile app contract):
 *  - mobileTokenAuth: Bearer JWT signed with SECRET_KEY + integrity key
 *    HMAC-SHA256(email, PENGACAK). Attaches `request.user` (= the token's `data`).
 *  - mobileKeyAuth: shared `key-header` header === KEY_HEADER (login / registrasi /
 *    OTP / reset — endpoints with no user session yet).
 *
 * Failure envelope is preserved EXACTLY for the frozen mobile API:
 * HTTP 200 + { success:false, message:'invalid0' | 'invalid', data:null }.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function verifyMobileToken(request) {
  const header = request.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded || !decoded.data || !decoded.data.email) return null;
    const expected = crypto.createHmac('sha256', process.env.PENGACAK).update(decoded.data.email).digest('hex');
    if (decoded.key !== expected) return null;
    return decoded.data;
  } catch {
    return null;
  }
}

function verifyKeyHeader(request) {
  return (request.headers['key-header'] || '') === (process.env.KEY_HEADER || '');
}

async function mobileTokenAuth(request, reply) {
  const user = verifyMobileToken(request);
  if (!user) {
    // Body TIDAK diubah (kontrak mobile beku: message harus 'invalid0').
    // Header diagnostik ini aditif, untuk membedakan "tidak mengirim token"
    // dari "token salah/kedaluwarsa" saat debugging lewat curl.
    const header = request.headers['authorization'] || '';
    const reason = !header ? 'missing-token'
      : !header.startsWith('Bearer ') ? 'not-bearer'
      : 'invalid-or-expired-token';
    reply.header('x-auth-error', reason);
    return reply.send({ success: false, message: 'invalid0', data: null });
  }
  request.user = user;
}

async function mobileKeyAuth(request, reply) {
  if (!verifyKeyHeader(request)) {
    reply.header('x-auth-error', request.headers['key-header'] ? 'wrong-key-header' : 'missing-key-header');
    return reply.send({ success: false, message: 'invalid', data: null });
  }
}

module.exports = { verifyMobileToken, verifyKeyHeader, mobileTokenAuth, mobileKeyAuth };
