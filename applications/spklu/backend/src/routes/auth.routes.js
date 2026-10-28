'use strict';

/**
 * Auth routes (auth group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { auth } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth, mobileKeyAuth } = require('../middleware/mobile-auth');
const { BEARER, KEY } = require('./security');

module.exports = async function authRoutes(fastify) {
  fastify.post('/auth/login', { schema: { tags: ['auth'], summary: 'Login pengguna (password/email/apple)', body: s.authLogin, security: KEY }, preHandler: mobileKeyAuth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, toFastify(auth.login));
  fastify.post('/auth/cekemail', { schema: { tags: ['auth'], summary: 'Cek email terdaftar', body: s.authCekemail, security: KEY }, preHandler: mobileKeyAuth }, toFastify(auth.cekemail));
  fastify.post('/auth/tesemail', { schema: { tags: ['auth'], summary: 'Test kirim email OTP', body: s.authTesemail, security: KEY }, preHandler: mobileKeyAuth, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, toFastify(auth.tesemail));
  fastify.post('/auth/kirimotp', { schema: { tags: ['auth'], summary: 'Kirim OTP via email', body: s.authKirimotp, security: KEY }, preHandler: mobileKeyAuth, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, toFastify(auth.kirimotp));
  fastify.post('/auth/registrasi', { schema: { tags: ['auth'], summary: 'Registrasi pengguna baru', body: s.authRegistrasi, security: KEY }, preHandler: mobileKeyAuth, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, toFastify(auth.registrasi));
  fastify.post('/auth/gantipassword', { schema: { tags: ['auth'], summary: 'Ganti password (butuh token + password lama)', body: s.authGantipassword, security: BEARER }, preHandler: mobileTokenAuth, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, toFastify(auth.gantipassword));
  fastify.post('/auth/resetpassword', { schema: { tags: ['auth'], summary: 'Reset password (butuh OTP)', body: s.authResetpassword, security: KEY }, preHandler: mobileKeyAuth }, toFastify(auth.resetpassword));
  fastify.post('/auth/hapususer', { schema: { tags: ['auth'], summary: 'Hapus (soft-delete) user', body: s.authHapususer, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.hapususer));
  fastify.post('/auth/buatwallet', { schema: { tags: ['auth'], summary: 'Buat wallet DOKU', body: s.authBuatwallet, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.buatwallet));
  fastify.post('/auth/topup', { schema: { tags: ['auth'], summary: 'Topup saldo (multi channel VA/e-money)', body: s.authTopup, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.topup));
  fastify.post('/auth/saldowallet', { schema: { tags: ['auth'], summary: 'Cek saldo wallet DOKU', body: s.authSaldowallet, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.saldowallet));
  fastify.post('/auth/simpantoken', { schema: { tags: ['auth'], summary: 'Simpan FCM token perangkat', body: s.authSimpantoken, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.simpantoken));
  fastify.post('/auth/tesfirebase', { schema: { tags: ['auth'], summary: 'Test kirim notifikasi Firebase', body: s.authTesfirebase, security: KEY }, preHandler: mobileKeyAuth }, toFastify(auth.tesfirebase));
  fastify.post('/auth/transfer', { schema: { tags: ['auth'], summary: 'Transfer saldo antar wallet', body: s.authTransfer, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.transfer));
  fastify.post('/auth/withdrawl', { schema: { tags: ['auth'], summary: 'Tarik dana (payout) ke rekening', body: s.authWithdrawl, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(auth.withdrawl));
  fastify.get('/auth/getsetting', { schema: { tags: ['auth'], summary: 'Ambil nilai pengaturan (PPN)' } }, toFastify(auth.getsetting));
};
