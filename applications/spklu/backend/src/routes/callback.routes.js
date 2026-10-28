'use strict';

/**
 * Callback routes (callback group).
 * `/callback/va` stays PUBLIC (payment gateway callback, must be reachable
 * without a user session). Dev `tesglobal*` endpoints removed (SEC-09/12).
 */

const { toFastify } = require('../utils/fastify-compat');
const { callback } = require('../controllers');
const s = require('../schemas/mobile.schema');

module.exports = async function callbackRoutes(fastify) {
  fastify.post('/callback/va', { schema: { tags: ['callback'], summary: 'Callback notifikasi pembayaran (DOKU/VA)', body: s.callbackVa } }, toFastify(callback.va));
};
