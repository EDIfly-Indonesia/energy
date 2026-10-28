'use strict';
const prisma = require('../../config/database');

exports.getCompanies = async (request, reply) => {
  try {
    const companies = await prisma.company.findMany({
      include: { tenant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.code(200).send({ success: true, data: companies, meta: { total: companies.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getCompanyById = async (request, reply) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: request.params.id },
      include: { tenant: true, sites: true },
    });
    if (!company) return reply.code(404).send({ success: false, message: 'Company tidak ditemukan.' });
    return reply.code(200).send({ success: true, data: company });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createCompany = async (request, reply) => {
  const { tenantId, name } = request.body ?? {};
  if (!tenantId || !name) {
    return reply.code(400).send({ success: false, message: 'Validasi gagal.', errors: {
      ...(!tenantId && { tenantId: 'Tenant ID wajib diisi.' }),
      ...(!name && { name: 'Nama company wajib diisi.' }),
    }});
  }
  try {
    const company = await prisma.company.create({ data: { tenantId, name } });
    return reply.code(201).send({ success: true, data: company });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateCompany = async (request, reply) => {
  const { id } = request.params;
  const { name, tenantId } = request.body ?? {};
  try {
    const company = await prisma.company.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(tenantId !== undefined && { tenantId }) },
    });
    return reply.code(200).send({ success: true, data: company });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteCompany = async (request, reply) => {
  try {
    await prisma.company.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'Company berhasil dihapus.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};