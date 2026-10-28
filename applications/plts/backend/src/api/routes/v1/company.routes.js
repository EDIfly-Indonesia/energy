const companyController = require('../../controllers/company.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

async function companyRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Companies'], summary: 'Daftar company', response: { 200: envelope({ type: 'array', items: { $ref: 'Company#' } }), ...commonErrors } },
  }, companyController.getCompanies);

  fastify.get('/:id', {
    schema: { tags: ['Companies'], summary: 'Detail company', params: uuidParam(), response: { 200: envelope({ $ref: 'Company#' }), ...commonErrors } },
  }, companyController.getCompanyById);

  fastify.post('/', {
    schema: { tags: ['Companies'], summary: 'Buat company', response: { 201: envelope({ $ref: 'Company#' }), ...commonErrors } },
  }, companyController.createCompany);

  fastify.put('/:id', {
    schema: { tags: ['Companies'], summary: 'Update company', params: uuidParam(), response: { 200: envelope({ $ref: 'Company#' }), ...commonErrors } },
  }, companyController.updateCompany);

  fastify.delete('/:id', {
    schema: { tags: ['Companies'], summary: 'Hapus company', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, companyController.deleteCompany);
}

module.exports = companyRoutes;
