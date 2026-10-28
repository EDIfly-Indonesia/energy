'use strict';

/**
 * Endpoint promo untuk aplikasi mobile — API-PROMO.md §11.
 *
 * Batas tayang iklan dihitung PER PENGGUNA (keputusan #4), memakai
 * fn_promo_iklan_untuk_user(). View v_promo_iklan_tayang_hari_ini tetap
 * global dan hanya untuk monitoring admin.
 */

const db = require('../services/database.service');
const { query } = db;
const { tokenUserId } = require('../services/permission');

const BASE_FOTO = process.env.PROMO_FOTO_URL
  || 'https://energy.edifly-si.com/spklu/dashboard/uploads/promo/';

function gagal(reply, message, code) {
  if (code) reply.code(code);
  return reply.send({ success: false, message, data: null });
}

async function listIklan(request, reply) {
  const idUser = tokenUserId(request);
  if (idUser === null) return gagal(reply, 'invalid0', 401);

  try {
    const rows = await query(
      `SELECT id_iklan, id_promo, kode_promo, nama_promo, nama_mitra,
              foto, judul, target_url, urutan,
              maks_tayang_per_hari, tayang_hari_ini, masih_bisa_tayang
         FROM fn_promo_iklan_untuk_user($1, CURRENT_DATE)`,
      [idUser]
    );

    // Hanya kirim yang masih boleh tayang: klien tidak perlu tahu aturannya.
    const data = rows
      .filter((r) => r.masih_bisa_tayang)
      .map((r) => ({
        id_iklan: r.id_iklan,
        id_promo: r.id_promo,
        kode_promo: r.kode_promo,
        nama_promo: r.nama_promo,
        nama_mitra: r.nama_mitra,
        // URL dibentuk server: mobile tidak perlu tahu base path.
        foto_url: `${BASE_FOTO}${r.foto}`,
        judul: r.judul,
        target_url: r.target_url,
        urutan: r.urutan,
        masih_bisa_tayang: true,
      }));

    return reply.send({ success: true, message: 'Berhasil', data });
  } catch (err) {
    console.error('[promo.listIklan]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

async function catatTayang(request, reply) {
  const idUser = tokenUserId(request);
  if (idUser === null) return gagal(reply, 'invalid0', 401);

  const idIklan = Number(request.params && request.params.id);
  if (!Number.isFinite(idIklan) || idIklan <= 0) {
    return gagal(reply, 'ID iklan tidak valid', 400);
  }

  try {
    const iklan = await query(
      `SELECT i.id_iklan, i.maks_tayang_per_hari, i.aktif, p.aktif AS promo_aktif
         FROM t_promo_iklan i
         JOIN t_promo p ON p.id_promo = i.id_promo
        WHERE i.id_iklan = $1`,
      [idIklan]
    );
    if (!iklan.length || !iklan[0].aktif || !iklan[0].promo_aktif) {
      return gagal(reply, 'Iklan tidak ditemukan', 404);
    }

    const t = await query(
      `SELECT count(*)::int AS n FROM t_promo_iklan_tayang
        WHERE id_iklan = $1 AND id_user = $2 AND tanggal = CURRENT_DATE`,
      [idIklan, idUser]
    );
    const sudah = t[0] ? t[0].n : 0;
    const maks = iklan[0].maks_tayang_per_hari;

    // Batas dihitung per pengguna. Bila sudah penuh, jangan catat lagi —
    // klien yang memanggil berulang tidak boleh menggembungkan angka.
    if (maks !== null && sudah >= maks) {
      return reply.send({
        success: true,
        message: 'Batas tayang harian sudah tercapai',
        data: { id_iklan: idIklan, tayang_hari_ini: sudah, maks_tayang_per_hari: maks },
      });
    }

    await query(
      `INSERT INTO t_promo_iklan_tayang (id_iklan, id_user, tanggal)
       VALUES ($1, $2, CURRENT_DATE)`,
      [idIklan, idUser]
    );

    return reply.send({
      success: true,
      message: 'Dicatat',
      data: { id_iklan: idIklan, tayang_hari_ini: sudah + 1, maks_tayang_per_hari: maks },
    });
  } catch (err) {
    console.error('[promo.catatTayang]', err);
    return gagal(reply, 'Terjadi kesalahan');
  }
}

module.exports = { listIklan, catatTayang };
