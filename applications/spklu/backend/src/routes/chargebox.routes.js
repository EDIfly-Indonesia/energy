'use strict';

/**
 * Chargebox routes (chargebox group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { chargebox } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { requireInteger } = require('../middleware/require-integer');
const { BEARER } = require('./security');

module.exports = async function chargeboxRoutes(fastify) {
  fastify.post('/chargebox/nearest', {
    schema: { tags: ['chargebox'], summary: 'Cari chargebox terdekat', body: s.chargeboxNearest, security: BEARER },
    // limit WAJIB integer: kirim 10, bukan "10". Lihat middleware/require-integer.js.
    preValidation: requireInteger('limit'),
    preHandler: mobileTokenAuth,
  }, toFastify(chargebox.nearest));
  fastify.post('/chargebox/getharga', { schema: { tags: ['chargebox'], summary: 'Ambil harga & biaya charging', body: s.chargeboxGetharga, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(chargebox.getharga));
};
