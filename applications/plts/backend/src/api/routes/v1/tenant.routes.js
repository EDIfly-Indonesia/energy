const tenantController = require('../../controllers/tenant.controller');
const { verifyToken, hasPermission } = require('../../middlewares/auth.middleware');
const { envelope, emptyEnvelope, crudErrors, uuidParam } = require('../../schemas/common');

const tenantBody = {
  type: 'object',
  properties: {
    code: { type: 'string', nullable: true },
    name: { type: 'string' },
    type: { type: 'string' },
    isActive: { type: 'boolean' },
  },
};

async function tenantRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [verifyToken, hasPermission('read', 'tenant')],
    schema: { tags: ['Tenants'], summary: 'Daftar tenant', security: [{ bearerAuth: [] }], response: { 200: envelope({ type: 'array', items: { $ref: 'Tenant#' } }), ...crudErrors } },
  }, tenantController.getTenants);

  fastify.get('/:id', {
    preHandler: [verifyToken, hasPermission('read', 'tenant')],
    schema: { tags: ['Tenants'], summary: 'Detail tenant', params: uuidParam(), security: [{ bearerAuth: [] }], response: { 200: envelope({ $ref: 'Tenant#' }), ...crudErrors } },
  }, tenantController.getTenantById);

  fastify.post('/', {
    preHandler: [verifyToken, hasPermission('create', 'tenant')],
    schema: { tags: ['Tenants'], summary: 'Buat tenant', body: tenantBody, security: [{ bearerAuth: [] }], response: { 201: envelope({ $ref: 'Tenant#' }), ...crudErrors } },
  }, tenantController.createTenant);

  fastify.put('/:id', {
    preHandler: [verifyToken, hasPermission('update', 'tenant')],
    schema: { tags: ['Tenants'], summary: 'Update tenant', params: uuidParam(), body: tenantBody, security: [{ bearerAuth: [] }], response: { 200: envelope({ $ref: 'Tenant#' }), ...crudErrors } },
  }, tenantController.updateTenant);

  fastify.delete('/:id', {
    preHandler: [verifyToken, hasPermission('delete', 'tenant')],
    schema: { tags: ['Tenants'], summary: 'Hapus tenant', params: uuidParam(), security: [{ bearerAuth: [] }], response: { 200: emptyEnvelope, ...crudErrors } },
  }, tenantController.deleteTenant);
}

module.exports = tenantRoutes;
