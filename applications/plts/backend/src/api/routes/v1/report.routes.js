const reportController = require('../../controllers/report.controller');
const { envelope, commonErrors } = require('../../schemas/common');

async function reportRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Reports'], summary: 'Daftar laporan', response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, reportController.getReports);

  fastify.get('/energy', {
    schema: { tags: ['Reports'], summary: 'Laporan energi', response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, reportController.getEnergyReport);

  fastify.get('/export', {
    schema: { tags: ['Reports'], summary: 'Ekspor laporan energi', response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, reportController.exportEnergyReport);
}

module.exports = reportRoutes;
