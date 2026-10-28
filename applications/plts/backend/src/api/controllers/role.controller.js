'use strict';
const prisma = require('../../config/database');

exports.getRoles = async (request, reply) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    return reply.code(200).send({ success: true, data: roles, meta: { total: roles.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getRoleById = async (request, reply) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: request.params.id } });
    if (!role) return reply.code(404).send({ success: false, message: 'Role tidak ditemukan.' });
    return reply.code(200).send({ success: true, data: role });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createRole = async (request, reply) => {
  const { name, description } = request.body ?? {};
  if (!name) return reply.code(400).send({ success: false, message: 'Nama role wajib diisi.' });
  try {
    const role = await prisma.role.create({ data: { name, description } });
    return reply.code(201).send({ success: true, data: role });
  } catch (error) {
    if (error.code === 'P2002') return reply.code(409).send({ success: false, message: 'Role sudah ada.' });
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateRole = async (request, reply) => {
  const { id } = request.params;
  const { name, description } = request.body ?? {};
  try {
    const role = await prisma.role.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }) },
    });
    return reply.code(200).send({ success: true, data: role });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteRole = async (request, reply) => {
  try {
    await prisma.role.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'Role berhasil dihapus.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getRolePermissions = async (request, reply) => {
  try {
    const permissions = await prisma.permission.findMany();
    return reply.code(200).send({ success: true, data: permissions });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateRolePermissions = async (request, reply) => {
  return reply.code(501).send({ success: true, message: 'Role-based permissions not yet implemented on backend. Use user permissions instead.' });
};