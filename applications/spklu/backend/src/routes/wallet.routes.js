'use strict';

/**
 * Wallet routes (wallet group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { wallet } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function walletRoutes(fastify) {
  fastify.post('/wallet/register', { schema: { tags: ['wallet'], summary: 'Register agent wallet (BMS)', body: s.walletRegister, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.registeragent));
  fastify.post('/wallet/ceksaldo', { schema: { tags: ['wallet'], summary: 'Cek saldo wallet (BMS)', body: s.walletCeksaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.ceksaldo));
  fastify.post('/wallet/updatepin', { schema: { tags: ['wallet'], summary: 'Update PIN wallet', body: s.walletUpdatepin, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.updatepin));
  fastify.post('/wallet/tokenize', { schema: { tags: ['wallet'], summary: 'Tokenize PIN wallet', body: s.walletTokenize, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.tokenize));
  fastify.post('/wallet/paywithsaldo', { schema: { tags: ['wallet'], summary: 'Bayar dengan saldo wallet', body: s.walletPaywithsaldo, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.paywithsaldo));
  fastify.post('/wallet/topup', { schema: { tags: ['wallet'], summary: 'Topup wallet (BMS)', body: s.walletTopup, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(wallet.topup));
};
