'use strict';

/**
 * Transaction routes (transaction group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { transaction } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function transactionRoutes(fastify) {
  fastify.post('/transaction/simpanorder', { schema: { tags: ['transaction'], summary: 'Simpan order charging', body: s.trxSimpanorder, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(transaction.simpanorder));
  fastify.post('/transaction/startcharging', { schema: { tags: ['transaction'], summary: 'Mulai charging (OCPP)', body: s.trxStartcharging, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(transaction.startcharging));
  fastify.post('/transaction/stopcharging', { schema: { tags: ['transaction'], summary: 'Hentikan charging (OCPP)', body: s.trxStopcharging, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(transaction.stopcharging));
  fastify.post('/transaction/paywithsaldo', { schema: { tags: ['transaction'], summary: 'Bayar order dengan saldo', body: s.trxPaywithsaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(transaction.paywithsaldo));
};
