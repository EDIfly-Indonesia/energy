'use strict';

/**
 * Daftar kendaraan milik pengguna (fitur profil).
 *
 * Tabel: t_user_kendaraan. Satu baris = satu unit kendaraan. Pengguna boleh
 * punya lebih dari satu unit, termasuk merek yang sama (index unik hanya
 * berlaku untuk baris yang dibuat endpoint ATPM).
 *
 * KENAPA id_mitra_promo DIISI OTOMATIS
 * Validasi promo ATPM mencocokkan `t_user_kendaraan.id_mitra_promo` dengan
 * mitra promo. Bila merek yang diinput cocok dengan `t_promo_mitra.kode` atau
 * namanya, id mitra diisi sehingga kendaraan ini langsung memenuhi syarat
 * promo ATPM terkait. Bila tidak cocok, dibiarkan NULL — kendaraan tetap
 * tersimpan dan tidak memblokir apa pun.
 *
 * KEAMANAN
 * Semua operasi memakai id_user dari TOKEN (tokenUserId), tidak pernah dari
 * body/query. Setiap UPDATE/DELETE menyertakan `AND id_user = $n` sehingga
 * pengguna tidak bisa menyentuh kendaraan orang lain meski menebak id-nya.
 */

const db = require('../services/database.service');
const { query } = db;
const { tokenUserId } = require('../services/permission');

const MAKS_KENDARAAN = 20;

function gagal(res, message, code) {
  if (code) res.status(code);
  return res.send({ success: false, message, data: null });
}

function ok(res, message, data) {
  return res.send({ success: true, message, data });
}

