'use strict';

/**
 * User routes (user group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { user } = require('../controllers');
const kendaraan = require('../controllers/controller-kendaraan');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function userRoutes(fastify) {
  fastify.post('/user/getsaldo', { schema: { tags: ['user'], summary: 'Cek saldo user (wallet BMS)', body: s.userGetsaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.getsaldo));
  fastify.post('/user/getkwhuser', { schema: { tags: ['user'], summary: 'Ambil kWh bulan ini & total', body: s.userGetkwhuser, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.getkwhuser));
  fastify.post('/user/ubahprofil', { schema: { tags: ['user'], summary: 'Ubah profil (nama)', body: s.userUbahprofil, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.ubahprofil));

  // --- daftar kendaraan pengguna (fitur profil) ---
  // id_user SELALU diambil dari token, bukan dari body/params.
  fastify.get('/user/kendaraan', { schema: { tags: ['user'], summary: 'Daftar kendaraan milik pengguna', security: BEARER }, preHandler: mobileTokenAuth }, toFastify(kendaraan.listKendaraan));
  fastify.post('/user/kendaraan', { schema: { tags: ['user'], summary: 'Tambah kendaraan', security: BEARER }, preHandler: mobileTokenAuth }, toFastify(kendaraan.createKendaraan));
  fastify.put('/user/kendaraan/:id', { schema: { tags: ['user'], summary: 'Ubah kendaraan', security: BEARER }, preHandler: mobileTokenAuth }, toFastify(kendaraan.updateKendaraan));
  fastify.delete('/user/kendaraan/:id', { schema: { tags: ['user'], summary: 'Hapus kendaraan', security: BEARER }, preHandler: mobileTokenAuth }, toFastify(kendaraan.deleteKendaraan));
};
