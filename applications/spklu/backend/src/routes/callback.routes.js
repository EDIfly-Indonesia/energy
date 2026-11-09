'use strict';

/**
 * Callback routes (callback group).
 * `/callback/va` stays PUBLIC (payment gateway callback, must be reachable
 * without a user session). Dev `tesglobal*` endpoints removed (SEC-09/12).
 */

const { toFastify } = require('../utils/fastify-compat');
const { callback } = require('../controllers');
const qrisPage = require('../controllers/controller-qris-page');
const s = require('../schemas/mobile.schema');

module.exports = async function callbackRoutes(fastify) {
  fastify.post('/callback/va', { schema: { tags: ['callback'], summary: 'Callback notifikasi pembayaran (DOKU/VA)', body: s.callbackVa } }, toFastify(callback.va));
  fastify.post('/xendit/callback', { schema: { tags: ['callback'], summary: 'Callback notifikasi pembayaran Xendit (VA/QRIS), verifikasi x-callback-token' } }, toFastify(callback.xendit));
  // Halaman QR pembayaran (publik) — dibuka aplikasi mobile di WebView.
  fastify.get('/qris/:no_trans', { schema: { tags: ['callback'], summary: 'Halaman QR pembayaran QRIS (HTML)', params: { type: 'object', properties: { no_trans: { type: 'string' } } } } }, toFastify(qrisPage.qrisPage));
};
