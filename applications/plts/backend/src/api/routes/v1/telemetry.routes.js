const telemetryController = require('../../controllers/telemetry.controller');
const { envelope, commonErrors, uuidParam } = require('../../schemas/common');

const errorCodesResponse = {
  type: 'object',
  description: 'Successful response',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    data: { type: 'array', items: { $ref: 'ErrorCode#' } },
    meta: { type: ['object', 'null'] },
    errors: { type: ['object', 'null'] },
  },
};

const realtimeSummaryDevice = {
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string', format: 'uuid' },
    serialNumber: { type: 'string' },
    modelName: { type: 'string', nullable: true },
    status: { type: 'string' },
    siteName: { type: 'string', nullable: true },
    errorCode: { type: 'string', nullable: true, description: 'Kode error standar (E-/W-/I-)' },
    errorLabel: { type: 'string', nullable: true, description: 'Deskripsi error (lookup tbl_error_codes)' },
    errorSeverity: { type: 'string', nullable: true },
    realtime: {
      type: 'object',
      additionalProperties: true,
      properties: {
        power: { type: 'object', nullable: true },
        voltage: { type: 'object', nullable: true },
        current: { type: 'object', nullable: true, description: 'Field i_ac / i_dc' },
        temperature: { type: 'object', nullable: true, description: 'Field t_inv / t_env' },
        frequency: { type: 'object', nullable: true, description: 'Field f_ac' },
        battery: { type: 'object', nullable: true },
        energy: { type: 'object', nullable: true },
        efficiency: { type: 'number', nullable: true, description: 'Efisiensi (%) dari measurement `others`' },
        cosPhi: { type: 'number', nullable: true },
      },
    },
  },
};

const realtimeSummaryResponse = {
  type: 'object',
  description: 'Successful response',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        totalProduction: { type: 'string' },
        totalConsumption: { type: 'string' },
        gridExport: { type: 'string' },
        gridImport: { type: 'string' },
        batterySoc: { type: 'string' },
        onlineDevices: { type: 'integer' },
        totalDevices: { type: 'integer' },
        devices: { type: 'array', items: realtimeSummaryDevice },
      },
    },
    errors: { type: ['object', 'null'] },
  },
};

async function telemetryRoutes(fastify, options) {
  fastify.get('/', {
    schema: { tags: ['Telemetry'], summary: 'Daftar telemetry', response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, telemetryController.getTelemetry);

  fastify.get('/summary', {
    schema: { tags: ['Telemetry'], summary: 'Ringkasan telemetry', response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, telemetryController.getSummary);

  fastify.get('/device/:id', {
    schema: { tags: ['Telemetry'], summary: 'Telemetry per device', params: uuidParam(), response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, telemetryController.getDeviceTelemetry);

  fastify.get('/daily-summary', {
    schema: { tags: ['Telemetry'], summary: 'Ringkasan harian', response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, telemetryController.getDailySummary);

  fastify.get('/aggregates', {
    schema: { tags: ['Telemetry'], summary: 'Agregat telemetry', response: { 200: envelope({ type: 'array', items: { $ref: 'TelemetryAggregate#' } }), ...commonErrors } },
  }, telemetryController.getTelemetryAggregates);

  fastify.get('/aggregates/latest', {
    schema: { tags: ['Telemetry'], summary: 'Agregat terbaru', response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, telemetryController.getLatestAggregates);

  fastify.get('/aggregates/latest/:deviceId', {
    schema: { tags: ['Telemetry'], summary: 'Agregat terbaru per device', params: uuidParam('deviceId', 'UUID device'), response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, telemetryController.getLatestAggregatesByDevice);

  fastify.get('/data', {
    schema: { tags: ['Telemetry'], summary: 'Data telemetry mentah', response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, telemetryController.getTelemetryData);

  // Real-time endpoints
  fastify.get('/realtime/:deviceId', {
    schema: { tags: ['Telemetry'], summary: 'Realtime per device', params: uuidParam('deviceId', 'UUID device'), response: { 200: envelope({ type: 'object' }), ...commonErrors } },
  }, telemetryController.getRealtimeTelemetry);

  fastify.get('/realtime/summary', {
    schema: {
      tags: ['Telemetry'],
      summary: 'Ringkasan realtime semua device',
      description: 'Termasuk errorCode/errorLabel/errorSeverity (lookup tbl_error_codes) dan efficiency/cosPhi (measurement `others`).',
      response: { 200: realtimeSummaryResponse, 500: commonErrors[500] },
    },
  }, telemetryController.getRealtimeSummary);

  fastify.get('/realtime/timeseries/:deviceId', {
    schema: { tags: ['Telemetry'], summary: 'Time series realtime per device', params: uuidParam('deviceId', 'UUID device'), response: { 200: envelope({ type: 'array' }), ...commonErrors } },
  }, telemetryController.getRealtimeTimeSeries);

  // Error code lookup
  fastify.get('/error-codes', {
    schema: {
      tags: ['Telemetry'],
      summary: 'Lookup kode error standar',
      description: 'Mengembalikan daftar kode error dari tbl_error_codes. Filter opsional via querystring category/severity.',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Kategori (SYSTEM, GRID, INVERTER, PV, BATTERY, SENSOR, ENVIRONMENT, VENDOR)' },
          severity: { type: 'string', description: 'Severity (CRITICAL, MAJOR, WARNING, MINOR, INFO)' },
        },
      },
      response: { 200: errorCodesResponse, 500: commonErrors[500] },
    },
  }, telemetryController.getErrorCodes);
}

module.exports = telemetryRoutes;
