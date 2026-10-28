const invoiceController = require('../../controllers/invoice.controller');
const { verifyToken, hasPermission } = require('../../middlewares/auth.middleware');
const { envelope, emptyEnvelope, crudErrors, uuidParam } = require('../../schemas/common');

async function invoiceRoutes(fastify, options) {
  fastify.get('/', {
    preHandler: [verifyToken, hasPermission('read', 'invoice')],
    schema: { tags: ['Invoices'], summary: 'Daftar invoice', security: [{ bearerAuth: [] }], response: { 200: envelope({ type: 'array', items: { $ref: 'Invoice#' } }), ...crudErrors } },
  }, invoiceController.getInvoices);

  fastify.post('/generate', {
    preHandler: [verifyToken, hasPermission('create', 'invoice')],
    schema: {
      tags: ['Invoices'],
      summary: 'Generate invoice bulanan dari data pemakaian',
      description: 'Hitung energi bulanan tenant dan buat invoice. FIXED -> total konsumsi × fixedAmount; PEAK_OFF_PEAK -> energi WBP/LWBP × tarif masing-masing.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['tenantId', 'month'],
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          month: { type: 'string', description: 'Format YYYY-MM' },
          rateId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      response: { 201: envelope({ $ref: 'Invoice#' }), 400: crudErrors[400], 404: crudErrors[404], 500: crudErrors[500] },
    },
  }, invoiceController.generateInvoice);

  fastify.get('/:id/usage', {
    preHandler: [verifyToken, hasPermission('read', 'invoice')],
    schema: {
      tags: ['Invoices'],
      summary: 'Rincian pemakaian harian invoice',
      description: 'Breakdown konsumsi per tanggal (default) atau per site (groupBy=site) untuk billing_period invoice.',
      security: [{ bearerAuth: [] }],
      params: uuidParam(),
      querystring: {
        type: 'object',
        properties: {
          groupBy: { type: 'string', enum: ['date', 'site'], default: 'date' },
        },
      },
      response: { 200: envelope({ type: 'object' }), 400: crudErrors[400], 404: crudErrors[404], 500: crudErrors[500] },
    },
  }, invoiceController.getInvoiceUsage);

  fastify.get('/:id', {
    preHandler: [verifyToken, hasPermission('read', 'invoice')],
    schema: { tags: ['Invoices'], summary: 'Detail invoice', params: uuidParam(), security: [{ bearerAuth: [] }], response: { 200: envelope({ $ref: 'Invoice#' }), ...crudErrors } },
  }, invoiceController.getInvoiceById);

  fastify.post('/', {
    preHandler: [verifyToken, hasPermission('create', 'invoice')],
    schema: { tags: ['Invoices'], summary: 'Buat invoice', security: [{ bearerAuth: [] }], response: { 201: envelope({ $ref: 'Invoice#' }), ...crudErrors } },
  }, invoiceController.createInvoice);

  fastify.put('/:id', {
    preHandler: [verifyToken, hasPermission('update', 'invoice')],
    schema: { tags: ['Invoices'], summary: 'Update invoice', params: uuidParam(), security: [{ bearerAuth: [] }], response: { 200: envelope({ $ref: 'Invoice#' }), ...crudErrors } },
  }, invoiceController.updateInvoice);

  fastify.delete('/:id', {
    preHandler: [verifyToken, hasPermission('delete', 'invoice')],
    schema: { tags: ['Invoices'], summary: 'Hapus invoice', params: uuidParam(), security: [{ bearerAuth: [] }], response: { 200: emptyEnvelope, ...crudErrors } },
  }, invoiceController.deleteInvoice);
}

module.exports = invoiceRoutes;
