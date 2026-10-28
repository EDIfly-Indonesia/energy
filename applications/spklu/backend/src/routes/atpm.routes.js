'use strict';

/**
 * ATPM (machine-to-machine) routes — API-PROMO.md §9.
 * Autentikasi: header X-Api-Key (satu key per mitra).
 */

const atpmCtl = require('../controllers/controller-atpm');

module.exports = async function atpmRoutes(fastify) {
  fastify.register(async function (protectedRoutes) {
    protectedRoutes.addHook('preHandler', atpmCtl.atpmAuth);

    protectedRoutes.post('/atpm/kendaraan', {
      schema: { tags: ['atpm'], summary: 'Daftarkan kendaraan + keanggotaan promo' },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    }, atpmCtl.daftarKendaraan);
  });
};
