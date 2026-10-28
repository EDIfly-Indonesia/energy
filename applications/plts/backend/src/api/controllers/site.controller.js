'use strict';

/**
 * Site Controller — Stub
 * TODO: Implementasi lengkap dengan service layer
 */

const prisma = require('../../config/database');

exports.getSites = async (request, reply) => {
  try {
    const { tenantId } = request.user ?? {};

    const sites = await prisma.site.findMany({
      where: tenantId
        ? { tenantId }
        : undefined,
      include: {
        _count:  { select: { devices: true } },
        tenant:  { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.code(200).send({
      success: true,
      message: 'Data site berhasil dimuat.',
      data:    sites,
      meta:    { total: sites.length },
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getSites error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.getSiteById = async (request, reply) => {
  const { id } = request.params;
  try {
    const site = await prisma.site.findUnique({
      where:   { id },
      include: {
        devices: { include: { deviceBrand: { select: { name: true } } } },
      },
    });

    if (!site) {
      return reply.code(404).send({
        success: false, message: 'Site tidak ditemukan.',
        data: null, meta: null, errors: { id: 'Site tidak ditemukan.' },
      });
    }

    return reply.code(200).send({
      success: true, message: 'Data site berhasil dimuat.',
      data: site, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, siteId: id }, 'getSiteById error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.createSite = async (request, reply) => {
  const { companyId, name, capacityKwp, latitude, longitude, timezone } = request.body ?? {};

  if (!companyId || !name || !capacityKwp) {
    return reply.code(400).send({
      success: false, message: 'Validasi gagal.',
      data: null, meta: null,
      errors: {
        ...(!companyId    && { companyId:    'Company ID wajib diisi.' }),
        ...(!name         && { name:         'Nama site wajib diisi.' }),
        ...(!capacityKwp  && { capacityKwp:  'Kapasitas kWp wajib diisi.' }),
      },
    });
  }

  try {
    const site = await prisma.site.create({
      data: { companyId, name, capacityKwp, latitude, longitude, timezone },
    });

    request.log.info({ siteId: site.id }, 'Site baru dibuat');

    return reply.code(201).send({
      success: true, message: 'Site berhasil dibuat.',
      data: site, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'createSite error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};
