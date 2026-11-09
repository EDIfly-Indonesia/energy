'use strict';

/**
 * Admin: konfigurasi payment gateway (t_payment_gateway).
 * Hanya role [1,2] (superadmin / admin). Secret tidak pernah disimpan atau
 * dikembalikan lewat endpoint ini — secret tetap di .env.
 */

const pg = require('../services/payment-gateway.service');

function gagal(reply, message) {
  return reply.send({ success: false, message, data: null });
}

function ok(reply, message, data) {
  return reply.send({ success: true, message, data });
}

async function list(request, reply) {
  try {
    const rows = await pg.list();
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[pg.list]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function detail(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID tidak valid');
  try {
    const row = await pg.get(id);
    if (!row) return gagal(reply, 'Gateway tidak ditemukan');
    return ok(reply, 'Berhasil', row);
  } catch (err) {
    console.error('[pg.detail]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function create(request, reply) {
  const b = request.body || {};
  const kode = String(b.kode_provider ?? '').trim().toLowerCase();
  const nama = String(b.nama_provider ?? '').trim();
  if (!kode || !nama) return gagal(reply, 'kode_provider dan nama_provider wajib diisi');
  if (kode.length > 30) return gagal(reply, 'kode_provider maks 30 karakter');
  if (!/^[a-z][a-z0-9_]*$/.test(kode)) return gagal(reply, 'kode_provider harus huruf kecil, angka, atau garis bawah (awalan huruf)');

  try {
    // Kode provider harus unik.
    const ada = await pg.getByKode(kode);
    if (ada) return gagal(reply, `Kode provider '${kode}' sudah ada`);

    const r = await pg.create({
      kode_provider: kode,
      nama_provider: nama,
      client_id: String(b.client_id ?? '').trim() || null,
      is_prod: b.is_prod === true,
      aktif: b.aktif === true,
      url_api: String(b.url_api ?? '').trim() || null,
      url_callback: String(b.url_callback ?? '').trim() || null,
      endpoint_va: String(b.endpoint_va ?? '').trim() || null,
      endpoint_qris: String(b.endpoint_qris ?? '').trim() || null,
      expired_menit: Number.isInteger(b.expired_menit) ? b.expired_menit : 20,
      metadata: b.metadata ?? null,
      keterangan: String(b.keterangan ?? '').trim() || null,
    }, request.admin?.id ?? null);

    return ok(reply, `Gateway '${r.kode_provider}' dibuat`, r);
  } catch (err) {
    console.error('[pg.create]', err);
    return gagal(reply, err.message || 'Gagal membuat gateway');
  }
}

async function update(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID tidak valid');

  const b = request.body || {};
  const kode = String(b.kode_provider ?? '').trim().toLowerCase();
  const nama = String(b.nama_provider ?? '').trim();
  if (!kode || !nama) return gagal(reply, 'kode_provider dan nama_provider wajib diisi');

  try {
    const existing = await pg.get(id);
    if (!existing) return gagal(reply, 'Gateway tidak ditemukan');

    // Kode provider tidak boleh bentrok dengan gateway lain.
    if (kode !== existing.kode_provider) {
      const lain = await pg.getByKode(kode);
      if (lain && lain.id_payment_gateway !== id) return gagal(reply, `Kode provider '${kode}' sudah dipakai gateway lain`);
    }

    const r = await pg.update(id, {
      kode_provider: kode,
      nama_provider: nama,
      client_id: String(b.client_id ?? '').trim() || null,
      is_prod: b.is_prod === true,
      aktif: b.aktif === true,
      url_api: String(b.url_api ?? '').trim() || null,
      url_callback: String(b.url_callback ?? '').trim() || null,
      endpoint_va: String(b.endpoint_va ?? '').trim() || null,
      endpoint_qris: String(b.endpoint_qris ?? '').trim() || null,
      expired_menit: Number.isInteger(b.expired_menit) ? b.expired_menit : 20,
      metadata: b.metadata ?? null,
      keterangan: String(b.keterangan ?? '').trim() || null,
    }, request.admin?.id ?? null);

    return ok(reply, `Gateway '${r.kode_provider}' diperbarui`, r);
  } catch (err) {
    console.error('[pg.update]', err);
    return gagal(reply, err.message || 'Gagal memperbarui gateway');
  }
}

async function toggle(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID tidak valid');

  try {
    const existing = await pg.get(id);
    if (!existing) return gagal(reply, 'Gateway tidak ditemukan');

    const r = await pg.aktifkan(id, request.admin?.id ?? null);
    return ok(reply, `Gateway '${r.kode_provider}' diaktifkan (gateway lain dinonaktifkan)`, r);
  } catch (err) {
    console.error('[pg.toggle]', err);
    return gagal(reply, err.message || 'Gagal mengaktifkan gateway');
  }
}

async function remove(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID tidak valid');

  try {
    const existing = await pg.get(id);
    if (!existing) return gagal(reply, 'Gateway tidak ditemukan');

    if (existing.aktif) return gagal(reply, 'Tidak bisa menghapus gateway yang sedang aktif. Aktifkan gateway lain terlebih dahulu.');

    const berhasil = await pg.remove(id);
    if (!berhasil) return gagal(reply, 'Gagal menghapus gateway');
    return ok(reply, `Gateway '${existing.kode_provider}' dihapus`, null);
  } catch (err) {
    console.error('[pg.remove]', err);
    return gagal(reply, err.message || 'Gagal menghapus gateway');
  }
}

module.exports = { list, detail, create, update, toggle, remove };
