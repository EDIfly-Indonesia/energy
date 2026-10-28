'use strict';

/**
 * Auth Middleware
 *
 * Menyediakan:
 *  - verifyToken      : Validasi JWT dan inject request.user
 *  - hasPermission    : Cek capability permission berdasarkan role
 *  - canAccessResource: Cek akses resource berdasarkan tenant hierarchy
 *
 * Menggunakan Prisma singleton dari config/database.js.
 */

const jwt    = require('jsonwebtoken');
const prisma = require('../../config/database');

// ─── Config ────────────────────────────────────────────────────────────────────
const {
  JWT_SECRET,
  JWT_ISSUER   = 'plts-platform',
  JWT_AUDIENCE = 'plts-api',
} = process.env;

if (!JWT_SECRET) throw new Error('ENV JWT_SECRET wajib diisi.');

// ─── verifyToken ───────────────────────────────────────────────────────────────

/**
 * Prehandler Fastify — verifikasi JWT access token.
 * Menyimpan data user ke `request.user` untuk digunakan controller.
 */
async function verifyToken(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({
      success: false,
      message: 'Token tidak ditemukan.',
      data:    null,
      meta:    null,
      errors:  { auth: 'Sesi Anda telah berakhir. Silakan login kembali.' },
    });
  }

  const token = authHeader.slice(7); // Hapus prefix 'Bearer '

  // Verifikasi signature & expiry
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      issuer:   JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return reply.code(401).send({
      success: false,
      message: isExpired ? 'Token telah kadaluarsa.' : 'Token tidak valid.',
      data:    null,
      meta:    null,
      errors:  { auth: 'Sesi Anda telah berakhir. Silakan login kembali.' },
    });
  }

  // Fetch user dari DB — memastikan user masih aktif dan data selalu fresh
  let user;
  try {
    user = await prisma.user.findUnique({
      where:   { id: decoded.userId },
      include: { role: true, tenant: true },
    });
  } catch (err) {
    request.log.error({ err }, 'verifyToken: DB error saat fetch user');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }

  if (!user) {
    return reply.code(401).send({
      success: false,
      message: 'User tidak ditemukan.',
      data:    null,
      meta:    null,
      errors:  { auth: 'Akun tidak ditemukan dalam sistem.' },
    });
  }

  if (!user.isActive) {
    return reply.code(401).send({
      success: false,
      message: 'Akun Anda tidak aktif.',
      data:    null,
      meta:    null,
      errors:  { auth: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' },
    });
  }

  // Inject ke request agar controller bisa akses langsung
  request.user    = user;
  request.token   = token;
  request.decoded = decoded;
}

// ─── hasPermission ─────────────────────────────────────────────────────────────

/**
 * Factory prehandler — cek apakah user punya capability tertentu.
 *
 * Usage (di routes):
 *   preHandler: [verifyToken, hasPermission('manage_users')]
 */
function hasPermission(capability, module) {
  return async function _hasPermission(request, reply) {
    const user = request.user;

    if (!user) {
      return reply.code(401).send({
        success: false,
        message: 'User tidak terautentikasi.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Silakan login terlebih dahulu.' },
      });
    }

    // Super admin selalu punya akses penuh
    if (user.role?.name === 'super_admin') return;

    // Cek permission di DB — match capability DAN module (jika module disediakan)
    const where = {
      userId:     user.id,
      permission: { capability },
    };
    if (module) where.permission.module = module;

    const granted = await prisma.userPermission.findFirst({
      where,
      include: { permission: true },
    });

    if (!granted) {
      return reply.code(403).send({
        success: false,
        message: 'Akses ditolak.',
        data:    null,
        meta:    null,
        errors:  { permission: 'Anda tidak memiliki izin untuk mengakses resource ini.' },
      });
    }
  };
}

// ─── canAccessResource ─────────────────────────────────────────────────────────

/**
 * Factory prehandler — cek akses resource berdasarkan tenant hierarchy.
 *
 * Usage (di routes):
 *   preHandler: [verifyToken, canAccessResource('site')]
 *
 * @param {'tenant'|'site'|'device'} resourceType
 * @param {string} paramName  Nama param di URL (default: 'id')
 */
function canAccessResource(resourceType, paramName = 'id') {
  return async function _canAccessResource(request, reply) {
    const user       = request.user;
    const resourceId = request.params?.[paramName];

    if (!user || !resourceId) {
      return reply.code(403).send({
        success: false,
        message: 'Akses ditolak.',
        data:    null,
        meta:    null,
        errors:  { auth: 'Anda tidak memiliki izin untuk mengakses resource ini.' },
      });
    }

    // Super admin & admin punya akses ke semua resource
    if (['super_admin', 'admin'].includes(user.role?.name)) return;

    // Tenant admin hanya bisa akses resource milik tenantnya
    if (user.role?.name === 'tenant_admin') {
      const allowed = await checkTenantAccess(user, resourceType, resourceId);
      if (!allowed) {
        return reply.code(403).send({
          success: false,
          message: 'Akses ditolak.',
          data:    null,
          meta:    null,
          errors:  { auth: 'Anda tidak memiliki izin untuk mengakses resource ini.' },
        });
      }
    }

    // Role lain (viewer, installer) — dapat dikembangkan sesuai kebutuhan
  };
}

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Cek apakah user berhak mengakses resource tertentu berdasarkan tenantId.
 */
async function checkTenantAccess(user, resourceType, resourceId) {
  switch (resourceType) {
    case 'tenant':
      return user.tenantId === resourceId;

    case 'site': {
      const site = await prisma.site.findUnique({
        where:  { id: resourceId },
        select: { company: { select: { tenantId: true } } },
      });
      return site?.company?.tenantId === user.tenantId;
    }

    case 'device': {
      const device = await prisma.device.findUnique({
        where:  { id: resourceId },
        select: { site: { select: { company: { select: { tenantId: true } } } } },
      });
      return device?.site?.company?.tenantId === user.tenantId;
    }

    default:
      return false;
  }
}

// ───────────────────────────────────────────────────────────────────────────────

module.exports = { verifyToken, hasPermission, canAccessResource };
