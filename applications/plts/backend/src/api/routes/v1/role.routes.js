const roleController = require('../../controllers/role.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

const roleBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
  },
};

async function roleRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Roles'], summary: 'Daftar role', response: { 200: envelope({ type: 'array', items: { $ref: 'Role#' } }), ...commonErrors } },
  }, roleController.getRoles);

  fastify.get('/:id', {
    schema: { tags: ['Roles'], summary: 'Detail role', params: uuidParam(), response: { 200: envelope({ $ref: 'Role#' }), ...commonErrors } },
  }, roleController.getRoleById);

  fastify.post('/', {
    schema: { tags: ['Roles'], summary: 'Buat role', body: roleBody, response: { 201: envelope({ $ref: 'Role#' }), ...commonErrors } },
  }, roleController.createRole);

  fastify.put('/:id', {
    schema: { tags: ['Roles'], summary: 'Update role', params: uuidParam(), body: roleBody, response: { 200: envelope({ $ref: 'Role#' }), ...commonErrors } },
  }, roleController.updateRole);

  fastify.delete('/:id', {
    schema: { tags: ['Roles'], summary: 'Hapus role', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, roleController.deleteRole);

  fastify.get('/:id/permissions', {
    schema: { tags: ['Roles'], summary: 'Permissions role', params: uuidParam(), response: { 200: envelope({ type: 'array', items: { $ref: 'Permission#' } }), ...commonErrors } },
  }, roleController.getRolePermissions);

  fastify.put('/:id/permissions', {
    schema: { tags: ['Roles'], summary: 'Update permissions role', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, roleController.updateRolePermissions);
}

module.exports = roleRoutes;
