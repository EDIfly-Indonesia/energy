'use strict';

/**
 * Admin dashboard routes (admin group) — additive, does not touch mobile endpoints.
 * All routes except /admin/login require a valid admin JWT (role/owner aware).
 * Role enforcement (SEC-05) mirrors the React sidebar NAV in
 * dashboard/src/components/Layout.tsx.
 */

const admin = require('../controllers/controller-admin');
const master = require('../controllers/controller-admin-master');
const extra = require('../controllers/controller-admin-extra');
const upload = require('../controllers/controller-upload');
const report = require('../controllers/controller-report');
const pelangganCtl = require('../controllers/controller-admin-pelanggan');
const beritaCtl = require('../controllers/controller-admin-berita');
const promoCtl = require('../controllers/controller-admin-promo');
const mediaCtl = require('../controllers/controller-admin-media');
const biayaCtl = require('../controllers/controller-admin-biaya');
const adminAuth = require('../middleware/admin-auth');
const { requireRole } = require('../services/permission');
const s = require('../schemas/admin.schema');
const { BEARER } = require('./security');

const chargeboxIdParams = {
  type: 'object',
  properties: { chargeboxId: { type: 'string', description: 'chargebox_id (varchar, dari daftar chargebox)' } },
};

module.exports = async function adminRoutes(fastify) {
  // login (public) + captcha (public)
  fastify.get('/admin/captcha', {
    schema: { tags: ['admin'], summary: 'Ambil captcha login (SVG)' },
  }, admin.getCaptcha);
  fastify.post('/admin/login', {
    schema: { tags: ['admin'], summary: 'Login admin dashboard', body: s.loginBody },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, admin.login);

  // everything below requires a valid admin token
  fastify.register(async function (protectedRoutes) {
    protectedRoutes.addHook('preHandler', adminAuth);

    // --- all authenticated admins ---
    protectedRoutes.get('/admin/me', { schema: { tags: ['admin'], summary: 'Profil admin login', security: BEARER } }, admin.me);
    protectedRoutes.post('/admin/upload', { schema: { tags: ['admin'], summary: 'Upload foto (multipart)', querystring: s.uploadQuery, security: BEARER } }, upload.upload);
    protectedRoutes.get('/admin/dashboard', { schema: { tags: ['admin'], summary: 'Statistik dashboard', security: BEARER } }, admin.dashboard);

    // --- chargebox + connector: [1,2,3,6] ---
    protectedRoutes.register(async function (cb) {
      cb.addHook('preHandler', requireRole(1, 2, 3, 6));
      cb.get('/admin/chargebox', { schema: { tags: ['admin'], summary: 'Daftar chargebox', security: BEARER } }, admin.listChargebox);
      cb.get('/admin/chargebox/:id', { schema: { tags: ['admin'], summary: 'Detail chargebox', params: s.idParams('ID chargebox (id_chargebox)'), security: BEARER } }, master.getChargebox);
      cb.post('/admin/chargebox', { schema: { tags: ['admin'], summary: 'Tambah chargebox', body: s.chargeboxBody, security: BEARER } }, master.createChargebox);
      cb.put('/admin/chargebox/:id', { schema: { tags: ['admin'], summary: 'Ubah chargebox', body: s.chargeboxBody, params: s.idParams('ID chargebox (id_chargebox)'), security: BEARER } }, master.updateChargebox);
      cb.delete('/admin/chargebox/:id', { schema: { tags: ['admin'], summary: 'Hapus chargebox', params: s.idParams('ID chargebox (id_chargebox)'), security: BEARER } }, master.deleteChargebox);
      cb.get('/admin/chargebox/:chargeboxId/connector', { schema: { tags: ['admin'], summary: 'Daftar konektor chargebox', params: chargeboxIdParams, security: BEARER } }, master.listConnector);
      cb.post('/admin/chargebox/:chargeboxId/connector', { schema: { tags: ['admin'], summary: 'Tambah konektor', body: s.connectorBody, params: chargeboxIdParams, security: BEARER } }, master.createConnector);
      cb.put('/admin/connector/:id', { schema: { tags: ['admin'], summary: 'Ubah konektor', body: s.connectorBody, params: s.idParams('ID konektor'), security: BEARER } }, master.updateConnector);
      cb.delete('/admin/connector/:id', { schema: { tags: ['admin'], summary: 'Hapus konektor', params: s.idParams('ID konektor'), security: BEARER } }, master.deleteConnector);
    });

    // --- transaction: [1,2,3,4,5] ---
    protectedRoutes.register(async function (tx) {
      tx.addHook('preHandler', requireRole(1, 2, 3, 4, 5));
      tx.get('/admin/transaction', { schema: { tags: ['admin'], summary: 'Daftar transaksi', security: BEARER } }, admin.listTransaction);
    });

    // --- area: [1,2] ---
    protectedRoutes.register(async function (area) {
      area.addHook('preHandler', requireRole(1, 2));
      area.post('/admin/area', { schema: { tags: ['admin'], summary: 'Tambah area', body: s.areaBody, security: BEARER } }, master.createArea);
      area.put('/admin/area/:id', { schema: { tags: ['admin'], summary: 'Ubah area', body: s.areaBody, params: s.idParams('ID area (id_area)'), security: BEARER } }, master.updateArea);
      area.delete('/admin/area/:id', { schema: { tags: ['admin'], summary: 'Hapus area', params: s.idParams('ID area (id_area)'), security: BEARER } }, master.deleteArea);
    });

    // --- mitra: [1,2] ---
    protectedRoutes.register(async function (mitra) {
      mitra.addHook('preHandler', requireRole(1, 2));
      mitra.post('/admin/mitra', { schema: { tags: ['admin'], summary: 'Tambah mitra', body: s.mitraBody, security: BEARER } }, extra.createMitra);
      mitra.put('/admin/mitra/:id', { schema: { tags: ['admin'], summary: 'Ubah mitra', body: s.mitraBody, params: s.idParams('ID mitra (id_mitra)'), security: BEARER } }, extra.updateMitra);
      mitra.delete('/admin/mitra/:id', { schema: { tags: ['admin'], summary: 'Hapus mitra', params: s.idParams('ID mitra (id_mitra)'), security: BEARER } }, extra.deleteMitra);
    });

    // --- master lookup (daftar mitra/area untuk dropdown form chargebox): [1,2,3,6] ---
    // GET saja dibuka ke role chargebox; write tetap di role [1,2] di atas.
    protectedRoutes.register(async function (lookup) {
      lookup.addHook('preHandler', requireRole(1, 2, 3, 6));
      lookup.get('/admin/area', { schema: { tags: ['admin'], summary: 'Daftar area', security: BEARER } }, master.listArea);
      lookup.get('/admin/mitra', { schema: { tags: ['admin'], summary: 'Daftar mitra', security: BEARER } }, extra.listMitra);
    });

    // --- setting: [1,2,4] ---
    protectedRoutes.register(async function (setting) {
      setting.addHook('preHandler', requireRole(1, 2, 4));
      setting.get('/admin/setting', { schema: { tags: ['admin'], summary: 'Nilai setting (PPN/PBJT/wallet)', security: BEARER } }, extra.getSetting);
      setting.put('/admin/setting', { schema: { tags: ['admin'], summary: 'Ubah setting', body: s.settingBody, security: BEARER } }, extra.updateSetting);
    });

    // --- wallet (refund + topup): [1,2,4] ---
    protectedRoutes.register(async function (wallet) {
      wallet.addHook('preHandler', requireRole(1, 2, 4));
      wallet.get('/admin/refund', { schema: { tags: ['admin'], summary: 'Daftar refund', security: BEARER } }, extra.listRefund);
      wallet.put('/admin/refund/:id/done', { schema: { tags: ['admin'], summary: 'Tandai refund selesai', params: s.idParams('ID refund'), security: BEARER } }, extra.markRefundDone);
      wallet.get('/admin/topup', { schema: { tags: ['admin'], summary: 'Daftar topup', security: BEARER } }, extra.listTopup);
    });

    // --- pengguna (admin users + roles): [1,2] ---
    protectedRoutes.register(async function (pengguna) {
      pengguna.addHook('preHandler', requireRole(1, 2));
      pengguna.get('/admin/user', { schema: { tags: ['admin'], summary: 'Daftar admin user', security: BEARER } }, extra.listAdminUser);
      pengguna.get('/admin/role', { schema: { tags: ['admin'], summary: 'Daftar role', security: BEARER } }, extra.listRole);
      pengguna.post('/admin/user', { schema: { tags: ['admin'], summary: 'Tambah admin user', body: s.adminUserCreateBody, security: BEARER } }, extra.createAdminUser);
      pengguna.put('/admin/user/:id', { schema: { tags: ['admin'], summary: 'Ubah admin user', body: s.adminUserUpdateBody, params: s.idParams('ID admin user'), security: BEARER } }, extra.updateAdminUser);
    });

    // --- pelanggan (mobile app users + riwayat): [1,2] ---
    protectedRoutes.register(async function (pelanggan) {
      pelanggan.addHook('preHandler', requireRole(1, 2));
      pelanggan.get('/admin/pelanggan', { schema: { tags: ['admin'], summary: 'Daftar pelanggan (user mobile)', security: BEARER } }, pelangganCtl.list);
      pelanggan.get('/admin/pelanggan/lookup', { schema: { tags: ['admin'], summary: 'Lookup pelanggan (carabayar/bank/jenismember/mitra)', security: BEARER } }, pelangganCtl.lookups);
      pelanggan.get('/admin/pelanggan/:id', { schema: { tags: ['admin'], summary: 'Detail pelanggan', params: s.idParams('ID pelanggan (id_user)'), security: BEARER } }, pelangganCtl.detail);
      pelanggan.get('/admin/pelanggan/:id/riwayat', { schema: { tags: ['admin'], summary: 'Riwayat topup/refund/transaksi/saldo/kwh pelanggan', params: s.idParams('ID pelanggan (id_user)'), security: BEARER } }, pelangganCtl.riwayat);
      pelanggan.post('/admin/pelanggan', { schema: { tags: ['admin'], summary: 'Tambah pelanggan', body: s.pelangganCreateBody, security: BEARER } }, pelangganCtl.create);
      pelanggan.put('/admin/pelanggan/:id', { schema: { tags: ['admin'], summary: 'Ubah pelanggan', body: s.pelangganUpdateBody, params: s.idParams('ID pelanggan (id_user)'), security: BEARER } }, pelangganCtl.update);
      pelanggan.delete('/admin/pelanggan/:id', { schema: { tags: ['admin'], summary: 'Nonaktifkan pelanggan (soft delete)', params: s.idParams('ID pelanggan (id_user)'), security: BEARER } }, pelangganCtl.remove);
      pelanggan.post('/admin/pelanggan/:id/restore', { schema: { tags: ['admin'], summary: 'Aktifkan kembali pelanggan', params: s.idParams('ID pelanggan (id_user)'), security: BEARER } }, pelangganCtl.restore);
    });

    // --- media library: daftar + upload bisa diakses role pembuat chargebox
    //     ([1,2,3,6]); hapus hanya admin/superadmin ([1,2]). ---
    protectedRoutes.register(async function (media) {
      media.addHook('preHandler', requireRole(1, 2, 3, 6));
      media.get('/admin/media', { schema: { tags: ['admin'], summary: 'Daftar file media (gambar)', querystring: s.mediaQuery, security: BEARER } }, mediaCtl.listMedia);
    });
    protectedRoutes.register(async function (mediaDel) {
      mediaDel.addHook('preHandler', requireRole(1, 2));
      mediaDel.delete('/admin/media', { schema: { tags: ['admin'], summary: 'Hapus file media', body: s.mediaDeleteBody, security: BEARER } }, mediaCtl.deleteMedia);
    });

    // --- biaya (master biaya tambahan): [1,2] ---
    protectedRoutes.register(async function (biaya) {
      biaya.addHook('preHandler', requireRole(1, 2));
      biaya.get('/admin/biaya', { schema: { tags: ['admin'], summary: 'Daftar master biaya', security: BEARER } }, biayaCtl.listBiaya);
      biaya.post('/admin/biaya', { schema: { tags: ['admin'], summary: 'Tambah master biaya', body: s.biayaBody, security: BEARER } }, biayaCtl.createBiaya);
      biaya.put('/admin/biaya/:id', { schema: { tags: ['admin'], summary: 'Ubah master biaya', body: s.biayaBody, params: s.idParams('ID biaya (id_biaya)'), security: BEARER } }, biayaCtl.updateBiaya);
      biaya.delete('/admin/biaya/:id', { schema: { tags: ['admin'], summary: 'Hapus master biaya', params: s.idParams('ID biaya (id_biaya)'), security: BEARER } }, biayaCtl.deleteBiaya);
    });

    // --- berita / artikel (t_berita): [1,2] ---
    protectedRoutes.register(async function (berita) {
      berita.addHook('preHandler', requireRole(1, 2));
      berita.get('/admin/berita', { schema: { tags: ['admin'], summary: 'Daftar artikel berita', security: BEARER } }, beritaCtl.listBerita);
      berita.post('/admin/berita', { schema: { tags: ['admin'], summary: 'Tambah artikel berita', body: s.beritaBody, security: BEARER } }, beritaCtl.createBerita);
      berita.put('/admin/berita/:id', { schema: { tags: ['admin'], summary: 'Ubah artikel berita', body: s.beritaBody, params: s.idParams('ID berita (id_berita)'), security: BEARER } }, beritaCtl.updateBerita);
      berita.delete('/admin/berita/:id', { schema: { tags: ['admin'], summary: 'Hapus artikel berita', params: s.idParams('ID berita (id_berita)'), security: BEARER } }, beritaCtl.deleteBerita);
    });

    // --- promo mitra (ATPM / hotel / asuransi): [1,2] ---
    // Kontrak: API-PROMO.md §4–§7. Skema body divalidasi di controller
    // (aturan bisnis lebih rumit dari JSON Schema biasa).
    protectedRoutes.register(async function (promo) {
      promo.addHook('preHandler', requireRole(1, 2));

      // mitra
      promo.get('/admin/promo-mitra', { schema: { tags: ['promo'], summary: 'Daftar mitra promo', security: BEARER } }, promoCtl.listMitra);
      promo.post('/admin/promo-mitra', { schema: { tags: ['promo'], summary: 'Tambah mitra promo', security: BEARER } }, promoCtl.createMitra);
      promo.put('/admin/promo-mitra/:id', { schema: { tags: ['promo'], summary: 'Ubah mitra promo', params: s.idParams('ID mitra promo'), security: BEARER } }, promoCtl.updateMitra);
      promo.delete('/admin/promo-mitra/:id', { schema: { tags: ['promo'], summary: 'Nonaktifkan mitra promo', params: s.idParams('ID mitra promo'), security: BEARER } }, promoCtl.deleteMitra);
      promo.post('/admin/promo-mitra/:id/api-key', { schema: { tags: ['promo'], summary: 'Buat/reset API key ATPM', params: s.idParams('ID mitra promo'), security: BEARER } }, promoCtl.resetApiKey);
      promo.delete('/admin/promo-mitra/:id/api-key', { schema: { tags: ['promo'], summary: 'Cabut API key ATPM', params: s.idParams('ID mitra promo'), security: BEARER } }, promoCtl.deleteApiKey);

      // promo
      promo.get('/admin/promo', { schema: { tags: ['promo'], summary: 'Daftar promo', security: BEARER } }, promoCtl.listPromo);
      promo.get('/admin/promo/eksposur', { schema: { tags: ['promo'], summary: 'Transaksi dengan klaim promo gagal', security: BEARER } }, promoCtl.listEksposur);
      promo.get('/admin/promo/:id', { schema: { tags: ['promo'], summary: 'Detail promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.detailPromo);
      promo.post('/admin/promo', { schema: { tags: ['promo'], summary: 'Tambah promo', security: BEARER } }, promoCtl.createPromo);
      promo.put('/admin/promo/:id', { schema: { tags: ['promo'], summary: 'Ubah promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.updatePromo);
      promo.delete('/admin/promo/:id', { schema: { tags: ['promo'], summary: 'Nonaktifkan promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.deletePromo);
      promo.post('/admin/promo/:id/tutup-periode', { schema: { tags: ['promo'], summary: 'Tutup periode (hangus/rollover)', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.tutupPeriode);

      // iklan
      promo.get('/admin/promo/:id/iklan', { schema: { tags: ['promo'], summary: 'Daftar iklan promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.listIklan);
      promo.post('/admin/promo/:id/iklan', { schema: { tags: ['promo'], summary: 'Tambah iklan promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.createIklan);
      promo.put('/admin/promo-iklan/:id', { schema: { tags: ['promo'], summary: 'Ubah iklan promo', params: s.idParams('ID iklan'), security: BEARER } }, promoCtl.updateIklan);
      promo.delete('/admin/promo-iklan/:id', { schema: { tags: ['promo'], summary: 'Nonaktifkan iklan promo', params: s.idParams('ID iklan'), security: BEARER } }, promoCtl.deleteIklan);

      // peserta & pemakaian
      promo.get('/admin/promo/:id/peserta', { schema: { tags: ['promo'], summary: 'Daftar peserta promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.listPeserta);
      promo.post('/admin/promo/:id/peserta', { schema: { tags: ['promo'], summary: 'Tambah peserta promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.createPeserta);
      promo.delete('/admin/promo-peserta/:id', { schema: { tags: ['promo'], summary: 'Hapus peserta promo', params: s.idParams('ID peserta'), security: BEARER } }, promoCtl.deletePeserta);
      promo.get('/admin/promo/:id/pemakaian', { schema: { tags: ['promo'], summary: 'Ledger pemakaian promo', params: s.idParams('ID promo'), security: BEARER } }, promoCtl.listPemakaian);
    });

    // --- laporan / report: [1,2,4] ---
    protectedRoutes.register(async function (rpt) {
      rpt.addHook('preHandler', requireRole(1, 2, 4));
      rpt.get('/admin/report/summary', { schema: { tags: ['admin'], summary: 'Ringkasan keuangan (periode)', querystring: s.reportQuery, security: BEARER } }, report.summary);
      rpt.get('/admin/report/transaction', { schema: { tags: ['admin'], summary: 'Laporan transaksi (per hari/bulan)', querystring: s.reportQuery, security: BEARER } }, report.transaction);
      rpt.get('/admin/report/topup', { schema: { tags: ['admin'], summary: 'Laporan topup (pemasukan)', querystring: s.reportQuery, security: BEARER } }, report.topup);
      rpt.get('/admin/report/refund', { schema: { tags: ['admin'], summary: 'Laporan refund (pengeluaran)', querystring: s.reportQuery, security: BEARER } }, report.refund);
      rpt.get('/admin/report/mitra', { schema: { tags: ['admin'], summary: 'Laporan pendapatan per mitra', querystring: s.reportQuery, security: BEARER } }, report.mitra);
    });
  });
};
