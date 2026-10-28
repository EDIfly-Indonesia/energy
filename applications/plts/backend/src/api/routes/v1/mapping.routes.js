const mappingController = require('../../controllers/mapping.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

async function mappingRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Mappings'], summary: 'Daftar mapping telemetry', response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, mappingController.getMappings);

  fastify.get('/device/:deviceId', {
    schema: { tags: ['Mappings'], summary: 'Mapping per device', params: uuidParam('deviceId', 'UUID device'), response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, mappingController.getMappingsByDevice);

  fastify.get('/:id', {
    schema: { tags: ['Mappings'], summary: 'Detail mapping', params: uuidParam(), response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, mappingController.getMappingById);

  fastify.post('/', {
    schema: { tags: ['Mappings'], summary: 'Buat mapping', response: { 201: envelope({ type: 'object' }), ...commonErrors } },
  }, mappingController.createMapping);

  fastify.put('/:id', {
    schema: { tags: ['Mappings'], summary: 'Update mapping', params: uuidParam(), response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, mappingController.updateMapping);

  fastify.delete('/:id', {
    schema: { tags: ['Mappings'], summary: 'Hapus mapping', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, mappingController.deleteMapping);
}

module.exports = mappingRoutes;
