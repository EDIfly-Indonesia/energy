'use strict';

/**
 * Non-OCPP routes (nonocpp group).
 */

const { toFastify } = require('../utils/fastify-compat');
const { nonocpp } = require('../controllers');
const s = require('../schemas/mobile.schema');
const { mobileTokenAuth } = require('../middleware/mobile-auth');
const { BEARER } = require('./security');

module.exports = async function nonocppRoutes(fastify) {
  fastify.post('/nonocpp/startcharging', { schema: { tags: ['nonocpp'], summary: 'Mulai charging (non-OCPP)', body: s.nonocppStart, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(nonocpp.startcharging));
  fastify.post('/nonocpp/stopcharging', { schema: { tags: ['nonocpp'], summary: 'Hentikan charging (non-OCPP)', body: s.nonocppStop, security: BEARER }, preHandler: mobileTokenAuth }, toFastify(nonocpp.stopcharging));
};
