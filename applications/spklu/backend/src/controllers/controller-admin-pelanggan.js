'use strict';

/**
 * Admin "Pelanggan" — mobile app users (t_user_mobile) plus their full
 * payment/transaction history and balance.
 *
 * Read model spans: t_user_mobile, t_saldo_user, t_kwh_user, t_topup,
 * t_refund, t_transaction, t_histori_saldo, with t_carabayar (payment method
 * labels), t_bankwithdrawl (bank list) and t_jenismember/t_mitra as lookups.
 *
 * NOTE: there is no per-user withdrawal table — t_bankwithdrawl is a MASTER
 * list of banks used by the DOKU withdrawal call, and withdrawal requests are
 * not persisted locally. It is exposed as a lookup, not as history.
 *
 * Native Fastify handlers, additive to the frozen mobile API.
 */

const bcrypt = require('bcryptjs');
const db = require('../services/database.service');
const { query } = db;
const { ownerScope } = require('../services/permission');

const BCRYPT_COST = 10;

// Non-super/admin users linked to a mitra only see their own customers.
function scope(request) {
  const id = ownerScope(request.admin);
  return id ? { sql: ' AND u.id_mitra = $1', params: [id] } : { sql: '', params: [] };
}

function intOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ------------------------------------------------------------------- LOOKUPS

