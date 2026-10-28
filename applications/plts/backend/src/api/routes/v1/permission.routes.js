const permissionController = require('../../controllers/permission.controller');
const { envelope, commonErrors } = require('../../schemas/common');

async function permissionRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Permissions'], summary: 'Daftar permission', response: { 200: envelope({ type: 'array', items: { $ref: 'Permission#' } }), ...commonErrors } },
  }, permissionController.getPermissions);

  fastify.get('/module/:module', {
    schema: {
      tags: ['Permissions'],
      summary: 'Permissions per modul',
      params: { type: 'object', properties: { module: { type: 'string' } }, required: ['module'] },
      response: { 200: envelope({ type: 'array', items: { $ref: 'Permission#' } }), ...commonErrors },
    },
  }, permissionController.getModulePermissions);
}

module.exports = permissionRoutes;
