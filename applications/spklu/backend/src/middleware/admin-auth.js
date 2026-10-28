'use strict';

/**
 * Fastify preHandler: require a valid admin JWT. Attaches `request.admin`.
 */

const { decodeAdmin } = require('../services/permission');

module.exports = async function adminAuth(request, reply) {
  const admin = decodeAdmin(request);
  if (!admin) {
    return reply.code(401).send({ success: false, message: 'Tidak terautentikasi', data: null });
  }
  request.admin = admin;
};
