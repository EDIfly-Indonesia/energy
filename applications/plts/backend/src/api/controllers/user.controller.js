'use strict';

const prisma = require('../../config/database');

exports.getUsers = async (request, reply) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, isActive: true,
        roleId: true, tenantId: true, lastLogin: true, createdAt: true, updatedAt: true,
        role: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.code(200).send({ success: true, data: users, meta: { total: users.length } });
  } catch (error) {
    request.log.error({ err: error }, 'getUsers error');
    return reply.code(500).send({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
};

exports.getUserById = async (request, reply) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true, name: true, email: true, isActive: true,
        roleId: true, tenantId: true, lastLogin: true, createdAt: true, updatedAt: true,
        role: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
        permissions: { include: { permission: true } },
      },
    });
    if (!user) return reply.code(404).send({ success: false, message: 'User tidak ditemukan.' });
    return reply.code(200).send({ success: true, data: user });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createUser = async (request, reply) => {
  const { name, email, password, roleId, tenantId } = request.body ?? {};
  if (!name || !email || !password) {
    return reply.code(400).send({ success: false, message: 'Validasi gagal.', errors: {
      ...(!name && { name: 'Nama wajib diisi.' }),
      ...(!email && { email: 'Email wajib diisi.' }),
      ...(!password && { password: 'Password wajib diisi.' }),
    }});
  }
  try {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, roleId, tenantId, isActive: true },
    });
    return reply.code(201).send({ success: true, data: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    if (error.code === 'P2002') {
      return reply.code(409).send({ success: false, message: 'Email sudah terdaftar.' });
    }
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateUser = async (request, reply) => {
  const { id } = request.params;
  const { name, email, roleId, tenantId, isActive } = request.body ?? {};
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(roleId !== undefined && { roleId }),
        ...(tenantId !== undefined && { tenantId }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return reply.code(200).send({ success: true, data: user });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteUser = async (request, reply) => {
  try {
    await prisma.user.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'User berhasil dihapus.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getUserPermissions = async (request, reply) => {
  try {
    const permissions = await prisma.userPermission.findMany({
      where: { userId: request.params.id },
      include: { permission: true },
    });
    return reply.code(200).send({ success: true, data: permissions });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateUserPermissions = async (request, reply) => {
  const { id } = request.params;
  const { permissions } = request.body ?? {};
  try {
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    if (permissions && permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map(p => ({ userId: id, permissionId: p.permissionId })),
      });
    }
    return reply.code(200).send({ success: true, message: 'Permissions berhasil diperbarui.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};