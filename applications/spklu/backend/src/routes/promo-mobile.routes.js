'use strict';

/**
 * Endpoint promo untuk mobile — API-PROMO.md §11.
 * Token mobile (scope mobile), sama dengan endpoint mobile lain.
 */

const promoMobileCtl = require('../controllers/controller-mobile-promo');
// mobile-auth mengekspor objek { mobileTokenAuth, ... }, bukan fungsi langsung.
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function promoMobileRoutes(fastify) {
  fastify.register(async function (protectedRoutes) {
    protectedRoutes.addHook('preHandler', mobileTokenAuth);

    protectedRoutes.get('/promo/iklan', {
      schema: { tags: ['promo'], summary: 'Iklan promo layak tayang untuk pengguna ini', security: BEARER },
    }, promoMobileCtl.listIklan);

    protectedRoutes.post('/promo/iklan/:id/tayang', {
      schema: { tags: ['promo'], summary: 'Catat satu impresi iklan', security: BEARER },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    }, promoMobileCtl.catatTayang);
  });
};
