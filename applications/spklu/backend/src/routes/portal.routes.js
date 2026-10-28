'use strict';

/**
 * Portal mitra (hotel / asuransi) routes — API-PROMO.md §8.
 * Token portal terpisah dari admin & mobile (scope 'portal').
 */

const portalCtl = require('../controllers/controller-portal');
const portalAuth = require('../middleware/portal-auth');
const { BEARER } = require('./security');

module.exports = async function portalRoutes(fastify) {
  // login (public)
  fastify.post('/portal/login', {
    schema: { tags: ['portal'], summary: 'Login portal mitra' },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, portalCtl.login);

  fastify.register(async function (protectedRoutes) {
    protectedRoutes.addHook('preHandler', portalAuth);

    protectedRoutes.get('/portal/promo', {
      schema: { tags: ['portal'], summary: 'Daftar promo milik mitra ini', security: BEARER },
    }, portalCtl.listPromo);

    protectedRoutes.get('/portal/promo/:id/peserta', {
      schema: { tags: ['portal'], summary: 'Daftar peserta promo', security: BEARER },
    }, portalCtl.listPeserta);

    protectedRoutes.post('/portal/promo/:id/peserta', {
      schema: { tags: ['portal'], summary: 'Tambah peserta (tunggal atau massal)', security: BEARER },
    }, portalCtl.createPeserta);

    protectedRoutes.delete('/portal/peserta/:id', {
      schema: { tags: ['portal'], summary: 'Hapus peserta', security: BEARER },
    }, portalCtl.deletePeserta);
  });
};
