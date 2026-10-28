'use strict';

/**
 * Admin CRUD fitur promo (ATPM / Hotel / Asuransi).
 * Rujukan kontrak: API-PROMO.md §4–§7.
 *
 * Aturan umum controller ini:
 *   - Semua nominal rupiah dikirim sebagai integer penuh (sudah dibulatkan
 *     server), persen sebagai number desimal, boolean sebagai boolean asli.
 *   - Tanggal dikirim sebagai teks 'YYYY-MM-DD' (kolomnya `date`; driver pg
 *     mem-parse ke Date tengah malam lokal lalu bergeser ke hari sebelumnya
 *     saat diserialisasi — pola yang sama dengan controller-admin-berita).
 *   - Validasi dilakukan di server, bukan hanya di form dashboard.
 */

const crypto = require('crypto');
const db = require('../services/database.service');
const { query } = db;

const JENIS_MITRA = ['atpm', 'hotel', 'asuransi', 'lainnya'];
const TIPE_POTONGAN = ['per_kwh', 'persen', 'nominal'];
const KEBIJAKAN_SISA = ['hangus', 'rollover'];
const KODE_RE = /^[A-Z0-9_-]{3,30}$/;

function gagal(reply, message, code) {
  if (code) reply.code(code);
  return reply.send({ success: false, message, data: null });
}

function ok(reply, message, data) {
  return reply.send({ success: true, message, data });
}

/** Kesalahan validasi input: selalu 400, bukan 200. */
function gagalValidasi(reply, message) {
  return gagal(reply, message, 400);
}

