const deviceController = require('../../controllers/device.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

async function deviceRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Devices'], summary: 'Daftar device', response: { 200: envelope({ type: 'array', items: { $ref: 'Device#' } }), ...commonErrors } },
  }, deviceController.getDevices);

  fastify.get('/:id', {
    schema: { tags: ['Devices'], summary: 'Detail device', params: uuidParam(), response: { 200: envelope({ $ref: 'Device#' }), ...commonErrors } },
  }, deviceController.getDeviceById);

  fastify.post('/', {
    schema: { tags: ['Devices'], summary: 'Buat device', response: { 201: envelope({ $ref: 'Device#' }), ...commonErrors } },
  }, deviceController.createDevice);

  fastify.put('/:id', {
    schema: { tags: ['Devices'], summary: 'Update device', params: uuidParam(), response: { 200: envelope({ $ref: 'Device#' }), ...commonErrors } },
  }, deviceController.updateDevice);

  fastify.delete('/:id', {
    schema: { tags: ['Devices'], summary: 'Hapus device', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, deviceController.deleteDevice);
}

module.exports = deviceRoutes;
