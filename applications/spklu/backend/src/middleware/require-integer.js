'use strict';

/**
 * Menolak field yang HARUS integer bila klien mengirim string/boolean/desimal.
 *
 * Kenapa tidak cukup `type: 'integer'` di schema: Fastify memakai AJV dengan
 * `coerceTypes: 'array'` (lihat @fastify/ajv-compiler/lib/default-ajv-options.js),
 * sehingga `"10"` dan `true` DIPAKSA menjadi angka sebelum validasi berjalan.
 * Satu-satunya hook yang masih melihat tipe asli dari JSON adalah preValidation.
 *
 * Hook WAJIB async: hook non-async yang mengembalikan undefined dianggap
 * callback-style dan tidak pernah memanggil done, sehingga request menggantung
 * tanpa respons dan tanpa jejak di log.
 *
 * null/undefined dianggap "tidak dikirim" (pakai default controller), karena
 * Flutter lazim menyerialkan field opsional yang kosong sebagai null.
 */
function requireInteger(...fields) {
  return async function requireIntegerHook(request, reply) {
    const body = request.body;
    if (!body || typeof body !== 'object') return;

    for (const field of fields) {
      const v = body[field];
      if (v === undefined || v === null) continue;
      if (typeof v === 'number' && Number.isInteger(v)) continue;

      const kind = typeof v === 'string' ? 'string' : typeof v === 'boolean' ? 'boolean' : 'desimal';
      return reply.code(400).send({
        success: false,
        message: `Permintaan tidak valid — ${field}: harus bilangan bulat (integer), bukan ${kind}.`,
        data: null,
      });
    }
  };
}

module.exports = { requireInteger };
