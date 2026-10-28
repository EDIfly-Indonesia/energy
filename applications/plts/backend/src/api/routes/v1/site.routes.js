const siteController = require('../../controllers/site.controller');
const { envelope, commonErrors, uuidParam } = require('../../schemas/common');

async function siteRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Sites'], summary: 'Daftar site', response: { 200: envelope({ type: 'array', items: { $ref: 'Site#' } }), ...commonErrors } },
  }, siteController.getSites);

  fastify.get('/:id', {
    schema: { tags: ['Sites'], summary: 'Detail site', params: uuidParam(), response: { 200: envelope({ $ref: 'Site#' }), ...commonErrors } },
  }, siteController.getSiteById);

  fastify.post('/', {
    schema: { tags: ['Sites'], summary: 'Buat site', response: { 201: envelope({ $ref: 'Site#' }), ...commonErrors } },
  }, siteController.createSite);
}

module.exports = siteRoutes;
