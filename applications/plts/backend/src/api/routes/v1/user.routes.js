const userController = require('../../controllers/user.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

const userBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    roleId: { type: 'string', format: 'uuid', nullable: true },
    tenantId: { type: 'string', format: 'uuid', nullable: true },
    isActive: { type: 'boolean' },
  },
};

async function userRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Users'], summary: 'Daftar user', response: { 200: envelope({ type: 'array', items: { $ref: 'User#' } }), ...commonErrors } },
  }, userController.getUsers);

  fastify.get('/:id', {
    schema: { tags: ['Users'], summary: 'Detail user', params: uuidParam(), response: { 200: envelope({ $ref: 'User#' }), ...commonErrors } },
  }, userController.getUserById);

  fastify.post('/', {
    schema: { tags: ['Users'], summary: 'Buat user', body: userBody, response: { 201: envelope({ $ref: 'User#' }), ...commonErrors } },
  }, userController.createUser);

  fastify.put('/:id', {
    schema: { tags: ['Users'], summary: 'Update user', params: uuidParam(), body: userBody, response: { 200: envelope({ $ref: 'User#' }), ...commonErrors } },
  }, userController.updateUser);

  fastify.delete('/:id', {
    schema: { tags: ['Users'], summary: 'Hapus user', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, userController.deleteUser);

  fastify.get('/:id/permissions', {
    schema: { tags: ['Users'], summary: 'Permissions user', params: uuidParam(), response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, userController.getUserPermissions);

  fastify.put('/:id/permissions', {
    schema: {
      tags: ['Users'],
      summary: 'Update permissions user',
      params: uuidParam(),
      body: { type: 'object', properties: { permissions: { type: 'array', items: { type: 'object', properties: { permissionId: { type: 'string', format: 'uuid' } } } } } },
      response: { 200: emptyEnvelope, ...commonErrors },
    },
  }, userController.updateUserPermissions);
}

module.exports = userRoutes;
