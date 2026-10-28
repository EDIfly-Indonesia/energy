const rateController = require('../../controllers/rate.controller');
const { envelope, emptyEnvelope, crudErrors, uuidParam, paginationQuery, paginationMeta } = require('../../schemas/common');

// Body untuk create/update rate. Mendukung dua skenario:
//  - FIXED:           fixedAmount wajib; peak/off-peak tidak dipakai.
//  - PEAK_OFF_PEAK:   peakRate + offPeakRate wajib; jendela 17:00-22:00 (default).
const rateBody = {
  type: 'object',
  required: ['name'],
  properties: {
    code: { type: 'string', description: 'Kode unik rate (opsional)' },
    name: { type: 'string', description: 'Nama rate' },
    rateType: { type: 'string', enum: ['FIXED', 'PEAK_OFF_PEAK'], default: 'FIXED', description: 'Jenis tarif' },
    // Fixed
    fixedAmount: { type: 'number', description: 'Tarif tetap (wajib bila rateType=FIXED)' },
    // Peak/Off-Peak
    peakRate: { type: 'number', description: 'Tarif WBP (wajib bila rateType=PEAK_OFF_PEAK)' },
    offPeakRate: { type: 'number', description: 'Tarif LWBP (wajib bila rateType=PEAK_OFF_PEAK)' },
    peakStartHour: { type: 'integer', minimum: 0, maximum: 23, description: 'Jam mulai WBP (default 17)' },
    peakEndHour: { type: 'integer', minimum: 0, maximum: 23, description: 'Jam akhir WBP (default 22)' },
    // Scope & metadata
    tenantId: { type: 'string', format: 'uuid', nullable: true },
    siteId: { type: 'string', format: 'uuid', nullable: true },
    currency: { type: 'string', default: 'IDR' },
    description: { type: 'string', nullable: true },
    isActive: { type: 'boolean', default: true },
    effectiveFrom: { type: 'string', format: 'date-time', nullable: true },
    effectiveTo: { type: 'string', format: 'date-time', nullable: true },
  },
};

const rateResponse = envelope({ $ref: 'Rate#' });

const listResponse = {
  type: 'object',
  description: 'Successful response',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    data: { type: 'array', items: { $ref: 'Rate#' } },
    meta: paginationMeta,
    errors: { type: ['object', 'null'] },
  },
};

async function rateRoutes(fastify, options) {
  fastify.get('/', {
    schema: {
      tags: ['Rates'],
      summary: 'Daftar rate (paginated)',
      description: 'Mengembalikan daftar tarif. Mendukung FIXED dan PEAK_OFF_PEAK.',
      querystring: paginationQuery,
      response: { 200: listResponse, 500: crudErrors[500] },
    },
  }, rateController.getRates);

  fastify.get('/:id', {
    schema: {
      tags: ['Rates'],
      summary: 'Detail rate',
      params: uuidParam(),
      response: { 200: rateResponse, 404: crudErrors[404], 500: crudErrors[500] },
    },
  }, rateController.getRateById);

  fastify.post('/', {
    schema: {
      tags: ['Rates'],
      summary: 'Buat rate',
      description: 'Dua skenario: FIXED (fixedAmount) atau PEAK_OFF_PEAK (peakRate + offPeakRate).',
      body: rateBody,
      response: { 201: rateResponse, 400: crudErrors[400], 409: crudErrors[409], 500: crudErrors[500] },
    },
  }, rateController.createRate);

  fastify.put('/:id', {
    schema: {
      tags: ['Rates'],
      summary: 'Update rate',
      params: uuidParam(),
      body: rateBody,
      response: { 200: rateResponse, 400: crudErrors[400], 404: crudErrors[404], 500: crudErrors[500] },
    },
  }, rateController.updateRate);

  fastify.delete('/:id', {
    schema: {
      tags: ['Rates'],
      summary: 'Hapus rate',
      params: uuidParam(),
      response: { 200: emptyEnvelope, 404: crudErrors[404], 500: crudErrors[500] },
    },
  }, rateController.deleteRate);
}

module.exports = rateRoutes;
