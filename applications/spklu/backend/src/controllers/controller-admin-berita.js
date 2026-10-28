'use strict';

/**
 * Admin CRUD untuk artikel berita (t_berita) — konten yang dibaca aplikasi
 * mobile lewat POST /informasi/getberita.
 *
 * JANGAN tertukar dengan tabel `berita` (tanpa awalan t_): itu feed notifikasi
 * per user, dibaca lewat /informasi/getberita_user. Tabel ini `t_berita`:
 * artikel/news dengan jangkauan geografis.
 *
 * Catatan penting soal `radius`: kolomnya disimpan dalam MIL, bukan km.
 * Query mobile menghitung jarak dalam km lalu membandingkan dengan
 * `radius * 0.621371` (mil -> km). API di sini memakai KM supaya admin tidak
 * harus memikirkan mil, dan mengonversi di batas ini saja. Jangan "merapikan"
 * penyimpanan menjadi km tanpa mengubah query mobile, karena hasilnya filter
 * radius jadi 0.62x lebih sempit tanpa gejala yang jelas.
 */

const db = require('../services/database.service');
const { query } = db;

const MILES_PER_KM = 0.621371;
const JANGKAUAN = ['semua', 'radius'];
const JENIS = ['app', 'web'];

function gagal(reply, message) {
  return reply.send({ success: false, message, data: null });
}

/** YYYY-MM-DD dan tanggalnya benar-benar ada (bukan 2026-02-31). */
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

/**
 * Validasi + normalisasi body. Mengembalikan { ok, message, value }.
 * Dipakai create dan update supaya aturannya tidak bisa berbeda.
 */
function normalisasi(b) {
  const judul = String(b.judul ?? '').trim();
  if (!judul) return { ok: false, message: 'Judul wajib diisi' };
  if (judul.length > 255) return { ok: false, message: 'Judul maksimal 255 karakter' };

  const isi = String(b.berita ?? '').trim();
  if (!isi) return { ok: false, message: 'Isi berita wajib diisi' };

  if (!tanggalValid(b.tgl_terbit)) {
    return { ok: false, message: 'Tanggal terbit wajib diisi dengan format YYYY-MM-DD' };
  }

  const jangkauan = String(b.jangkauan ?? 'semua').toLowerCase();
  if (!JANGKAUAN.includes(jangkauan)) {
    return { ok: false, message: `Jangkauan tidak valid. Pilihan: ${JANGKAUAN.join(', ')}` };
  }

  const jenis = String(b.jenis_berita ?? 'app').toLowerCase();
  if (!JENIS.includes(jenis)) {
    return { ok: false, message: `Jenis berita tidak valid. Pilihan: ${JENIS.join(', ')}` };
  }

  const status = b.status === undefined || b.status === null ? 1 : Number(b.status);
  if (status !== 0 && status !== 1) {
    return { ok: false, message: 'Status tidak valid. Pilihan: 1 (tampil) atau 0 (draft)' };
  }

  let lat = null;
  let lng = null;
  let radiusMil = 0;

  if (jangkauan === 'radius') {
    lat = angka(b.pusat_latitude);
    lng = angka(b.pusat_longitude);
    if (lat === null || lat < -90 || lat > 90) {
      return { ok: false, message: 'Latitude pusat wajib diisi (-90 sampai 90)' };
    }
    if (lng === null || lng < -180 || lng > 180) {
      return { ok: false, message: 'Longitude pusat wajib diisi (-180 sampai 180)' };
    }
    const radiusKm = angka(b.radius_km);
    if (radiusKm === null || radiusKm <= 0) {
      return { ok: false, message: 'Radius wajib diisi lebih dari 0 km untuk jangkauan radius' };
    }
    radiusMil = radiusKm * MILES_PER_KM;
  }

  const url = String(b.url ?? '').trim();
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, message: 'URL harus diawali http:// atau https://' };
  }

  return {
    ok: true,
    value: {
      judul,
      berita: isi,
      tgl_terbit: b.tgl_terbit,
      jangkauan,
      // Kolom NOT NULL tanpa default: isi nilai netral saat jangkauan 'semua'.
      radius: radiusMil,
      pusat_latitude: lat === null ? '0' : String(lat),
      pusat_longitude: lng === null ? '0' : String(lng),
      jenis_berita: jenis,
      status,
      url: url || null,
      foto: String(b.foto ?? '').trim(),
    },
  };
}