async function lookups(request, reply) {
  try {
    const [carabayar, bank, jenismember, mitra] = await Promise.all([
      query('SELECT id_carabayar, nama_carabayar, bank, status FROM t_carabayar ORDER BY id_carabayar ASC'),
      query('SELECT id, bank_name, bank_code, status FROM t_bankwithdrawl WHERE status=1 ORDER BY bank_name ASC'),
      query('SELECT id_jenismember, nama_member FROM t_jenismember ORDER BY id_jenismember ASC'),
      query('SELECT id_mitra, name FROM t_mitra WHERE deleted_at IS NULL AND id_mitra > 0 ORDER BY name ASC'),
    ]);
    return reply.send({
      success: true,
      message: 'Berhasil',
      data: { carabayar, bank, jenismember, mitra },
    });
  } catch (err) {
    console.error('[admin.pelanggan.lookups]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// ---------------------------------------------------------------------- LIST

async function list(request, reply) {
  try {
    const s = scope(request);
    const rows = await query(
      `SELECT u.id_user, u.nama, u.email, u.no_hp, u.id_mitra, m.name AS mitra,
              u.id_jenismember, j.nama_member AS jenis_member,
              u.id_wallet, u.created_at, u.updated_at, u.deleted_at,
              COALESCE(s.saldo, 0)::float AS saldo,
              COALESCE(k.ttl, 0)::int AS kwh_bulan_ini
         FROM t_user_mobile u
         -- t_user_mobile.id_mitra TIDAK punya FK ke t_mitra, dan t_mitra memakai
         -- soft delete. Tanpa filter deleted_at, pelanggan tetap tampil terhubung
         -- ke mitra yang sudah dihapus (mis. Gemes). Hasilnya NULL -> tampil '-'.
         LEFT JOIN t_mitra m ON m.id_mitra = u.id_mitra AND m.deleted_at IS NULL
         LEFT JOIN t_jenismember j ON j.id_jenismember = u.id_jenismember
         LEFT JOIN LATERAL (
              SELECT saldo FROM t_saldo_user WHERE id_user = u.id_user ORDER BY id DESC LIMIT 1
         ) s ON TRUE
         LEFT JOIN LATERAL (
              SELECT ttl FROM t_kwh_user WHERE id_user = u.id_user ORDER BY last_update DESC LIMIT 1
         ) k ON TRUE
        WHERE u.id_user > 0${s.sql}
        ORDER BY u.id_user ASC`,
      s.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.pelanggan.list]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// -------------------------------------------------------------------- DETAIL

async function detail(request, reply) {
  const id = request.params.id;
  try {
    const s = scope(request);
    const rows = await query(
      `SELECT u.id_user, u.nama, u.email, u.no_hp, u.id_mitra, m.name AS mitra,
              u.id_jenismember, j.nama_member AS jenis_member,
              u.id_wallet, u.apple_id, u.created_at, u.updated_at, u.deleted_at,
              COALESCE(s.saldo, 0)::float AS saldo,
              COALESCE(k.ttl, 0)::int AS kwh_bulan_ini
         FROM t_user_mobile u
         -- Lihat catatan di list(): mitra soft-deleted harus dianggap tidak terhubung.
         LEFT JOIN t_mitra m ON m.id_mitra = u.id_mitra AND m.deleted_at IS NULL
         LEFT JOIN t_jenismember j ON j.id_jenismember = u.id_jenismember
         LEFT JOIN LATERAL (
              SELECT saldo FROM t_saldo_user WHERE id_user = u.id_user ORDER BY id DESC LIMIT 1
         ) s ON TRUE
         LEFT JOIN LATERAL (
              SELECT ttl FROM t_kwh_user WHERE id_user = u.id_user ORDER BY last_update DESC LIMIT 1
         ) k ON TRUE
        WHERE u.id_user = $${s.params.length + 1}${s.sql}`,
      [...s.params, id]
    );
    if (rows.length === 0) {
      return reply.send({ success: false, message: 'Pelanggan tidak ditemukan', data: null });
    }
    return reply.send({ success: true, message: 'Berhasil', data: rows[0] });
  } catch (err) {
    console.error('[admin.pelanggan.detail]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// ------------------------------------------------------------------ RIWAYAT

// Full history for one customer: topup (with payment method), refund,
// charging transactions, balance ledger and monthly kWh usage.
async function riwayat(request, reply) {
  const id = request.params.id;
  try {
    const s = scope(request);
    const own = await query(
      `SELECT u.id_user FROM t_user_mobile u WHERE u.id_user = $${s.params.length + 1}${s.sql}`,
      [...s.params, id]
    );
    if (own.length === 0) {
      return reply.send({ success: false, message: 'Pelanggan tidak ditemukan', data: null });
    }

    const [topup, refund, transaksi, historiSaldo, kwh] = await Promise.all([
      query(
        `SELECT t.id_topup, t.no_trans, t.tgl_topup, t.tgl_bayar, t.tgl_expired,
                t.jumlah::float, t.status_bayar, t.status_topup, t.id_wallet,
                t.id_carabayar, c.nama_carabayar, c.bank AS bank_carabayar
           FROM t_topup t
           LEFT JOIN t_carabayar c ON c.id_carabayar = t.id_carabayar
          WHERE t.id_user = $1
          ORDER BY t.tgl_topup DESC NULLS LAST, t.id_topup DESC`,
        [id]
      ),
      query(
        `SELECT id, no_trans, jml_transaksi::float, jumlah::float, status, tgl_buat, tgl_done
           FROM t_refund
          WHERE id_user = $1
          ORDER BY tgl_buat DESC NULLS LAST, id DESC`,
        [id]
      ),
      query(
        `SELECT t.no_trans, t.tgl_trans, t.tgl_bayar, t.chargebox_id, t.connector_id,
                cb.nama_chargebox, t.tipe_charging, t.harga_satuan::float,
                t.jml_kwh_order, t.jml_kwh_terpakai::float, t.jml_durasi_order, t.durasi_terpakai,
                t.jumlah::float, t.ppn::float, t.pbjt::float, t.pju::float,
                t.grand_total::float, t.status_bayar, t.status_transaksi,
                t.id_carabayar, c.nama_carabayar, c.bank AS bank_carabayar,
                t.ttl_refund::float, t.status_refund
           FROM t_transaction t
           LEFT JOIN t_chargebox cb ON cb.chargebox_id = t.chargebox_id
           LEFT JOIN t_carabayar c ON c.id_carabayar = t.id_carabayar
          WHERE t.id_user = $1
          ORDER BY t.tgl_trans DESC NULLS LAST, t.id DESC`,
        [id]
      ),
      query(
        `SELECT id, tgl, jumlah::float, keterangan, jenis
           FROM t_histori_saldo
          WHERE id_user = $1
          ORDER BY tgl DESC NULLS LAST, id DESC`,
        [id]
      ),
      query(
        `SELECT id, bln_ini, ttl, last_update
           FROM t_kwh_user
          WHERE id_user = $1
          ORDER BY bln_ini DESC, id DESC`,
        [id]
      ),
    ]);

    return reply.send({
      success: true,
      message: 'Berhasil',
      data: { topup, refund, transaksi, histori_saldo: historiSaldo, kwh },
    });
  } catch (err) {
    console.error('[admin.pelanggan.riwayat]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// -------------------------------------------------------------------- CREATE

async function create(request, reply) {
  const b = request.body || {};
  if (!b.nama || !b.email || !b.password) {
    return reply.send({ success: false, message: 'Nama, email, dan password wajib diisi', data: null });
  }
  const idMitra = intOrNull(b.id_mitra);
  if (!idMitra) {
    return reply.send({ success: false, message: 'Mitra wajib dipilih', data: null });
  }
  try {
    const dup = await query('SELECT 1 FROM t_user_mobile WHERE email=$1', [b.email]);
    if (dup.length) {
      return reply.send({ success: false, message: 'Email sudah terdaftar', data: null });
    }
    const passhash = await bcrypt.hash(String(b.password), BCRYPT_COST);
    // t_user_mobile triggers (tusermobile_ai) create the t_saldo_user and
    // t_kwh_user rows automatically, so no manual seeding here.
    const rows = await query(
      `INSERT INTO t_user_mobile (nama, email, no_hp, password, id_mitra, id_jenismember, id_wallet)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id_user`,
      [
        b.nama,
        b.email,
        b.no_hp ?? null,
        passhash,
        idMitra,
        intOrNull(b.id_jenismember) ?? 0,
        b.id_wallet ?? '',
      ]
    );
    return reply.send({ success: true, message: 'Berhasil disimpan', data: { id_user: rows[0].id_user } });
  } catch (err) {
    console.error('[admin.pelanggan.create]', err);
    if (err && err.code === '23505') {
      return reply.send({ success: false, message: 'Email atau nomor HP sudah terdaftar', data: null });
    }
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

// -------------------------------------------------------------------- UPDATE

async function update(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  try {
    const s = scope(request);
    const cur = await query(
      `SELECT u.id_user, u.email FROM t_user_mobile u WHERE u.id_user = $${s.params.length + 1}${s.sql}`,
      [...s.params, id]
    );
    if (cur.length === 0) {
      return reply.send({ success: false, message: 'Pelanggan tidak ditemukan', data: null });
    }

    // Password is optional on update: only re-hash when a non-empty value is sent.
    const newPass = b.password ? await bcrypt.hash(String(b.password), BCRYPT_COST) : null;

    await query(
      `UPDATE t_user_mobile SET
         nama = COALESCE($1, nama),
         email = COALESCE($2, email),
         no_hp = COALESCE($3, no_hp),
         id_mitra = COALESCE($4, id_mitra),
         id_jenismember = COALESCE($5, id_jenismember),
         id_wallet = COALESCE($6, id_wallet),
         password = COALESCE($7, password),
         updated_at = now()
       WHERE id_user = $8`,
      [
        b.nama ?? null,
        b.email ?? null,
        b.no_hp ?? null,
        intOrNull(b.id_mitra),
        intOrNull(b.id_jenismember),
        b.id_wallet ?? null,
        newPass,
        id,
      ]
    );
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.pelanggan.update]', err);
    if (err && err.code === '23505') {
      return reply.send({ success: false, message: 'Email atau nomor HP sudah dipakai pelanggan lain', data: null });
    }
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

// -------------------------------------------------------------------- DELETE

// Soft delete: t_user_mobile.deleted_at. A hard DELETE would fire
// trg_tusermobile_ad, which wipes t_saldo_user/t_kwh_user and orphans the
// customer's payment history. Mobile login already filters deleted_at IS NULL,
// so a soft-deleted customer can no longer sign in.
async function remove(request, reply) {
  const id = request.params.id;
  try {
    const s = scope(request);
    const rows = await query(
      `SELECT u.id_user, u.deleted_at FROM t_user_mobile u WHERE u.id_user = $${s.params.length + 1}${s.sql}`,
      [...s.params, id]
    );
    if (rows.length === 0) {
      return reply.send({ success: false, message: 'Pelanggan tidak ditemukan', data: null });
    }
    if (rows[0].deleted_at) {
      return reply.send({ success: false, message: 'Pelanggan sudah dinonaktifkan', data: null });
    }
    await query('UPDATE t_user_mobile SET deleted_at = now() WHERE id_user = $1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.pelanggan.remove]', err);
    return reply.send({ success: false, message: 'Gagal menghapus data', data: null });
  }
}

// ------------------------------------------------------------------ RESTORE

async function restore(request, reply) {
  const id = request.params.id;
  try {
    const s = scope(request);
    const rows = await query(
      `SELECT u.id_user FROM t_user_mobile u WHERE u.id_user = $${s.params.length + 1}${s.sql}`,
      [...s.params, id]
    );
    if (rows.length === 0) {
      return reply.send({ success: false, message: 'Pelanggan tidak ditemukan', data: null });
    }
    await query('UPDATE t_user_mobile SET deleted_at = NULL WHERE id_user = $1', [id]);
    return reply.send({ success: true, message: 'Berhasil diaktifkan kembali', data: null });
  } catch (err) {
    console.error('[admin.pelanggan.restore]', err);
    return reply.send({ success: false, message: 'Gagal mengaktifkan data', data: null });
  }
}

module.exports = { lookups, list, detail, riwayat, create, update, remove, restore };
