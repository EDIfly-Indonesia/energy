'use strict';

/**
 * Auth untuk portal mitra (hotel / asuransi).
 *
 * Token portal TERPISAH dari token admin dan token mobile. Payload JWT memakai
 * scope 'portal' sehingga decodeAdmin() (yang mensyaratkan scope 'admin')
 * tidak akan menerimanya, dan sebaliknya.
 *
 * Prinsip keamanan: id_mitra_promo SELALU diambil dari token, tidak pernah
 * dari body/query. Controller portal wajib memfilter dengan request.portal.id_mitra_promo.
 */

const jwt = require('jsonwebtoken');

function decodePortal(request) {
  const header = request.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    if (!payload || payload.scope !== 'portal') return null;
    const d = payload.data || {};
    if (!d.id_portal_user || !d.id_mitra_promo) return null;
    return d;
  } catch {
    return null;
  }
}

function signPortal(payload, expiresIn = '12h') {
  return jwt.sign({ scope: 'portal', data: payload }, process.env.SECRET_KEY, { expiresIn });
}

module.exports = async function portalAuth(request, reply) {
  const portal = decodePortal(request);
  if (!portal) {
    return reply.code(401).send({ success: false, message: 'Tidak terautentikasi', data: null });
  }
  request.portal = portal;
};

module.exports.decodePortal = decodePortal;
module.exports.signPortal = signPortal;
