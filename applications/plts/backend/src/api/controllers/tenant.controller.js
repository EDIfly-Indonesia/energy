'use strict';

/**
 * Tenant Controller
 *
 * Mengelola operasi CRUD untuk data Tenant.
 * Response menggunakan format standar: { success, message, data, meta, errors }
 */

const prisma = require('../../config/database');

// ─── GET /tenants ──────────────────────────────────────────────────────────────

exports.getTenants = async (request, reply) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where:   { isActive: true },
      select:  {
        id:        true,
        name:      true,
        type:      true,
        isActive:  true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.code(200).send({
      success: true,
      message: 'Data tenant berhasil dimuat.',
      data:    tenants,
      meta:    { total: tenants.length },
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getTenants error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ─── GET /tenants/:id ──────────────────────────────────────────────────────────

exports.getTenantById = async (request, reply) => {
  const { id } = request.params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where:   { id },
      include: {
        companies: {
          include: {
            sites: {
              include: { devices: true },
            },
          },
        },
        users: {
          select: { id: true, name: true, email: true, isActive: true },
        },
      },
    });

    if (!tenant) {
      return reply.code(404).send({
        success: false,
        message: 'Tenant tidak ditemukan.',
        data:    null,
        meta:    null,
        errors:  { id: 'Tenant dengan ID tersebut tidak ditemukan.' },
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Data tenant berhasil dimuat.',
      data:    tenant,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error, tenantId: id }, 'getTenantById error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ─── POST /tenants ─────────────────────────────────────────────────────────────

exports.createTenant = async (request, reply) => {
  const { name, type } = request.body ?? {};

  // Validasi input
  const errors = {};
  if (!name) errors.name = 'Nama tenant wajib diisi.';
  if (!type) errors.type = 'Tipe tenant wajib diisi.';

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({
      success: false,
      message: 'Validasi gagal.',
      data:    null,
      meta:    null,
      errors,
    });
  }

  try {
    const tenant = await prisma.tenant.create({
      data: { name, type, isActive: true },
    });

    request.log.info({ tenantId: tenant.id }, 'Tenant baru dibuat');

    return reply.code(201).send({
      success: true,
      message: 'Tenant berhasil dibuat.',
      data:    tenant,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'createTenant error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ─── PUT /tenants/:id ──────────────────────────────────────────────────────────

exports.updateTenant = async (request, reply) => {
  const { id }                    = request.params;
  const { name, type, isActive }  = request.body ?? {};

  try {
    // Pastikan tenant ada
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        success: false,
        message: 'Tenant tidak ditemukan.',
        data:    null,
        meta:    null,
        errors:  { id: 'Tenant dengan ID tersebut tidak ditemukan.' },
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name     !== undefined && { name }),
        ...(type     !== undefined && { type }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    request.log.info({ tenantId: id }, 'Tenant diperbarui');

    return reply.code(200).send({
      success: true,
      message: 'Tenant berhasil diperbarui.',
      data:    tenant,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error, tenantId: id }, 'updateTenant error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};

// ─── DELETE /tenants/:id ───────────────────────────────────────────────────────

exports.deleteTenant = async (request, reply) => {
  const { id } = request.params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where:   { id },
      include: {
        companies: true,
        users:     true,
      },
    });

    if (!tenant) {
      return reply.code(404).send({
        success: false,
        message: 'Tenant tidak ditemukan.',
        data:    null,
        meta:    null,
        errors:  { id: 'Tenant dengan ID tersebut tidak ditemukan.' },
      });
    }

    // Cegah hapus tenant yang masih memiliki relasi aktif
    if (tenant.companies.length > 0 || tenant.users.length > 0) {
      return reply.code(409).send({
        success: false,
        message: 'Tenant tidak dapat dihapus.',
        data:    null,
        meta:    null,
        errors:  {
          constraint: `Tenant masih memiliki ${tenant.companies.length} company dan ${tenant.users.length} user aktif.`,
        },
      });
    }

    await prisma.tenant.delete({ where: { id } });

    request.log.info({ tenantId: id }, 'Tenant dihapus');

    return reply.code(200).send({
      success: true,
      message: 'Tenant berhasil dihapus.',
      data:    null,
      meta:    null,
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error, tenantId: id }, 'deleteTenant error');
    return reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server.',
      data:    null,
      meta:    null,
      errors:  { server: 'Silakan coba lagi nanti.' },
    });
  }
};
