'use strict';

/**
 * User routes (user group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { user } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function userRoutes(fastify) {
  fastify.post('/user/getsaldo', { schema: { tags: ['user'], summary: 'Cek saldo user (wallet BMS)', body: s.userGetsaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.getsaldo));
  fastify.post('/user/getkwhuser', { schema: { tags: ['user'], summary: 'Ambil kWh bulan ini & total', body: s.userGetkwhuser, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.getkwhuser));
  fastify.post('/user/ubahprofil', { schema: { tags: ['user'], summary: 'Ubah profil (nama)', body: s.userUbahprofil, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(user.ubahprofil));
};