function angka(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validasi + normalisasi body. Dipakai create dan update supaya aturannya
 * tidak bisa berbeda.
 */
function normalisasi(b) {
  const merek = String(b.merek ?? '').trim();
  if (!merek) return { ok: false, message: 'Merek kendaraan wajib diisi' };
  if (merek.length > 60) return { ok: false, message: 'Merek maksimal 60 karakter' };

  const tipe = b.tipe ? String(b.tipe).trim() : null;
  if (tipe && tipe.length > 60) return { ok: false, message: 'Tipe maksimal 60 karakter' };

  const tahun = angka(b.tahun);
  if (tahun !== null) {
    // Batas longgar: kendaraan listrik di Indonesia baru masuk ~2020, tapi
    // pengguna mungkin mendaftarkan mobil lama. Jangan menolak yang wajar.
    if (tahun < 1950 || tahun > 2100) {
      return { ok: false, message: 'Tahun kendaraan tidak valid (1950-2100)' };
    }
  }

  const nomorPolisi = b.nomor_polisi ? String(b.nomor_polisi).trim().toUpperCase() : null;
  if (nomorPolisi && nomorPolisi.length > 20) {
    return { ok: false, message: 'Nomor polisi maksimal 20 karakter' };
  }

  const vin = b.vin ? String(b.vin).trim().toUpperCase() : null;
  if (vin) {
    // VIN standar 17 karakter, tapi sebagian dokumen Indonesia mencantumkan
    // nomor rangka lebih pendek. Terima 5-30 agar tidak menolak data sah.
    if (vin.length < 5 || vin.length > 30) {
      return { ok: false, message: 'Nomor rangka/VIN harus 5-30 karakter' };
    }
  }

  return {
    ok: true,
    value: { merek, tipe, tahun, nomor_polisi: nomorPolisi, vin },
  };
}

/**
 * Cari mitra promo yang cocok dengan merek kendaraan.
 *
 * Dicocokkan ke `kode` dulu (biasanya singkatan merek, mis. "BYD"), lalu ke
 * `nama` sebagai cadangan. Hanya mitra aktif yang dipakai.
 * Mengembalikan id_mitra_promo atau null.
 */
async function resolveMitra(merek) {
  const cari = merek.trim().toLowerCase();
  if (!cari) return null;

  const rows = await query(
    `SELECT id_mitra_promo
       FROM t_promo_mitra
      WHERE aktif
        AND (lower(kode) = $1 OR lower(nama) = $1)
      ORDER BY (lower(kode) = $1) DESC
      LIMIT 1`,
    [cari]
  );
  return rows.length ? rows[0].id_mitra_promo : null;
}

// ------------------------------------------------------------------- LIST

async function listKendaraan(req, res) {
  const idUser = tokenUserId(req);
  if (idUser === null) return gagal(res, 'invalid0', 401);

  try {
    const rows = await query(
      `SELECT k.id_kendaraan, k.merek, k.tipe, k.tahun, k.vin, k.nomor_polisi,
              k.aktif, k.sumber, k.id_mitra_promo,
              m.nama AS nama_mitra,
              k.created_at, k.updated_at
         FROM t_user_kendaraan k
         LEFT JOIN t_promo_mitra m ON m.id_mitra_promo = k.id_mitra_promo
        WHERE k.id_user = $1
        ORDER BY k.aktif DESC, k.id_kendaraan DESC`,
      [idUser]
    );
    return ok(res, 'Berhasil', rows);
  } catch (err) {
    console.error('[kendaraan.list]', err);
    return gagal(res, 'Terjadi kesalahan');
  }
}

// ----------------------------------------------------------------- CREATE

async function createKendaraan(req, res) {
  const idUser = tokenUserId(req);
  if (idUser === null) return gagal(res, 'invalid0', 401);

  const n = normalisasi(req.body || {});
  if (!n.ok) return gagal(res, n.message, 400);
  const v = n.value;

  try {
    const jumlah = await query(
      `SELECT count(*)::int AS n FROM t_user_kendaraan WHERE id_user = $1 AND aktif`,
      [idUser]
    );
    if (jumlah[0].n >= MAKS_KENDARAAN) {
      return gagal(res, `Maksimal ${MAKS_KENDARAAN} kendaraan per akun`, 409);
    }

    const idMitra = await resolveMitra(v.merek);

    const ins = await query(
      `INSERT INTO t_user_kendaraan
         (id_user, id_mitra_promo, merek, tipe, tahun, vin, nomor_polisi, aktif, sumber)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,'app')
       RETURNING id_kendaraan`,
      [idUser, idMitra, v.merek, v.tipe, v.tahun, v.vin, v.nomor_polisi]
    );

    return ok(res, 'Kendaraan ditambahkan', {
      id_kendaraan: ins[0].id_kendaraan,
      id_mitra_promo: idMitra,
    });
  } catch (err) {
    if (err.code === '23505') {
      return gagal(res, 'Nomor rangka/VIN ini sudah terdaftar di akun Anda', 409);
    }
    console.error('[kendaraan.create]', err);
    return gagal(res, 'Terjadi kesalahan');
  }
}

// ----------------------------------------------------------------- UPDATE

async function updateKendaraan(req, res) {
  const idUser = tokenUserId(req);
  if (idUser === null) return gagal(res, 'invalid0', 401);

  const id = angka(req.params && req.params.id);
  if (!id) return gagal(res, 'ID kendaraan tidak valid', 400);

  const n = normalisasi(req.body || {});
  if (!n.ok) return gagal(res, n.message, 400);
  const v = n.value;

  try {
    const ada = await query(
      `SELECT id_mitra_promo, sumber FROM t_user_kendaraan
        WHERE id_kendaraan = $1 AND id_user = $2`,
      [id, idUser]
    );
    if (!ada.length) return gagal(res, 'Kendaraan tidak ditemukan', 404);

    // Baris yang diklaim ATPM tidak boleh diubah mereknya dari aplikasi:
    // klaim merek itu dasar kelayakan promo, dan ATPM yang memegang datanya.
    if (ada[0].sumber === 'atpm_endpoint') {
      const idMitra = await resolveMitra(v.merek);
      if (Number(idMitra) !== Number(ada[0].id_mitra_promo)) {
        return gagal(
          res,
          'Kendaraan ini terdaftar oleh ATPM. Merek tidak bisa diubah dari aplikasi.',
          409
        );
      }
    }

    const idMitra = await resolveMitra(v.merek);

    await query(
      `UPDATE t_user_kendaraan
          SET merek=$1, tipe=$2, tahun=$3, vin=$4, nomor_polisi=$5,
              id_mitra_promo=$6, updated_at=now()
        WHERE id_kendaraan=$7 AND id_user=$8`,
      [v.merek, v.tipe, v.tahun, v.vin, v.nomor_polisi, idMitra, id, idUser]
    );

    return ok(res, 'Kendaraan diperbarui', { id_kendaraan: id });
  } catch (err) {
    if (err.code === '23505') {
      return gagal(res, 'Nomor rangka/VIN ini sudah terdaftar di akun Anda', 409);
    }
    console.error('[kendaraan.update]', err);
    return gagal(res, 'Terjadi kesalahan');
  }
}

// ----------------------------------------------------------------- DELETE

async function deleteKendaraan(req, res) {
  const idUser = tokenUserId(req);
  if (idUser === null) return gagal(res, 'invalid0', 401);

  const id = angka(req.params && req.params.id);
  if (!id) return gagal(res, 'ID kendaraan tidak valid', 400);

  try {
    // `AND id_user` wajib: tanpa ini pengguna bisa menghapus kendaraan orang
    // lain hanya dengan menebak id_kendaraan.
    const del = await db.run(
      `DELETE FROM t_user_kendaraan WHERE id_kendaraan = $1 AND id_user = $2`,
      [id, idUser]
    );
    if (del.rowCount === 0) return gagal(res, 'Kendaraan tidak ditemukan', 404);
    return ok(res, 'Kendaraan dihapus', { id_kendaraan: id });
  } catch (err) {
    console.error('[kendaraan.delete]', err);
    return gagal(res, 'Terjadi kesalahan');
  }
}

module.exports = { listKendaraan, createKendaraan, updateKendaraan, deleteKendaraan };
