'use strict';

/**
 * Admin modules: mitra, setting, wallet (refund/topup), pengguna (admin users).
 * Native Fastify handlers. Additive — does not touch mobile endpoints.
 * PostgreSQL-backed.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../services/database.service');
const { query } = db;
const { ownerFilter } = require('../services/permission');
const { encryptSecret } = require('../configs/secret');

// ------------------------------------------------------------------ MITRA

async function listMitra(request, reply) {
  try {
    const f = ownerFilter(request.admin, 'id_mitra');
    const rows = await query(
      `SELECT id_mitra AS id, name, email, no_hp AS telp FROM t_mitra WHERE deleted_at IS NULL AND id_mitra > 0${f.sql} ORDER BY name ASC`,
      f.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listMitra]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function createMitra(request, reply) {
  const b = request.body || {};
  if (!b.name) {
    return reply.send({ success: false, message: 'Nama mitra wajib diisi', data: null });
  }
  try {
    const res = await query('INSERT INTO t_mitra (name, email, no_hp) VALUES ($1, $2, $3) RETURNING id_mitra', [
      b.name,
      b.email ?? null,
      b.no_hp ?? null,
    ]);
    return reply.send({ success: true, message: 'Berhasil disimpan', data: { id_mitra: res[0].id_mitra } });
  } catch (err) {
    console.error('[admin.createMitra]', err);
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

async function updateMitra(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  if (!b.name) {
    return reply.send({ success: false, message: 'Nama mitra wajib diisi', data: null });
  }
  try {
    await query('UPDATE t_mitra SET name=$1, email=$2, no_hp=$3 WHERE id_mitra=$4', [
      b.name,
      b.email ?? null,
      b.no_hp ?? null,
      id,
    ]);
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateMitra]', err);
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

// Tabel yang menyimpan id_mitra sebagai referensi. TIDAK ADA foreign key ke
// t_mitra di schema ini, jadi integritasnya harus dijaga di aplikasi: mitra
// yang id-nya masih dipakai entitas lain tidak boleh dihapus (mencegah orphan).
// CATATAN: t_transaction2 & t_member sudah DIHAPUS dari database
// (migrations/2026-10-23_cleanup_dead_tables.sql) — jangan dimasukkan lagi,
// kalau tidak query count akan gagal "relation does not exist".
const MITRA_REFERENCES = [
  { table: 't_chargebox', label: 'Chargebox' },
  { table: 't_user_mobile', label: 'Pelanggan' },
  { table: 't_users_admin', label: 'Pengguna admin' },
  { table: 't_transaction', label: 'Transaksi' },
  { table: 't_jenismember', label: 'Jenis member' },
  { table: 't_biaya', label: 'Biaya' },
  { table: 't_besar_biaya', label: 'Besar biaya' },
];

// Hitung pemakaian id_mitra di semua tabel terkait.
async function countMitraReferences(idMitra) {
  const counts = await Promise.all(
    MITRA_REFERENCES.map(async ({ table, label }) => {
      const rows = await query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE id_mitra = $1`, [idMitra]);
      return { table, label, n: rows[0].n };
    })
  );
  return counts.filter((c) => c.n > 0);
}

async function deleteMitra(request, reply) {
  const id = request.params.id;
  try {
    const existing = await query('SELECT id_mitra, name, deleted_at FROM t_mitra WHERE id_mitra=$1', [id]);
    if (existing.length === 0) {
      return reply.send({ success: false, message: 'Mitra tidak ditemukan', data: null });
    }
    if (existing[0].deleted_at) {
      return reply.send({ success: false, message: 'Mitra sudah dihapus', data: null });
    }

    // Tolak bila id mitra masih dipakai entitas lain.
    const used = await countMitraReferences(id);
    if (used.length > 0) {
      const detail = used.map((u) => `${u.label}: ${u.n}`).join(', ');
      return reply.send({
        success: false,
        message: `Mitra tidak dapat dihapus karena masih digunakan oleh ${detail}. Pindahkan atau hapus data tersebut terlebih dahulu.`,
        data: { references: used },
      });
    }

    await query('UPDATE t_mitra SET deleted_at=now() WHERE id_mitra=$1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteMitra]', err);
    return reply.send({ success: false, message: 'Gagal menghapus data', data: null });
  }
}

// ---------------------------------------------------------------- SETTING

async function getSetting(request, reply) {
  try {
    const names = ['ppn', 'pbjt', 'admin_wallet', 'admin_wallet_sandbox',
                   'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_from'];
    const out = {};
    for (const n of names) {
      const rows = await query('SELECT value_setting FROM t_setting WHERE nama_setting=$1', [n]);
      out[n] = rows.length ? rows[0].value_setting : null;
    }
    // smtp_pass bersifat write-only: nilainya TIDAK dikembalikan, cukup status terisi/belum.
    const p = await query('SELECT value_setting FROM t_setting WHERE nama_setting=$1', ['smtp_pass']);
    out.smtp_pass_set = !!(p.length && p[0].value_setting);
    return reply.send({ success: true, message: 'Berhasil', data: out });
  } catch (err) {
    console.error('[admin.getSetting]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function updateSetting(request, reply) {
  const b = request.body || {};
  const map = {
    ppn: 'ppn',
    pbjt: 'pbjt',
    admin_wallet: 'admin_wallet',
    admin_wallet_sandbox: 'admin_wallet_sandbox',
    smtp_host: 'smtp_host',
    smtp_port: 'smtp_port',
    smtp_secure: 'smtp_secure',
    smtp_user: 'smtp_user',
    smtp_from: 'smtp_from',
  };
  try {
    for (const [key, nama] of Object.entries(map)) {
      if (b[key] !== undefined && b[key] !== null && b[key] !== '') {
        await query(
          `INSERT INTO t_setting (nama_setting, value_setting) VALUES ($1,$2)
           ON CONFLICT (nama_setting) DO UPDATE SET value_setting=EXCLUDED.value_setting, updated_at=now()`,
          [nama, String(b[key])]
        );
      }
    }
    // smtp_pass hanya diubah bila dikirim non-kosong (write-only), disimpan terenkripsi.
    if (b.smtp_pass) {
      await query(
        `INSERT INTO t_setting (nama_setting, value_setting) VALUES ($1,$2)
         ON CONFLICT (nama_setting) DO UPDATE SET value_setting=EXCLUDED.value_setting, updated_at=now()`,
        ['smtp_pass', encryptSecret(String(b.smtp_pass))]
      );
    }
    return reply.send({ success: true, message: 'Berhasil disimpan', data: null });
  } catch (err) {
    console.error('[admin.updateSetting]', err);
    return reply.send({ success: false, message: 'Gagal menyimpan', data: null });
  }
}

// ----------------------------------------------------------------- WALLET

async function listRefund(request, reply) {
  try {
    const f = ownerFilter(request.admin, 'u.id_mitra');
    const rows = await query(
      `SELECT r.id, r.no_trans, r.jml_transaksi, r.jumlah AS jml_refund, r.status, r.tgl_buat, r.tgl_done,
              u.nama, u.email, u.no_hp
       FROM t_refund r JOIN t_user_mobile u ON r.id_user = u.id_user
       WHERE r.id > 0${f.sql} ORDER BY r.id DESC LIMIT 200`,
      f.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listRefund]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function markRefundDone(request, reply) {
  const id = request.params.id;
  try {
    await query("UPDATE t_refund SET status='done', tgl_done=now() WHERE id=$1", [id]);
    return reply.send({ success: true, message: 'Status diubah', data: null });
  } catch (err) {
    console.error('[admin.markRefundDone]', err);
    return reply.send({ success: false, message: 'Gagal mengubah status', data: null });
  }
}

async function listTopup(request, reply) {
  try {
    const f = ownerFilter(request.admin, 'u.id_mitra');
    const rows = await query(
      `SELECT r.id_topup AS id, r.no_trans, r.jumlah AS jml_topup, r.tgl_topup, r.tgl_expired, r.status_topup,
              u.nama, u.email, u.no_hp
       FROM t_topup r JOIN t_user_mobile u ON r.id_user = u.id_user
       WHERE r.id_topup > 0${f.sql} ORDER BY r.id_topup DESC LIMIT 200`,
      f.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listTopup]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// --------------------------------------------------------------- PENGGUNA

async function listAdminUser(request, reply) {
  try {
    const rows = await query(
      `SELECT u.id, u.code, u.name, u.email, a.code AS hakakses, a.id AS idhakakses, u.id_role,
              (CASE WHEN u.verified=1 THEN 'aktif' ELSE 'belum aktif' END) AS status, u.type_id
       FROM t_users_admin u JOIN t_user_type a ON u.type_id = a.id
       WHERE u.id > 0 ORDER BY u.id ASC`
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listAdminUser]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function listRole(request, reply) {
  try {
    const rows = await query('SELECT id, code FROM t_user_type ORDER BY id ASC');
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listRole]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function createAdminUser(request, reply) {
  const b = request.body || {};
  if (!b.code || !b.name || !b.email || !b.password) {
    return reply.send({ success: false, message: 'Code, nama, email, password wajib diisi', data: null });
  }
  try {
    const passhash = await bcrypt.hash(String(b.password), 10);
    const verification = crypto.randomBytes(16).toString('hex');
    const res = await query(
      `INSERT INTO t_users_admin (code, name, email, password, type_id, foto, id_role, verified, verification)
       VALUES ($1, $2, $3, $4, $5, 'profil2.jpg', $6, 1, $7)
       RETURNING id`,
      [b.code, b.name, b.email, passhash, Number(b.type_id) || 1, Number(b.id_role) || 0, verification]
    );
    return reply.send({ success: true, message: 'Berhasil disimpan', data: { id: res[0].id } });
  } catch (err) {
    console.error('[admin.createAdminUser]', err);
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

async function updateAdminUser(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  try {
    await query('UPDATE t_users_admin SET name=$1, email=$2, type_id=$3, id_role=$4 WHERE id=$5', [
      b.name,
      b.email,
      Number(b.type_id) || 1,
      Number(b.id_role) || 0,
      id,
    ]);
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateAdminUser]', err);
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

module.exports = {
  listMitra,
  createMitra,
  updateMitra,
  deleteMitra,
  getSetting,
  updateSetting,
  listRefund,
  markRefundDone,
  listTopup,
  listAdminUser,
  listRole,
  createAdminUser,
  updateAdminUser,
};
