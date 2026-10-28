'use strict';
const prisma = require('../../config/database');

exports.getMappings = async (request, reply) => {
  try {
    const mappings = await prisma.telemetryMapping.findMany({
      include: { device: { select: { id: true, serialNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.code(200).send({ success: true, data: mappings, meta: { total: mappings.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getMappingById = async (request, reply) => {
  try {
    const mapping = await prisma.telemetryMapping.findUnique({
      where: { id: request.params.id },
      include: { device: true },
    });
    if (!mapping) return reply.code(404).send({ success: false, message: 'Mapping tidak ditemukan.' });
    return reply.code(200).send({ success: true, data: mapping });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createMapping = async (request, reply) => {
  const { deviceId, vendorKey, standardKey, dataType } = request.body ?? {};
  if (!deviceId || !vendorKey || !standardKey) {
    return reply.code(400).send({ success: false, message: 'Validasi gagal.', errors: {
      ...(!deviceId && { deviceId: 'Device ID wajib diisi.' }),
      ...(!vendorKey && { vendorKey: 'Vendor Key wajib diisi.' }),
      ...(!standardKey && { standardKey: 'Standard Key wajib diisi.' }),
    }});
  }
  try {
    const mapping = await prisma.telemetryMapping.create({
      data: { deviceId, vendorKey, standardKey, dataType: dataType || 'FLOAT' },
    });
    return reply.code(201).send({ success: true, data: mapping });
  } catch (error) {
    if (error.code === 'P2002') {
      return reply.code(409).send({ success: false, message: 'Vendor key sudah ada untuk device ini.' });
    }
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateMapping = async (request, reply) => {
  const { id } = request.params;
  const { vendorKey, standardKey, dataType } = request.body ?? {};
  try {
    const mapping = await prisma.telemetryMapping.update({
      where: { id },
      data: {
        ...(vendorKey !== undefined && { vendorKey }),
        ...(standardKey !== undefined && { standardKey }),
        ...(dataType !== undefined && { dataType }),
      },
    });
    return reply.code(200).send({ success: true, data: mapping });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteMapping = async (request, reply) => {
  try {
    await prisma.telemetryMapping.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'Mapping berhasil dihapus.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getMappingsByDevice = async (request, reply) => {
  try {
    const mappings = await prisma.telemetryMapping.findMany({
      where: { deviceId: request.params.deviceId },
      include: { device: { select: { id: true, serialNumber: true } } },
    });
    return reply.code(200).send({ success: true, data: mappings });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};