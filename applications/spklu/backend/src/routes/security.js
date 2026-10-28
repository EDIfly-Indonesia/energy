'use strict';

/**
 * OpenAPI security references (dokumentasi Swagger — SEC-09 lanjutan).
 * Nama scheme di sini HARUS sama dengan kunci `components.securitySchemes`
 * di server.js (blok swagger). Pakai di route `schema.security` supaya
 * Swagger UI menampilkan ikon gembok + tombol "Authorize" dan tester bisa
 * mengisi kredensialnya.
 */

// Bearer JWT — token mobile (`mobileTokenAuth`) & token admin (`adminAuth`+`requireRole`).
const BEARER = [{ bearerAuth: [] }];
// Header `key-header` — endpoint mobile pra-login (`mobileKeyAuth`).
const KEY = [{ keyHeader: [] }];

module.exports = { BEARER, KEY };