function tanggalValid(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function angka(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  return v === 1 || v === '1' || v === 'true';
}

// ============================================================ MITRA PROMO

async function listMitra(request, reply) {
  try {
    const { jenis_mitra, aktif, q } = request.query || {};
    const where = [];
    const params = [];

    if (jenis_mitra) {
      params.push(String(jenis_mitra).toLowerCase());
      where.push(`m.jenis_mitra = $${params.length}`);
    }
    if (aktif !== undefined && aktif !== '') {
      params.push(bool(aktif));
      where.push(`m.aktif = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(lower(m.nama) LIKE $${params.length} OR lower(m.kode) LIKE $${params.length})`);
    }

    const rows = await query(
      `SELECT m.id_mitra_promo, m.jenis_mitra, m.kode, m.nama, m.alamat,
              m.latitude, m.longitude, m.kontak_nama, m.kontak_email, m.kontak_hp,
              m.catatan, m.aktif, m.created_at,
              (m.api_key_hash IS NOT NULL) AS punya_api_key,
              m.api_key_last_used,
              (SELECT count(*)::int FROM t_promo p WHERE p.id_mitra_promo = m.id_mitra_promo) AS jumlah_promo
         FROM t_promo_mitra m
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY m.id_mitra_promo DESC`,
      params
    );

    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[admin.listMitra]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

function normalisasiMitra(b) {
  const jenis = String(b.jenis_mitra ?? '').toLowerCase();
  if (!JENIS_MITRA.includes(jenis)) {
    return { ok: false, message: `Jenis mitra tidak valid. Pilihan: ${JENIS_MITRA.join(', ')}` };
  }
  const kode = String(b.kode ?? '').trim().toUpperCase();
  if (!kode) return { ok: false, message: 'Kode mitra wajib diisi' };
  if (kode.length > 20) return { ok: false, message: 'Kode mitra maksimal 20 karakter' };

  const nama = String(b.nama ?? '').trim();
  if (!nama) return { ok: false, message: 'Nama mitra wajib diisi' };
  if (nama.length > 150) return { ok: false, message: 'Nama maksimal 150 karakter' };

  return {
    ok: true,
    value: {
      jenis_mitra: jenis,
      kode,
      nama,
      alamat: b.alamat ? String(b.alamat).trim() : null,
      latitude: b.latitude ? String(b.latitude).trim() : null,
      longitude: b.longitude ? String(b.longitude).trim() : null,
      kontak_nama: b.kontak_nama ? String(b.kontak_nama).trim() : null,
      kontak_email: b.kontak_email ? String(b.kontak_email).trim() : null,
      kontak_hp: b.kontak_hp ? String(b.kontak_hp).trim() : null,
      catatan: b.catatan ? String(b.catatan).trim() : null,
      aktif: bool(b.aktif, true),
    },
  };
}

async function createMitra(request, reply) {
  const n = normalisasiMitra(request.body || {});
  if (!n.ok) return gagalValidasi(reply, n.message);
  const v = n.value;

  try {
    const dup = await query(`SELECT 1 FROM t_promo_mitra WHERE kode = $1`, [v.kode]);
    if (dup.length) return gagal(reply, 'Kode mitra sudah dipakai', 409);

    const res = await query(
      `INSERT INTO t_promo_mitra
         (jenis_mitra, kode, nama, alamat, latitude, longitude,
          kontak_nama, kontak_email, kontak_hp, catatan, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id_mitra_promo`,
      [v.jenis_mitra, v.kode, v.nama, v.alamat, v.latitude, v.longitude,
       v.kontak_nama, v.kontak_email, v.kontak_hp, v.catatan, v.aktif]
    );
    return ok(reply, 'Mitra dibuat', { id_mitra_promo: res[0].id_mitra_promo });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Kode mitra sudah dipakai', 409);
    console.error('[admin.createMitra]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function updateMitra(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID mitra tidak valid');

  const n = normalisasiMitra(request.body || {});
  if (!n.ok) return gagalValidasi(reply, n.message);
  const v = n.value;

  try {
    const ada = await query(`SELECT kode FROM t_promo_mitra WHERE id_mitra_promo = $1`, [id]);
    if (!ada.length) return gagal(reply, 'Mitra tidak ditemukan', 404);

    // Kode mitra tidak boleh diubah bila sudah dipakai promo aktif: kode ini
    // tercetak di materi iklan dan dipakai ATPM sebagai referensi.
    if (ada[0].kode !== v.kode) {
      const dipakai = await query(
        `SELECT 1 FROM t_promo WHERE id_mitra_promo = $1 AND aktif LIMIT 1`, [id]
      );
      if (dipakai.length) {
        return gagal(reply, 'Kode mitra tidak boleh diubah selama masih ada promo aktif', 409);
      }
    }

    await query(
      `UPDATE t_promo_mitra
          SET jenis_mitra=$1, kode=$2, nama=$3, alamat=$4, latitude=$5, longitude=$6,
              kontak_nama=$7, kontak_email=$8, kontak_hp=$9, catatan=$10, aktif=$11,
              updated_at=now()
        WHERE id_mitra_promo=$12`,
      [v.jenis_mitra, v.kode, v.nama, v.alamat, v.latitude, v.longitude,
       v.kontak_nama, v.kontak_email, v.kontak_hp, v.catatan, v.aktif, id]
    );
    return ok(reply, 'Mitra diperbarui', { id_mitra_promo: id });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Kode mitra sudah dipakai', 409);
    console.error('[admin.updateMitra]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deleteMitra(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID mitra tidak valid');

  try {
    const aktif = await query(
      `SELECT 1 FROM t_promo WHERE id_mitra_promo = $1 AND aktif LIMIT 1`, [id]
    );
    if (aktif.length) {
      return gagal(reply, 'Mitra masih punya promo aktif. Nonaktifkan promonya dulu.', 409);
    }
    await query(`UPDATE t_promo_mitra SET aktif=false, updated_at=now() WHERE id_mitra_promo=$1`, [id]);
    return ok(reply, 'Mitra dinonaktifkan', { id_mitra_promo: id });
  } catch (err) {
    console.error('[admin.deleteMitra]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// --------------------------------------------------------------- API key

/**
 * Buat / reset API key mitra. Plaintext hanya dikembalikan SEKALI di respons
 * ini; setelah itu hanya hash yang tersimpan. Satu key per mitra (keputusan
 * 2026-10-27) — generate ulang mematikan key lama.
 */
async function resetApiKey(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID mitra tidak valid');

  try {
    const ada = await query(
      `SELECT jenis_mitra, aktif FROM t_promo_mitra WHERE id_mitra_promo = $1`, [id]
    );
    if (!ada.length) return gagal(reply, 'Mitra tidak ditemukan', 404);
    if (ada[0].jenis_mitra !== 'atpm') {
      return gagalValidasi(reply, 'API key hanya untuk mitra ATPM');
    }

    const plain = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(plain).digest('hex');

    await query(
      `UPDATE t_promo_mitra SET api_key_hash=$1, api_key_last_used=NULL, updated_at=now()
        WHERE id_mitra_promo=$2`,
      [hash, id]
    );

    return ok(reply, 'API key dibuat. Simpan sekarang, tidak akan ditampilkan lagi.', {
      id_mitra_promo: id,
      api_key: plain,
    });
  } catch (err) {
    console.error('[admin.resetApiKey]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deleteApiKey(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID mitra tidak valid');

  try {
    await query(
      `UPDATE t_promo_mitra SET api_key_hash=NULL, api_key_last_used=NULL, updated_at=now()
        WHERE id_mitra_promo=$1`, [id]
    );
    return ok(reply, 'API key dicabut', { id_mitra_promo: id });
  } catch (err) {
    console.error('[admin.deleteApiKey]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// ================================================================== PROMO

async function listPromo(request, reply) {
  try {
    const { aktif, jenis_mitra, q } = request.query || {};
    const where = [];
    const params = [];

    if (aktif !== undefined && aktif !== '') {
      params.push(bool(aktif));
      where.push(`v.aktif = $${params.length}`);
    }
    if (jenis_mitra) {
      params.push(String(jenis_mitra).toLowerCase());
      where.push(`v.jenis_mitra = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(lower(v.kode_promo) LIKE $${params.length} OR lower(v.nama) LIKE $${params.length})`);
    }

    const rows = await query(
      `SELECT v.*,
              to_char(v.tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(v.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai
         FROM v_promo_ringkas v
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY v.id_promo DESC`,
      params
    );

    // Normalisasi tipe: budget/sisa rupiah integer, persen desimal.
    const data = rows.map((r) => ({
      ...r,
      budget_rupiah: Math.round(Number(r.budget_rupiah)),
      budget_terpakai: Math.round(Number(r.budget_terpakai)),
      sisa_budget: Math.round(Number(r.sisa_budget)),
      persen_terpakai: Number(r.persen_terpakai),
      total_potongan: Math.round(Number(r.total_potongan)),
    }));

    return ok(reply, 'Berhasil', data);
  } catch (err) {
    console.error('[admin.listPromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function detailPromo(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  try {
    const rows = await query(
      `SELECT p.*,
              to_char(p.tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(p.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
              m.jenis_mitra, m.nama AS nama_mitra,
              (p.budget_rupiah - p.budget_terpakai) AS sisa_budget
         FROM t_promo p
         JOIN t_promo_mitra m ON m.id_mitra_promo = p.id_mitra_promo
        WHERE p.id_promo = $1`,
      [id]
    );
    if (!rows.length) return gagal(reply, 'Promo tidak ditemukan', 404);

    const iklan = await query(
      `SELECT id_iklan, foto, judul, target_url, maks_tayang_per_hari,
              to_char(tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
              urutan, aktif
         FROM t_promo_iklan WHERE id_promo = $1 ORDER BY urutan, id_iklan`,
      [id]
    );

    return ok(reply, 'Berhasil', { ...rows[0], iklan });
  } catch (err) {
    console.error('[admin.detailPromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

function normalisasiPromo(b) {
  const kode = String(b.kode_promo ?? '').trim().toUpperCase();
  if (!KODE_RE.test(kode)) {
    return { ok: false, message: 'Kode promo hanya huruf, angka, _ dan - (3-30 karakter)' };
  }

  const idMitra = angka(b.id_mitra_promo);
  if (!idMitra) return { ok: false, message: 'Mitra promo wajib dipilih' };

  const nama = String(b.nama ?? '').trim();
  if (!nama) return { ok: false, message: 'Nama promo wajib diisi' };
  if (nama.length > 150) return { ok: false, message: 'Nama maksimal 150 karakter' };

  const tipe = String(b.tipe_potongan ?? 'per_kwh').toLowerCase();
  if (!TIPE_POTONGAN.includes(tipe)) {
    return { ok: false, message: `Tipe potongan tidak valid. Pilihan: ${TIPE_POTONGAN.join(', ')}` };
  }

  const nilai = angka(b.nilai_potongan);
  if (nilai === null || nilai <= 0) {
    return { ok: false, message: 'Nilai potongan harus lebih dari 0' };
  }

  const budget = angka(b.budget_rupiah);
  if (budget === null || budget <= 0) {
    return { ok: false, message: 'Budget wajib diisi dan lebih dari 0' };
  }

  if (!tanggalValid(b.tanggal_mulai) || !tanggalValid(b.tanggal_selesai)) {
    return { ok: false, message: 'Periode promo wajib diisi (YYYY-MM-DD)' };
  }
  if (b.tanggal_selesai < b.tanggal_mulai) {
    return { ok: false, message: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };
  }

  const kebijakan = String(b.kebijakan_sisa ?? 'hangus').toLowerCase();
  if (!KEBIJAKAN_SISA.includes(kebijakan)) {
    return { ok: false, message: `Kebijakan sisa tidak valid. Pilihan: ${KEBIJAKAN_SISA.join(', ')}` };
  }

  const maksPotongan = angka(b.maks_potongan);
  if (maksPotongan !== null && maksPotongan < 0) {
    return { ok: false, message: 'Maks potongan tidak boleh negatif' };
  }
  const minKwh = angka(b.min_kwh);
  if (minKwh !== null && minKwh < 0) {
    return { ok: false, message: 'Min kWh tidak boleh negatif' };
  }
  const maksKwh = angka(b.maks_kwh);
  if (maksKwh !== null && maksKwh <= 0) {
    return { ok: false, message: 'Maks kWh harus lebih dari 0' };
  }
  const kuotaKwh = angka(b.kuota_kwh);
  if (kuotaKwh !== null && kuotaKwh <= 0) {
    return { ok: false, message: 'Kuota kWh harus lebih dari 0' };
  }
  const maksPakai = angka(b.maks_pemakaian_per_user);
  if (maksPakai !== null && maksPakai <= 0) {
    return { ok: false, message: 'Batas pemakaian per user harus lebih dari 0' };
  }

  const prioritas = angka(b.prioritas);
  const lanjutan = angka(b.id_promo_lanjutan);

  return {
    ok: true,
    value: {
      kode_promo: kode,
      id_mitra_promo: idMitra,
      nama,
      deskripsi: b.deskripsi ? String(b.deskripsi).trim() : null,
      tipe_potongan: tipe,
      nilai_potongan: nilai,
      maks_potongan: maksPotongan,
      min_kwh: minKwh ?? 0,
      maks_kwh: maksKwh,
      budget_rupiah: budget,
      kuota_kwh: kuotaKwh,
      maks_pemakaian_per_user: maksPakai,
      tanggal_mulai: b.tanggal_mulai,
      tanggal_selesai: b.tanggal_selesai,
      kebijakan_sisa: kebijakan,
      id_promo_lanjutan: lanjutan,
      butuh_peserta: bool(b.butuh_peserta, true),
      cek_kendaraan: bool(b.cek_kendaraan, false),
      prioritas: prioritas ?? 100,
      aktif: bool(b.aktif, true),
    },
  };
}

async function createPromo(request, reply) {
  const n = normalisasiPromo(request.body || {});
  if (!n.ok) return gagalValidasi(reply, n.message);
  const v = n.value;

  try {
    const mitra = await query(
      `SELECT jenis_mitra, aktif FROM t_promo_mitra WHERE id_mitra_promo = $1`, [v.id_mitra_promo]
    );
    if (!mitra.length) return gagal(reply, 'Mitra tidak ditemukan', 404);
    if (!mitra[0].aktif) return gagal(reply, 'Mitra sedang nonaktif', 409);

    // cek_kendaraan hanya masuk akal untuk ATPM: data kendaraan terikat ke
    // merek = id_mitra_promo bertipe atpm.
    if (v.cek_kendaraan && mitra[0].jenis_mitra !== 'atpm') {
      return gagalValidasi(reply, 'Cek kendaraan hanya untuk mitra ATPM');
    }

    const dup = await query(`SELECT 1 FROM t_promo WHERE kode_promo = $1`, [v.kode_promo]);
    if (dup.length) return gagal(reply, 'Kode promo sudah dipakai', 409);

    const admin = request.admin || {};
    const res = await query(
      `INSERT INTO t_promo
         (kode_promo, id_mitra_promo, nama, deskripsi, tipe_potongan, nilai_potongan,
          maks_potongan, min_kwh, maks_kwh, budget_rupiah, kuota_kwh,
          maks_pemakaian_per_user, tanggal_mulai, tanggal_selesai, kebijakan_sisa,
          id_promo_lanjutan, butuh_peserta, cek_kendaraan, prioritas, aktif, dibuat_oleh)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id_promo`,
      [v.kode_promo, v.id_mitra_promo, v.nama, v.deskripsi, v.tipe_potongan, v.nilai_potongan,
       v.maks_potongan, v.min_kwh, v.maks_kwh, v.budget_rupiah, v.kuota_kwh,
       v.maks_pemakaian_per_user, v.tanggal_mulai, v.tanggal_selesai, v.kebijakan_sisa,
       v.id_promo_lanjutan, v.butuh_peserta, v.cek_kendaraan, v.prioritas, v.aktif,
       String(admin.code || admin.name || admin.email || 'admin').slice(0, 100)]
    );
    return ok(reply, 'Promo dibuat', { id_promo: res[0].id_promo });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Kode promo sudah dipakai', 409);
    if (err.code === '23503') return gagalValidasi(reply, 'Mitra atau promo lanjutan tidak ditemukan');
    console.error('[admin.createPromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function updatePromo(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  const n = normalisasiPromo(request.body || {});
  if (!n.ok) return gagalValidasi(reply, n.message);
  const v = n.value;

  try {
    const ada = await query(
      `SELECT kode_promo, id_mitra_promo, budget_terpakai FROM t_promo WHERE id_promo = $1`, [id]
    );
    if (!ada.length) return gagal(reply, 'Promo tidak ditemukan', 404);
    const lama = ada[0];

    // Budget tidak boleh turun di bawah yang sudah terpakai: sisa budget akan
    // negatif dan perhitungan promo jadi tidak masuk akal.
    if (Number(v.budget_rupiah) < Number(lama.budget_terpakai)) {
      return gagal(
        reply,
        `Budget tidak boleh lebih kecil dari yang sudah terpakai (${Math.round(Number(lama.budget_terpakai))})`,
        409
      );
    }

    // Kode & mitra terkunci setelah ada pemakaian: kode sudah beredar di iklan,
    // dan memindah mitra akan mengubah siapa yang menanggung potongan lama.
    const dipakai = await query(
      `SELECT 1 FROM t_promo_pemakaian WHERE id_promo = $1 LIMIT 1`, [id]
    );
    if (dipakai.length) {
      if (lama.kode_promo !== v.kode_promo) {
        return gagal(reply, 'Kode promo tidak boleh diubah karena sudah ada pemakaian', 409);
      }
      if (Number(lama.id_mitra_promo) !== Number(v.id_mitra_promo)) {
        return gagal(reply, 'Mitra tidak boleh diubah karena sudah ada pemakaian', 409);
      }
    }

    const mitra = await query(
      `SELECT jenis_mitra FROM t_promo_mitra WHERE id_mitra_promo = $1`, [v.id_mitra_promo]
    );
    if (!mitra.length) return gagal(reply, 'Mitra tidak ditemukan', 404);
    if (v.cek_kendaraan && mitra[0].jenis_mitra !== 'atpm') {
      return gagalValidasi(reply, 'Cek kendaraan hanya untuk mitra ATPM');
    }
    if (v.id_promo_lanjutan !== null && Number(v.id_promo_lanjutan) === Number(id)) {
      return gagalValidasi(reply, 'Promo lanjutan tidak boleh dirinya sendiri');
    }

    await query(
      `UPDATE t_promo
          SET kode_promo=$1, id_mitra_promo=$2, nama=$3, deskripsi=$4, tipe_potongan=$5,
              nilai_potongan=$6, maks_potongan=$7, min_kwh=$8, maks_kwh=$9,
              budget_rupiah=$10, kuota_kwh=$11, maks_pemakaian_per_user=$12,
              tanggal_mulai=$13, tanggal_selesai=$14, kebijakan_sisa=$15,
              id_promo_lanjutan=$16, butuh_peserta=$17, cek_kendaraan=$18,
              prioritas=$19, aktif=$20, updated_at=now()
        WHERE id_promo=$21`,
      [v.kode_promo, v.id_mitra_promo, v.nama, v.deskripsi, v.tipe_potongan,
       v.nilai_potongan, v.maks_potongan, v.min_kwh, v.maks_kwh, v.budget_rupiah,
       v.kuota_kwh, v.maks_pemakaian_per_user, v.tanggal_mulai, v.tanggal_selesai,
       v.kebijakan_sisa, v.id_promo_lanjutan, v.butuh_peserta, v.cek_kendaraan,
       v.prioritas, v.aktif, id]
    );
    return ok(reply, 'Promo diperbarui', { id_promo: id });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Kode promo sudah dipakai', 409);
    if (err.code === '23503') return gagalValidasi(reply, 'Mitra atau promo lanjutan tidak ditemukan');
    console.error('[admin.updatePromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deletePromo(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  try {
    await query(`UPDATE t_promo SET aktif=false, updated_at=now() WHERE id_promo=$1`, [id]);
    return ok(reply, 'Promo dinonaktifkan', { id_promo: id });
  } catch (err) {
    console.error('[admin.deletePromo]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function tutupPeriode(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  const tanggal = (request.body && request.body.tanggal) || null;
  if (tanggal !== null && !tanggalValid(tanggal)) {
    return gagalValidasi(reply, 'Tanggal tidak valid (YYYY-MM-DD)');
  }

  try {
    const rows = await query(
      `SELECT status, id_promo_asal, id_promo_tujuan, jumlah
         FROM fn_promo_tutup_periode($1, COALESCE($2::date, CURRENT_DATE))`,
      [id, tanggal]
    );
    const r = rows[0] || {};

    const pesan = {
      ROLLOVER: 'Sisa budget dipindahkan ke promo lanjutan',
      HANGUS: 'Sisa budget hangus (tidak dipindahkan)',
      BELUM_BERAKHIR: 'Periode promo belum berakhir',
      TIDAK_ADA_SISA: 'Tidak ada sisa budget',
      LANJUTAN_BELUM_DITETAPKAN: 'Promo lanjutan belum ditetapkan',
      SUDAH_DITUTUP: 'Periode promo sudah ditutup sebelumnya',
      SIKLUS: 'Rantai promo lanjutan membentuk siklus',
      PROMO_TIDAK_DITEMUKAN: 'Promo tidak ditemukan',
    }[r.status] || 'Selesai';

    if (r.status === 'PROMO_TIDAK_DITEMUKAN') return gagal(reply, pesan, 404);
    if (r.status !== 'ROLLOVER' && r.status !== 'HANGUS') return gagal(reply, pesan, 409);

    return ok(reply, pesan, {
      status: r.status,
      id_promo_asal: r.id_promo_asal,
      id_promo_tujuan: r.id_promo_tujuan,
      jumlah: Number(r.jumlah || 0),
    });
  } catch (err) {
    console.error('[admin.tutupPeriode]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// ================================================================== IKLAN

async function listIklan(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  try {
    const rows = await query(
      `SELECT i.id_iklan, i.id_promo, i.foto, i.judul, i.target_url,
              i.maks_tayang_per_hari, i.urutan, i.aktif,
              to_char(i.tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(i.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
              (SELECT count(*)::int FROM t_promo_iklan_tayang t
                WHERE t.id_iklan = i.id_iklan AND t.tanggal = CURRENT_DATE) AS tayang_hari_ini
         FROM t_promo_iklan i
        WHERE i.id_promo = $1
        ORDER BY i.urutan, i.id_iklan`,
      [id]
    );
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[admin.listIklan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createIklan(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');
  const b = request.body || {};

  const foto = String(b.foto ?? '').trim();
  if (!foto) return gagalValidasi(reply, 'Foto wajib diunggah');
  if (foto.length > 255) return gagalValidasi(reply, 'Nama file terlalu panjang');

  const maks = angka(b.maks_tayang_per_hari);
  if (maks !== null && maks <= 0) return gagalValidasi(reply, 'Batas tayang harus lebih dari 0');

  if (b.tanggal_mulai && !tanggalValid(b.tanggal_mulai)) return gagalValidasi(reply, 'Tanggal mulai tidak valid');
  if (b.tanggal_selesai && !tanggalValid(b.tanggal_selesai)) return gagalValidasi(reply, 'Tanggal selesai tidak valid');
  if (b.tanggal_mulai && b.tanggal_selesai && b.tanggal_selesai < b.tanggal_mulai) {
    return gagalValidasi(reply, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
  }

  try {
    const promo = await query(`SELECT 1 FROM t_promo WHERE id_promo = $1`, [id]);
    if (!promo.length) return gagal(reply, 'Promo tidak ditemukan', 404);

    const res = await query(
      `INSERT INTO t_promo_iklan
         (id_promo, foto, judul, target_url, maks_tayang_per_hari,
          tanggal_mulai, tanggal_selesai, urutan, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id_iklan`,
      [id, foto, b.judul ? String(b.judul).trim() : null,
       b.target_url ? String(b.target_url).trim() : null,
       maks, b.tanggal_mulai || null, b.tanggal_selesai || null,
       angka(b.urutan) ?? 0, bool(b.aktif, true)]
    );
    return ok(reply, 'Iklan ditambahkan', { id_iklan: res[0].id_iklan });
  } catch (err) {
    console.error('[admin.createIklan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function updateIklan(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID iklan tidak valid');
  const b = request.body || {};

  const maks = angka(b.maks_tayang_per_hari);
  if (maks !== null && maks <= 0) return gagalValidasi(reply, 'Batas tayang harus lebih dari 0');

  try {
    const ada = await query(`SELECT id_iklan FROM t_promo_iklan WHERE id_iklan = $1`, [id]);
    if (!ada.length) return gagal(reply, 'Iklan tidak ditemukan', 404);

    await query(
      `UPDATE t_promo_iklan
          SET foto = COALESCE($1, foto),
              judul = $2, target_url = $3, maks_tayang_per_hari = $4,
              tanggal_mulai = $5, tanggal_selesai = $6, urutan = $7, aktif = $8,
              updated_at = now()
        WHERE id_iklan = $9`,
      [b.foto ? String(b.foto).trim() : null,
       b.judul ? String(b.judul).trim() : null,
       b.target_url ? String(b.target_url).trim() : null,
       maks, b.tanggal_mulai || null, b.tanggal_selesai || null,
       angka(b.urutan) ?? 0, bool(b.aktif, true), id]
    );
    return ok(reply, 'Iklan diperbarui', { id_iklan: id });
  } catch (err) {
    console.error('[admin.updateIklan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deleteIklan(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID iklan tidak valid');

  try {
    await query(`UPDATE t_promo_iklan SET aktif=false, updated_at=now() WHERE id_iklan=$1`, [id]);
    return ok(reply, 'Iklan dinonaktifkan', { id_iklan: id });
  } catch (err) {
    console.error('[admin.deleteIklan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// ================================================================ PESERTA

async function listPeserta(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  try {
    const { status, q } = request.query || {};
    const where = ['ps.id_promo = $1'];
    const params = [id];

    if (status) {
      params.push(String(status));
      where.push(`ps.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(lower(coalesce(ps.email,'')) LIKE $${params.length}
                   OR coalesce(ps.no_hp,'') LIKE $${params.length})`);
    }

    const rows = await query(
      `SELECT ps.id_peserta, ps.id_user, ps.email, ps.no_hp, ps.vin, ps.status,
              to_char(ps.tanggal_mulai, 'YYYY-MM-DD')   AS tanggal_mulai,
              to_char(ps.tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai,
              ps.catatan, ps.created_at,
              CASE WHEN ps.id_portal_user IS NOT NULL THEN 'portal'
                   ELSE coalesce(u2.sumber, 'admin') END AS sumber,
              u.nama AS nama_user
         FROM t_promo_peserta ps
         LEFT JOIN t_user_mobile u ON u.id_user = ps.id_user
         LEFT JOIN LATERAL (
              SELECT sumber FROM t_user_kendaraan k
               WHERE k.id_user = ps.id_user
                 AND k.id_mitra_promo = (SELECT id_mitra_promo FROM t_promo WHERE id_promo = ps.id_promo)
               LIMIT 1
         ) u2 ON true
        WHERE ${where.join(' AND ')}
        ORDER BY ps.id_peserta DESC`,
      params
    );
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[admin.listPeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createPeserta(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');
  const b = request.body || {};

  const email = b.email ? String(b.email).trim().toLowerCase() : null;
  const noHp = b.no_hp ? String(b.no_hp).trim() : null;
  const idUser = angka(b.id_user);
  const vin = b.vin ? String(b.vin).trim() : null;

  if (!email && !noHp && !idUser) {
    return gagalValidasi(reply, 'Isi minimal satu: email, no_hp, atau id_user');
  }
  if (b.tanggal_mulai && !tanggalValid(b.tanggal_mulai)) return gagalValidasi(reply, 'Tanggal mulai tidak valid');
  if (b.tanggal_selesai && !tanggalValid(b.tanggal_selesai)) return gagalValidasi(reply, 'Tanggal selesai tidak valid');

  const status = String(b.status ?? 'active').toLowerCase();
  if (!['pending', 'active', 'suspended', 'expired'].includes(status)) {
    return gagalValidasi(reply, 'Status peserta tidak valid');
  }

  try {
    const promo = await query(`SELECT id_promo FROM t_promo WHERE id_promo = $1`, [id]);
    if (!promo.length) return gagal(reply, 'Promo tidak ditemukan', 404);

    // Isi id_user otomatis bila email/no_hp cocok dengan akun mobile. Tidak
    // wajib: peserta boleh didaftarkan sebelum pengguna punya akun.
    let resolvedUser = idUser;
    if (!resolvedUser && (email || noHp)) {
      const u = await query(
        `SELECT id_user FROM t_user_mobile
          WHERE (lower(email) = $1 AND $1 IS NOT NULL)
             OR (no_hp = $2 AND $2 IS NOT NULL)
          LIMIT 1`,
        [email, noHp]
      );
      if (u.length) resolvedUser = u[0].id_user;
    }

    const res = await query(
      `INSERT INTO t_promo_peserta
         (id_promo, id_user, email, no_hp, vin, status, tanggal_mulai, tanggal_selesai, catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id_peserta`,
      [id, resolvedUser, email, noHp, vin, status,
       b.tanggal_mulai || null, b.tanggal_selesai || null,
       b.catatan ? String(b.catatan).trim() : null]
    );
    return ok(reply, 'Peserta ditambahkan', {
      id_peserta: res[0].id_peserta,
      id_user: resolvedUser,
    });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Peserta sudah terdaftar pada promo ini', 409);
    console.error('[admin.createPeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deletePeserta(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID peserta tidak valid');

  try {
    await query(`DELETE FROM t_promo_peserta WHERE id_peserta = $1`, [id]);
    return ok(reply, 'Peserta dihapus', { id_peserta: id });
  } catch (err) {
    console.error('[admin.deletePeserta]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// ====================================================== PEMAKAIAN & EKSPOSUR

async function listPemakaian(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID promo tidak valid');

  try {
    const rows = await query(
      `SELECT no_trans, id_user, kwh, harga_normal, potongan_perkwh,
              harga_efektif, potongan_rupiah, status, alasan, created_at
         FROM t_promo_pemakaian
        WHERE id_promo = $1
        ORDER BY id DESC
        LIMIT 500`,
      [id]
    );
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[admin.listPemakaian]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function listEksposur(request, reply) {
  try {
    const rows = await query(
      `SELECT id, no_trans, id_promo, kode_promo, nama_promo, nama_mitra,
              id_user, kwh, potongan_rupiah, alasan, created_at
         FROM v_promo_eksposur
        ORDER BY created_at DESC
        LIMIT 500`
    );
    const total = rows.reduce((a, r) => a + Number(r.potongan_rupiah || 0), 0);

    return ok(reply, 'Berhasil', {
      data: rows,
      ringkasan: {
        jumlah_transaksi: rows.length,
        total_rupiah: Math.round(total),
      },
    });
  } catch (err) {
    console.error('[admin.listEksposur]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

// ========================================================== AKUN PORTAL
//
// Akun portal dipakai front office hotel / petugas asuransi untuk mendaftarkan
// pelanggan. Tanpa endpoint ini, satu-satunya cara membuat akun adalah INSERT
// manual dengan hash sha256 — itu melanggar definition of done (ketiga
// skenario harus bisa dijalankan tanpa intervensi SQL).
//
// Password di-hash sha256, sama dengan yang diverifikasi controller-portal.js.
// Plaintext TIDAK pernah disimpan dan TIDAK bisa ditampilkan ulang; admin yang
// membuat akun wajib menyerahkan password ke mitra lewat kanal aman.

function hashPassword(plain) {
  return crypto.createHash('sha256').update(String(plain)).digest('hex');
}

async function listPortalUser(request, reply) {
  const idMitra = angka(request.params && request.params.id);
  if (!idMitra) return gagalValidasi(reply, 'ID mitra tidak valid');

  try {
    const rows = await query(
      `SELECT id_portal_user, email, nama, role, aktif, last_login, created_at
         FROM t_portal_user
        WHERE id_mitra_promo = $1
        ORDER BY id_portal_user DESC`,
      [idMitra]
    );
    // password_hash sengaja TIDAK dikirim, bahkan sebagai hash.
    return ok(reply, 'Berhasil', rows);
  } catch (err) {
    console.error('[admin.listPortalUser]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createPortalUser(request, reply) {
  const idMitra = angka(request.params && request.params.id);
  if (!idMitra) return gagalValidasi(reply, 'ID mitra tidak valid');

  const b = request.body || {};
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const nama = b.nama ? String(b.nama).trim() : null;
  const role = String(b.role ?? 'operator').toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return gagalValidasi(reply, 'Email tidak valid');
  }
  // Minimal 8 karakter: akun ini bisa mendaftarkan pelanggan, jadi jangan
  // sampai bisa ditebak.
  if (password.length < 8) {
    return gagalValidasi(reply, 'Password minimal 8 karakter');
  }
  if (!['operator', 'admin_mitra'].includes(role)) {
    return gagalValidasi(reply, 'Role tidak valid');
  }

  try {
    const mitra = await query(
      `SELECT jenis_mitra, aktif FROM t_promo_mitra WHERE id_mitra_promo = $1`, [idMitra]
    );
    if (!mitra.length) return gagal(reply, 'Mitra tidak ditemukan', 404);
    if (!mitra[0].aktif) return gagal(reply, 'Mitra sedang nonaktif', 409);

    const res = await query(
      `INSERT INTO t_portal_user (id_mitra_promo, email, password_hash, nama, role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id_portal_user`,
      [idMitra, email, hashPassword(password), nama, role]
    );

    return ok(reply, 'Akun portal dibuat. Serahkan email dan password ke mitra.', {
      id_portal_user: res[0].id_portal_user,
    });
  } catch (err) {
    if (err.code === '23505') return gagal(reply, 'Email sudah dipakai akun portal lain', 409);
    console.error('[admin.createPortalUser]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function updatePortalUser(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID akun portal tidak valid');

  const b = request.body || {};
  const nama = b.nama !== undefined ? (b.nama ? String(b.nama).trim() : null) : undefined;
  const role = b.role !== undefined ? String(b.role).toLowerCase() : undefined;
  const aktif = b.aktif !== undefined ? bool(b.aktif, true) : undefined;
  const password = b.password !== undefined ? String(b.password) : undefined;

  if (role !== undefined && !['operator', 'admin_mitra'].includes(role)) {
    return gagalValidasi(reply, 'Role tidak valid');
  }
  if (password !== undefined && password !== '' && password.length < 8) {
    return gagalValidasi(reply, 'Password minimal 8 karakter');
  }

  try {
    const ada = await query(`SELECT 1 FROM t_portal_user WHERE id_portal_user = $1`, [id]);
    if (!ada.length) return gagal(reply, 'Akun portal tidak ditemukan', 404);

    // Hanya field yang dikirim yang diubah. Password hanya diubah bila diisi,
    // supaya menyimpan form tanpa mengganti password tidak mengosongkannya.
    if (nama !== undefined) {
      await query(`UPDATE t_portal_user SET nama=$1, updated_at=now() WHERE id_portal_user=$2`, [nama, id]);
    }
    if (role !== undefined) {
      await query(`UPDATE t_portal_user SET role=$1, updated_at=now() WHERE id_portal_user=$2`, [role, id]);
    }
    if (aktif !== undefined) {
      await query(`UPDATE t_portal_user SET aktif=$1, updated_at=now() WHERE id_portal_user=$2`, [aktif, id]);
    }
    if (password !== undefined && password !== '') {
      await query(
        `UPDATE t_portal_user SET password_hash=$1, updated_at=now() WHERE id_portal_user=$2`,
        [hashPassword(password), id]
      );
    }

    return ok(reply, 'Akun portal diperbarui', { id_portal_user: id });
  } catch (err) {
    console.error('[admin.updatePortalUser]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function deletePortalUser(request, reply) {
  const id = angka(request.params && request.params.id);
  if (!id) return gagalValidasi(reply, 'ID akun portal tidak valid');

  try {
    // Hard delete aman: t_promo_peserta.id_portal_user ON DELETE SET NULL,
    // jadi riwayat peserta tidak ikut hilang.
    const res = await db.run(`DELETE FROM t_portal_user WHERE id_portal_user = $1`, [id]);
    if (res.rowCount === 0) return gagal(reply, 'Akun portal tidak ditemukan', 404);
    return ok(reply, 'Akun portal dihapus', { id_portal_user: id });
  } catch (err) {
    console.error('[admin.deletePortalUser]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

module.exports = {
  listMitra, createMitra, updateMitra, deleteMitra,
  resetApiKey, deleteApiKey,
  listPromo, detailPromo, createPromo, updatePromo, deletePromo, tutupPeriode,
  listIklan, createIklan, updateIklan, deleteIklan,
  listPeserta, createPeserta, deletePeserta,
  listPemakaian, listEksposur,
  listPortalUser, createPortalUser, updatePortalUser, deletePortalUser,
};
