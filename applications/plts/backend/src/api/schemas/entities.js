'use strict';

/**
 * Schema entitas (JSON Schema) — didaftarkan via fastify.addSchema() di app.js
 * agar muncul sebagai components.schemas di OpenAPI dan bisa direferensikan
 * dengan `{ $ref: 'Nama#' }` dari route.
 *
 * Field utama saja (bukan seluruh kolom DB) — cukup untuk dokumentasi API.
 */

const timestamps = {
  createdAt: { type: 'string', format: 'date-time', nullable: true },
  updatedAt: { type: 'string', format: 'date-time', nullable: true },
};

const entitySchemas = [
  {
    $id: 'User',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      isActive: { type: 'boolean' },
      roleId: { type: 'string', format: 'uuid', nullable: true },
      tenantId: { type: 'string', format: 'uuid', nullable: true },
      lastLogin: { type: 'string', format: 'date-time', nullable: true },
      role: { type: 'object', nullable: true },
      tenant: { type: 'object', nullable: true },
      ...timestamps,
    },
  },
  {
    $id: 'Role',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      ...timestamps,
    },
  },
  {
    $id: 'Permission',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      capability: { type: 'string' },
      module: { type: 'string' },
    },
  },
  {
    $id: 'Tenant',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string', nullable: true },
      name: { type: 'string' },
      type: { type: 'string' },
      isActive: { type: 'boolean' },
      ...timestamps,
    },
  },
  {
    $id: 'Company',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      isActive: { type: 'boolean' },
      ...timestamps,
    },
  },
  {
    $id: 'Site',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      siteCode: { type: 'string', nullable: true },
      name: { type: 'string' },
      capacityKwp: { type: 'number', nullable: true },
      latitude: { type: 'number', nullable: true },
      longitude: { type: 'number', nullable: true },
      timezone: { type: 'string' },
      ...timestamps,
    },
  },
  {
    $id: 'Device',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      siteId: { type: 'string', format: 'uuid' },
      serialNumber: { type: 'string' },
      modelName: { type: 'string', nullable: true },
      status: { type: 'string' },
      lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
      ...timestamps,
    },
  },
  {
    $id: 'Alarm',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      deviceId: { type: 'string', format: 'uuid' },
      errorCode: { type: 'string', nullable: true },
      severity: { type: 'string' },
      message: { type: 'string', nullable: true },
      resolvedAt: { type: 'string', format: 'date-time', nullable: true },
      device: { type: 'object', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  {
    $id: 'Rate',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string', nullable: true },
      name: { type: 'string' },
      rateType: { type: 'string', enum: ['FIXED', 'PEAK_OFF_PEAK'] },
      fixedAmount: { type: 'string', nullable: true, description: 'Decimal dalam string' },
      peakRate: { type: 'string', nullable: true },
      offPeakRate: { type: 'string', nullable: true },
      peakStartHour: { type: 'integer', nullable: true },
      peakEndHour: { type: 'integer', nullable: true },
      tenantId: { type: 'string', format: 'uuid', nullable: true },
      siteId: { type: 'string', format: 'uuid', nullable: true },
      isActive: { type: 'boolean' },
      description: { type: 'string', nullable: true },
      currency: { type: 'string' },
      effectiveFrom: { type: 'string', format: 'date-time' },
      effectiveTo: { type: 'string', format: 'date-time', nullable: true },
      ...timestamps,
    },
  },
  {
    $id: 'ErrorCode',
    type: 'object',
    properties: {
      code: { type: 'string' },
      category: { type: 'string' },
      severity: { type: 'string', enum: ['CRITICAL', 'MAJOR', 'WARNING', 'MINOR', 'INFO'] },
      descriptionId: { type: 'string' },
      descriptionEn: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
      ...timestamps,
    },
  },
  {
    $id: 'TelemetryAggregate',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      deviceId: { type: 'string', format: 'uuid' },
      standardKey: { type: 'string' },
      period: { type: 'string' },
      periodStart: { type: 'string', format: 'date-time' },
      periodEnd: { type: 'string', format: 'date-time' },
      minValue: { type: 'string', nullable: true },
      maxValue: { type: 'string', nullable: true },
      avgValue: { type: 'string', nullable: true },
      sumValue: { type: 'string', nullable: true },
      count: { type: 'integer' },
    },
  },
  {
    $id: 'Invoice',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      number: { type: 'string', nullable: true },
      status: { type: 'string', nullable: true },
      total: { type: 'string' },
      currency: { type: 'string', nullable: true },
      companyId: { type: 'string', format: 'uuid', nullable: true },
      tenantId: { type: 'string', format: 'uuid', nullable: true },
      billingPeriod: { type: 'string', nullable: true },
      peakStartHour: { type: 'integer', nullable: true },
      peakEndHour: { type: 'integer', nullable: true },
      ...timestamps,
    },
  },
];

module.exports = { entitySchemas };