/** varchar(20) untuk kolom pembuat. */
function namaPembuat(request) {
  const admin = request.admin || {};
  const identitas = String(admin.code || admin.name || admin.email || 'admin');
  return identitas.slice(0, 20);
}

async function listBerita(request, reply) {
  try {
    const rows = await query(
      // tgl_terbit WAJIB dikembalikan sebagai teks 'YYYY-MM-DD', bukan Date.
      // Kolomnya `date`, dan driver pg mem-parse-nya menjadi Date pada tengah
      // malam waktu LOKAL; saat diserialisasi ke JSON nilainya menjadi UTC dan
      // bergeser ke hari sebelumnya (WIB = UTC+7, jadi 2026-10-20 00:00 WIB
      // menjadi "2026-10-19T17:00:00.000Z"). Klien yang mengambil 10 karakter
      // pertama akan menampilkan tanggal yang salah, dan menyimpan ulang akan
      // memundurkan tanggal terbit satu hari setiap kali edit.
      `SELECT id_berita, to_char(tgl_terbit, 'YYYY-MM-DD') AS tgl_terbit,
              tgl_buat, pembuat, jangkauan, radius,
              pusat_latitude, pusat_longitude, judul, berita, foto, status,
              jenis_berita, url,
              (radius / $1::double precision) AS radius_km
         FROM t_berita
        ORDER BY id_berita DESC`,
      [MILES_PER_KM]
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listBerita]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function createBerita(request, reply) {
  const n = normalisasi(request.body || {});
  if (!n.ok) return gagal(reply, n.message);
  const v = n.value;

  try {
    const res = await query(
      `INSERT INTO t_berita
         (tgl_terbit, tgl_buat, pembuat, jangkauan, radius, pusat_latitude,
          pusat_longitude, judul, berita, foto, status, jenis_berita, url)
       VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id_berita`,
      [
        v.tgl_terbit, namaPembuat(request), v.jangkauan, v.radius,
        v.pusat_latitude, v.pusat_longitude, v.judul, v.berita, v.foto,
        v.status, v.jenis_berita, v.url,
      ]
    );
    return reply.send({
      success: true,
      message: 'Berhasil disimpan',
      data: { id_berita: res[0].id_berita },
    });
  } catch (err) {
    console.error('[admin.createBerita]', err);
    return gagal(reply, 'Gagal menyimpan berita');
  }
}

async function updateBerita(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID berita tidak valid');

  const n = normalisasi(request.body || {});
  if (!n.ok) return gagal(reply, n.message);
  const v = n.value;

  try {
    const res = await query(
      `UPDATE t_berita
          SET tgl_terbit = $1, jangkauan = $2, radius = $3, pusat_latitude = $4,
              pusat_longitude = $5, judul = $6, berita = $7, foto = $8,
              status = $9, jenis_berita = $10, url = $11
        WHERE id_berita = $12
        RETURNING id_berita`,
      [
        v.tgl_terbit, v.jangkauan, v.radius, v.pusat_latitude, v.pusat_longitude,
        v.judul, v.berita, v.foto, v.status, v.jenis_berita, v.url, id,
      ]
    );
    if (res.length === 0) return gagal(reply, 'Berita tidak ditemukan');
    return reply.send({ success: true, message: 'Berhasil diubah', data: { id_berita: id } });
  } catch (err) {
    console.error('[admin.updateBerita]', err);
    return gagal(reply, 'Gagal mengubah berita');
  }
}

async function deleteBerita(request, reply) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) return gagal(reply, 'ID berita tidak valid');

  try {
    const res = await query('DELETE FROM t_berita WHERE id_berita = $1 RETURNING id_berita', [id]);
    if (res.length === 0) return gagal(reply, 'Berita tidak ditemukan');
    return reply.send({ success: true, message: 'Berhasil dihapus', data: { id_berita: id } });
  } catch (err) {
    console.error('[admin.deleteBerita]', err);
    return gagal(reply, 'Gagal menghapus berita');
  }
}

module.exports = { listBerita, createBerita, updateBerita, deleteBerita };
