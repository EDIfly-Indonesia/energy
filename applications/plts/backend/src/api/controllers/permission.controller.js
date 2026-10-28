'use strict';
const prisma = require('../../config/database');

exports.getPermissions = async (request, reply) => {
  try {
    const permissions = await prisma.permission.findMany();
    return reply.code(200).send({ success: true, data: permissions, meta: { total: permissions.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getModulePermissions = async (request, reply) => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { module: request.params.module },
    });
    return reply.code(200).send({ success: true, data: permissions });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};