'use strict';

/**
 * Informasi routes (informasi group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { info } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { requireInteger } = require('../middleware/require-integer');
const { BEARER } = require('./security');

module.exports = async function informasiRoutes(fastify) {
  fastify.post('/informasi/getberita', { schema: { tags: ['informasi'], summary: 'Daftar berita terdekat', body: s.infoGetberita, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getberita));
  fastify.post('/informasi/gettransaksi', { schema: { tags: ['informasi'], summary: 'Riwayat transaksi user', body: s.infoGettransaksi, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.gettransaksi));
  fastify.get('/informasi/carabayar', { schema: { tags: ['informasi'], summary: 'Daftar metode pembayaran' } }, toFastify(info.carabayar));
  fastify.get('/informasi/welcome', { schema: { tags: ['informasi'], summary: 'Halaman welcome (HTML)' } }, toFastify(info.welcome));
  fastify.post('/informasi/historisaldo', { schema: { tags: ['informasi'], summary: 'Histori saldo user', body: s.infoHistorisaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.historisaldo));
  fastify.post('/informasi/datatopup', { schema: { tags: ['informasi'], summary: 'Detail topup per no_trans', body: s.infoDatatopup, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.datatopup));
  fastify.post('/informasi/getdatatopup', { schema: { tags: ['informasi'], summary: 'Riwayat topup user', body: s.infoGetdatatopup, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getdatatopup));
  fastify.post('/informasi/getdatarefund', { schema: { tags: ['informasi'], summary: 'Riwayat refund user', body: s.infoGetdatarefund, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getdatarefund));
  fastify.post('/informasi/getinvoice', { schema: { tags: ['informasi'], summary: 'Detail invoice transaksi', body: s.infoGetinvoice, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getinvoice));

  // ===== Inbox mobile via API (pengganti akses Supabase langsung) =====
  // limit WAJIB integer: kirim 25, bukan "25".
  fastify.post('/informasi/getberita_user', { schema: { tags: ['informasi'], summary: 'Daftar berita/inbox milik user login', body: s.infoGetberitaUser, security: BEARER }, preValidation: requireInteger('limit'), preHandler: mobileTokenAuth }, toFastify(info.getberita_user));
  fastify.post('/informasi/setberitadibaca', { schema: { tags: ['informasi'], summary: 'Tandai berita sudah dibaca', body: s.infoSetberitadibaca, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.setberitadibaca));
  fastify.post('/informasi/getkonektor', { schema: { tags: ['informasi'], summary: 'Status konektor terakhir per connector', body: s.infoGetkonektor, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getkonektor));
  fastify.post('/informasi/getcharging', { schema: { tags: ['informasi'], summary: 'Progres charging satu transaksi', body: s.infoGetcharging, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.getcharging));
  fastify.post('/informasi/hapusberita', { schema: { tags: ['informasi'], summary: 'Hapus satu berita milik user', body: s.infoHapusberita, security: BEARER }, preValidation: requireInteger('id'), preHandler: mobileTokenAuth }, toFastify(info.hapusberita));
  fastify.post('/informasi/setberitasemuadibaca', { schema: { tags: ['informasi'], summary: 'Tandai semua berita user sudah dibaca', body: s.infoSetberitasemuadibaca, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(info.setberitasemuadibaca));
};
