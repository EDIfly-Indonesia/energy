'use strict';

/**
 * Admin auth + role/owner helpers.
 */

const jwt = require('jsonwebtoken');

function decodeAdmin(request) {
  const header = request.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    if (!payload || payload.scope !== 'admin') return null;
    return payload && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}

// superadmin (type 1) and admin (type 2) see everything
function isSuperOrAdmin(admin) {
  return !!admin && (admin.type_id === 1 || admin.type_id === 2);
}

// Owner scope: for non-super/admin users linked to a mitra, return that
// id_mitra (to filter chargebox/transaction data). Null = no filter.
function ownerScope(admin) {
  if (!admin || isSuperOrAdmin(admin) || !admin.id_mitra) return null;
  return admin.id_mitra;
}

// Build an optional `AND col = $1` owner-scope filter (SEC-05).
function ownerFilter(admin, col = 'id_mitra') {
  const id = ownerScope(admin);
  return id ? { sql: ` AND ${col} = $1`, params: [id] } : { sql: '', params: [] };
}

// Role guard: Fastify preHandler that rejects admins whose type_id is not in
// allowedTypes. Runs AFTER adminAuth (which sets request.admin).
function requireRole(...allowedTypes) {
  return async function roleGuard(request, reply) {
    const admin = request.admin;
    if (!admin || !allowedTypes.includes(admin.type_id)) {
      return reply.code(403).send({ success: false, message: 'Akses ditolak', data: null });
    }
  };
}

// Return the authenticated MOBILE user's id_user (from the JWT `data`, attached
// by mobileTokenAuth preHandler). Null when missing. Endpoints must use this
// instead of `req.body.id_user` to prevent IDOR (SEC-03).
function tokenUserId(request) {
  const u = request && request.user;
  if (!u || u.id_user === undefined || u.id_user === null) return null;
  return Number(u.id_user);
}

module.exports = { decodeAdmin, isSuperOrAdmin, ownerScope, ownerFilter, requireRole, tokenUserId };
