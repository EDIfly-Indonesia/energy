'use strict';

/**
 * Admin CRUD master biaya (t_biaya) — biaya TAMBAHAN (additive) yang dipakai
 * fn_biaya_transaksi: 'admin_platform' + 'layanan_normal'|'layanan_fast'|
 * 'layanan_ultra_fast'.
 *
 * Aturan (KEPUTUSAN-BIAYA-CHARGE.md §6):
 *   - id_mitra 0 = global (berlaku semua mitra); selain 0 = khusus mitra itu.
 *   - Pajak (PPN, PBJT-TL) TIDAK boleh masuk tabel ini.
 *   - kode_biaya adalah kunci stabil; nama_biaya hanya label tampilan.
 *
 * Override nominal per scope ada di t_besar_biaya (belum diekspos di UI).
 */

const db = require('../services/database.service');
const { query } = db;

const JENIS_BIYA = ['pertransaksi', 'perkwh', 'perjam'];

// Kode yang dipakai mesin hitung — boleh diubah nominalnya, tapi jangan dihapus.
const KODE_SISTEM = ['admin_platform', 'layanan_normal', 'layanan_fast', 'layanan_ultra_fast'];

function gagal(reply, message) {
  return reply.send({ success: false, message, data: null });
}

function validasi(b) {
  const kode = String(b.kode_biaya ?? '').trim().toLowerCase();
  if (!kode) return { ok: false, message: 'Kode biaya wajib diisi' };
  if (!/^[a-z0-9_]+$/.test(kode)) {
    return { ok: false, message: 'Kode biaya hanya boleh huruf kecil, angka, dan garis bawah' };
  }
  if (kode.length > 50) return { ok: false, message: 'Kode biaya maksimal 50 karakter' };

  const nama = String(b.nama_biaya ?? '').trim();
  if (!nama) return { ok: false, message: 'Nama biaya wajib diisi' };

  const jenis = String(b.jenis_biaya ?? 'pertransaksi').trim();
  if (!JENIS_BIYA.includes(jenis)) {
    return { ok: false, message: `Jenis biaya tidak valid. Pilihan: ${JENIS_BIYA.join(', ')}` };
  }

  const nominal = Number(b.default_biaya ?? 0);
  if (!Number.isFinite(nominal) || nominal < 0) {
    return { ok: false, message: 'Nominal biaya harus angka >= 0' };
  }

  const idMitra = Number(b.id_mitra ?? 0);
  if (!Number.isInteger(idMitra) || idMitra < 0) {
    return { ok: false, message: 'ID mitra harus bilangan bulat >= 0 (0 = global)' };
  }

  return { ok: true, value: { kode, nama, jenis, nominal, idMitra } };
}

async function listBiaya(request, reply) {
  try {
    const rows = await query(
      `SELECT b.id_biaya, b.kode_biaya, b.nama_biaya, b.id_mitra, b.jenis_biaya,
              b.default_biaya, b.updated_at, m.name AS nama_mitra
         FROM t_biaya b
         LEFT JOIN t_mitra m ON m.id_mitra = b.id_mitra AND m.deleted_at IS NULL
        ORDER BY b.id_mitra ASC, b.kode_biaya ASC`
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listBiaya]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createBiaya(request, reply) {
  const v = validasi(request.body || {});
  if (!v.ok) return gagal(reply, v.message);

  try {
    const dup = await query(
      'SELECT 1 FROM t_biaya WHERE kode_biaya=$1 AND id_mitra=$2',
      [v.value.kode, v.value.idMitra]
    );
    if (dup.length > 0) {
      return gagal(reply, `Kode biaya "${v.value.kode}" sudah ada untuk mitra tersebut`);
    }
    const res = await query(
      `INSERT INTO t_biaya (kode_biaya, nama_biaya, id_mitra, jenis_biaya, default_biaya)
       VALUES ($1,$2,$3,$4,$5) RETURNING id_biaya`,
      [v.value.kode, v.value.nama, v.value.idMitra, v.value.jenis, v.value.nominal]
    );
    return reply.send({ success: true, message: 'Berhasil disimpan', data: { id_biaya: res[0].id_biaya } });
  } catch (err) {
    console.error('[admin.createBiaya]', err);
    if (err && err.code === '23505') return gagal(reply, 'Kode biaya sudah dipakai');
    return gagal(reply, 'Gagal menyimpan data');
  }
}

async function updateBiaya(request, reply) {
  const id = request.params.id;
  const v = validasi(request.body || {});
  if (!v.ok) return gagal(reply, v.message);

  try {
    const cur = await query('SELECT id_biaya, kode_biaya, id_mitra FROM t_biaya WHERE id_biaya=$1', [id]);
    if (cur.length === 0) return gagal(reply, 'Data tidak ditemukan');

    // Kode sistem dipakai fn_biaya_transaksi; ganti kode akan memutus perhitungan.
    if (KODE_SISTEM.includes(cur[0].kode_biaya) && v.value.kode !== cur[0].kode_biaya) {
      return gagal(reply, `Kode "${cur[0].kode_biaya}" dipakai sistem dan tidak boleh diubah`);
    }

    const dup = await query(
      'SELECT 1 FROM t_biaya WHERE kode_biaya=$1 AND id_mitra=$2 AND id_biaya<>$3',
      [v.value.kode, v.value.idMitra, id]
    );
    if (dup.length > 0) {
      return gagal(reply, `Kode biaya "${v.value.kode}" sudah ada untuk mitra tersebut`);
    }

    await query(
      `UPDATE t_biaya
          SET kode_biaya=$1, nama_biaya=$2, id_mitra=$3, jenis_biaya=$4,
              default_biaya=$5, updated_at=now()
        WHERE id_biaya=$6`,
      [v.value.kode, v.value.nama, v.value.idMitra, v.value.jenis, v.value.nominal, id]
    );
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateBiaya]', err);
    if (err && err.code === '23505') return gagal(reply, 'Kode biaya sudah dipakai');
    return gagal(reply, 'Gagal mengubah data');
  }
}

async function deleteBiaya(request, reply) {
  const id = request.params.id;
  try {
    const cur = await query('SELECT kode_biaya FROM t_biaya WHERE id_biaya=$1', [id]);
    if (cur.length === 0) return gagal(reply, 'Data tidak ditemukan');

    if (KODE_SISTEM.includes(cur[0].kode_biaya)) {
      return gagal(reply, `Kode "${cur[0].kode_biaya}" dipakai sistem dan tidak boleh dihapus`);
    }

    const used = await query('SELECT 1 FROM t_besar_biaya WHERE id_biaya=$1 LIMIT 1', [id]);
    if (used.length > 0) {
      return gagal(reply, 'Biaya masih dipakai pada override (t_besar_biaya)');
    }

    await query('DELETE FROM t_biaya WHERE id_biaya=$1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteBiaya]', err);
    return gagal(reply, 'Gagal menghapus data');
  }
}

module.exports = { listBiaya, createBiaya, updateBiaya, deleteBiaya, KODE_SISTEM, JENIS_BIYA };