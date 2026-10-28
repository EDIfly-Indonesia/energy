const alarmController = require('../../controllers/alarm.controller');
const { envelope, emptyEnvelope, commonErrors, uuidParam } = require('../../schemas/common');

const listResponse = {
  type: 'object',
  description: 'Successful response',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    data: { type: 'array', items: { $ref: 'Alarm#' } },
    meta: { type: ['object', 'null'] },
    errors: { type: ['object', 'null'] },
  },
};

const alarmBody = {
  type: 'object',
  properties: {
    deviceId: { type: 'string', format: 'uuid' },
    errorCode: { type: 'string', nullable: true },
    severity: { type: 'string' },
    message: { type: 'string', nullable: true },
    resolvedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

async function alarmRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Alarms'], summary: 'Daftar alarm (termasuk offline sintetis)', response: { 200: listResponse, ...commonErrors } },
  }, alarmController.getAlarms);

  fastify.get('/:id', {
    schema: { tags: ['Alarms'], summary: 'Detail alarm', params: uuidParam(), response: { 200: envelope({ $ref: 'Alarm#' }), ...commonErrors } },
  }, alarmController.getAlarmById);

  fastify.post('/', {
    schema: { tags: ['Alarms'], summary: 'Buat alarm', body: alarmBody, response: { 201: envelope({ $ref: 'Alarm#' }), ...commonErrors } },
  }, alarmController.createAlarm);

  fastify.put('/:id', {
    schema: { tags: ['Alarms'], summary: 'Update alarm', params: uuidParam(), body: alarmBody, response: { 200: envelope({ $ref: 'Alarm#' }), ...commonErrors } },
  }, alarmController.updateAlarm);

  fastify.delete('/:id', {
    schema: { tags: ['Alarms'], summary: 'Hapus alarm', params: uuidParam(), response: { 200: emptyEnvelope, ...commonErrors } },
  }, alarmController.deleteAlarm);

  fastify.get('/resolved/list', {
    schema: { tags: ['Alarms'], summary: 'Daftar alarm resolved', response: { 200: listResponse, ...commonErrors } },
  }, alarmController.getResolvedAlarms);

  fastify.post('/:id/resolve', {
    schema: { tags: ['Alarms'], summary: 'Tandai alarm resolved', params: uuidParam(), response: { 200: envelope({ $ref: 'Alarm#' }), ...commonErrors } },
  }, alarmController.resolveAlarm);
}

module.exports = alarmRoutes;
