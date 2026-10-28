'use strict';

/**
 * Schema bersama untuk dokumentasi OpenAPI (Swagger) via @fastify/swagger.
 *
 * Semua route di src/api/routes/v1 memakai helper di sini agar konsisten:
 * envelope response `{ success, data, meta, errors }`, error standar, param UUID,
 * dan querystring pagination.
 *
 * Format mengikuti Fastify JSON Schema (diterjemahkan @fastify/swagger ke OpenAPI 3).
 */

// ─── Response envelope ──────────────────────────────────────────────────────────
// Bungkus `data` dengan envelope standar { success, data, meta, errors }.
//
// PENTING: `additionalProperties: true` WAJIB ada. Fastify memakai response schema
// untuk SERIALISASI (fast-json-stringify), bukan sekadar dokumentasi. Tanpa
// additionalProperties, field yang tidak dideklarasikan (mis. `message`) akan
// DIBUANG dari response asli.
const envelope = (dataSchema) => {
  // Fastify memakai response schema untuk SERIALISASI. Sebuah data schema
  // `{ type: 'object' }` tanpa additionalProperties akan diserialisasi menjadi
  // `{}` (semua field dibuang). Paksa object data menjadi permissive.
  let ds = dataSchema;
  if (ds && typeof ds === 'object' && ds.type === 'object' && ds.additionalProperties === undefined) {
    ds = { ...ds, additionalProperties: true };
  }

  return {
    type: 'object',
    description: 'Successful response',
    additionalProperties: true,
    properties: {
      success: { type: 'boolean' },
      data: ds,
      meta: {
        type: ['object', 'null'],
        additionalProperties: true,
      },
      errors: {
        type: ['object', 'null'],
        additionalProperties: true,
      },
    },
  };
};

// Envelope untuk response yang tidak mengembalikan data (data: null).
const emptyEnvelope = envelope({ type: 'null' });

// ─── Schema error standar ───────────────────────────────────────────────────────
// NOTE: `additionalProperties: true` WAJIB di top-level agar fast-json-stringify
// tidak membuang field response asli (mis. `message`, `data`, `meta`).
const _err = (description) => ({
  type: 'object',
  description,
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: { type: ['object', 'null'] },
    meta: { type: ['object', 'null'] },
    errors: { type: ['object', 'null'], additionalProperties: true },
  },
});

const errorResponse = {
  400: _err('Bad Request — validasi input gagal'),
  401: _err('Unauthorized — token hilang/kedaluwarsa'),
  403: _err('Forbidden — tidak punya izin'),
  404: _err('Not Found — resource tidak ditemukan'),
  409: _err('Conflict — bentrok data (mis. duplikat unik)'),
  500: _err('Internal Server Error'),
};

// Gabungan error umum (400 + 404 + 500). Tambah 401/403/409 di route yang relevan.
const commonErrors = {
  400: errorResponse[400],
  404: errorResponse[404],
  500: errorResponse[500],
};

const crudErrors = {
  400: errorResponse[400],
  401: errorResponse[401],
  403: errorResponse[403],
  404: errorResponse[404],
  409: errorResponse[409],
  500: errorResponse[500],
};

// ─── Param & querystring ────────────────────────────────────────────────────────
// Param path UUID (Prisma @db.Uuid).
const uuidParam = (name = 'id', description = 'UUID resource') => ({
  type: 'object',
  properties: {
    [name]: { type: 'string', description, format: 'uuid' },
  },
  required: [name],
});

// Querystring pagination umum (page/limit).
const paginationQuery = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1, description: 'Nomor halaman' },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50, description: 'Jumlah item per halaman' },
  },
};

// ─── Meta pagination ────────────────────────────────────────────────────────────
const paginationMeta = {
  type: 'object',
  properties: {
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
};

module.exports = {
  envelope,
  emptyEnvelope,
  errorResponse,
  commonErrors,
  crudErrors,
  uuidParam,
  paginationQuery,
  paginationMeta,
};
