'use strict';

/**
 * Device Controller
 * Response menggunakan format standar: { success, message, data, meta, errors }
 */

const prisma = require('../../config/database');

exports.getDevices = async (request, reply) => {
  try {
    const { siteId, status } = request.query ?? {};

    const devices = await prisma.device.findMany({
      where: {
        ...(siteId && { siteId }),
        ...(status && { status }),
      },
      include: {
        brand: { select: { id: true, name: true } },
        type:  { select: { id: true, name: true } },
        site:  { 
          include: { 
            tenant: { select: { name: true } }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.code(200).send({
      success: true,
      message: 'Data device berhasil dimuat.',
      data:    devices,
      meta:    { total: devices.length },
      errors:  null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getDevices error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.getDeviceById = async (request, reply) => {
  const { id } = request.params;
  try {
    const device = await prisma.device.findUnique({
      where:   { id },
      include: {
        brand:    true,
        type:     true,
        site:     { include: { company: true } },
        mappings: true,
        alarms:   { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!device) {
      return reply.code(404).send({
        success: false, message: 'Device tidak ditemukan.',
        data: null, meta: null, errors: { id: 'Device tidak ditemukan.' },
      });
    }

    return reply.code(200).send({
      success: true, message: 'Data device berhasil dimuat.',
      data: device, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: id }, 'getDeviceById error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.createDevice = async (request, reply) => {
  const { siteId, brandId, typeId, serialNumber, modelName } = request.body ?? {};

  const errors = {};
  if (!siteId)       errors.siteId       = 'Site ID wajib diisi.';
  if (!brandId)      errors.brandId      = 'Brand ID wajib diisi.';
  if (!typeId)       errors.typeId       = 'Type ID wajib diisi.';
  if (!serialNumber) errors.serialNumber = 'Serial number wajib diisi.';

  if (Object.keys(errors).length > 0) {
    return reply.code(400).send({
      success: false, message: 'Validasi gagal.',
      data: null, meta: null, errors,
    });
  }

  try {
    const device = await prisma.device.create({
      data: { siteId, brandId, typeId, serialNumber, modelName, status: 'OFFLINE' },
    });

    request.log.info({ deviceId: device.id }, 'Device baru dibuat');

    return reply.code(201).send({
      success: true, message: 'Device berhasil dibuat.',
      data: device, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'createDevice error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.updateDevice = async (request, reply) => {
  const { id } = request.params;
  const { siteId, brandId, typeId, serialNumber, modelName, status } = request.body ?? {};

  try {
    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(siteId !== undefined && { siteId }),
        ...(brandId !== undefined && { brandId }),
        ...(typeId !== undefined && { typeId }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(modelName !== undefined && { modelName }),
        ...(status !== undefined && { status }),
      },
    });

    return reply.code(200).send({
      success: true, message: 'Device berhasil diperbarui.',
      data: device, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: id }, 'updateDevice error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.deleteDevice = async (request, reply) => {
  const { id } = request.params;

  try {
    await prisma.device.delete({ where: { id } });
    return reply.code(200).send({
      success: true, message: 'Device berhasil dihapus.',
      data: null, meta: null, errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: id }, 'deleteDevice error');
    return reply.code(500).send({
      success: false, message: 'Terjadi kesalahan pada server.',
      data: null, meta: null, errors: { server: 'Silakan coba lagi nanti.' },
    });
  }
};

exports.getDeviceBrands = async (request, reply) => {
  try {
    const brands = await prisma.deviceBrand.findMany({ orderBy: { name: 'asc' } });
    return reply.code(200).send({ success: true, data: brands, meta: { total: brands.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getDeviceTypes = async (request, reply) => {
  try {
    const types = await prisma.deviceType.findMany({ orderBy: { name: 'asc' } });
    return reply.code(200).send({ success: true, data: types, meta: { total: types.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};
