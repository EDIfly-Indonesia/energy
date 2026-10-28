'use strict';

/**
 * Admin dashboard API (additive — does not touch mobile endpoints).
 * Mirrors the legacy CodeIgniter M_auth / M_mitra / Chargebox queries.
 * Native Fastify handlers (request, reply). PostgreSQL-backed.
 * Role/owner filtering: non-super/admin users linked to a mitra only see
 * that mitra's chargeboxes/transactions.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/database.service');
const { query } = db;
const { ownerScope } = require('../services/permission');
const captcha = require('../services/captcha');

// Build an optional `id_mitra = $n` filter for owner-scoped admins.
function mitraFilter(admin, col = 'id_mitra') {
  const id = ownerScope(admin);
  return id ? { sql: ` AND ${col} = $1`, params: [id] } : { sql: '', params: [] };
}

async function login(request, reply) {
  const { username, password, captcha_id, captcha: captchaAnswer } = request.body || {};

  if (!username || !password) {
    return reply.send({ success: false, message: 'Username dan password wajib diisi', data: null });
  }

  if (!captcha.verify(captcha_id, captchaAnswer)) {
    return reply.send({ success: false, message: 'Captcha tidak valid atau kedaluwarsa', data: null });
  }

  try {
    const rows = await query('SELECT * FROM t_users_admin WHERE code = $1', [username]);

    if (rows.length !== 1) {
      return reply.send({ success: false, message: 'User tidak ditemukan', data: null });
    }

    const user = rows[0];
    const match = await bcrypt.compare(String(password), user.password ?? '');
    if (!match) {
      return reply.send({ success: false, message: 'User tidak ditemukan', data: null });
    }
    delete user.password;

    let token = null;
    try {
      token = jwt.sign(
        { data: user, admin: true, scope: 'admin' },
        process.env.SECRET_KEY,
        { expiresIn: Number(process.env.ADMIN_TOKEN_TTL_SECONDS) || (8 * 60 * 60) } // SEC-11: 8 jam default
      );
    } catch (e) {
      console.error('[admin.login] token sign:', e.message);
    }

    const typeRows = user.type_id
      ? await query('SELECT code FROM t_user_type WHERE id = $1', [user.type_id])
      : [];

    return reply.send({
      success: true,
      message: 'Login berhasil',
      data: user,
      token,
      type_id: user.type_id,
      type_code: typeRows[0]?.code ?? null,
      id_role: user.id_role,
      id_mitra: user.id_mitra ?? null,
    });
  } catch (err) {
    console.error('[admin.login]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function getCaptcha(request, reply) {
  const c = captcha.create();
  return reply.send({ success: true, message: 'Berhasil', data: c });
}

async function me(request, reply) {
  const admin = request.admin;
  const typeRows = admin && admin.type_id
    ? await query('SELECT code FROM t_user_type WHERE id = $1', [admin.type_id])
    : [];
  return reply.send({
    success: true,
    message: 'Berhasil',
    data: {
      id: admin.id,
      code: admin.code,
      name: admin.name,
      email: admin.email,
      type_id: admin.type_id,
      type_code: typeRows[0]?.code ?? null,
      id_role: admin.id_role,
      id_mitra: admin.id_mitra ?? null,
    },
  });
}

async function dashboard(request, reply) {
  try {
    const f = mitraFilter(request.admin);

    const [
      totalCharge,
      totalTenant,
      totalUser,
      chargingToday,
      trxToday,
      trxMonth,
      monthly,
    ] = await Promise.all([
      query(`SELECT COUNT(*) AS jml FROM t_chargebox WHERE id_chargebox > 0${f.sql}`, f.params),
      query('SELECT COUNT(*) AS jml FROM t_mitra WHERE deleted_at IS NULL AND id_mitra > 0'),
      query('SELECT COUNT(*) AS jml FROM t_user_mobile WHERE deleted_at IS NULL'),
      query(`SELECT COUNT(*) AS jml FROM t_transaction WHERE status_transaksi='charging' AND tgl_trans::date = CURRENT_DATE${f.sql}`, f.params),
      query(`SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(1) AS jum FROM t_transaction WHERE tgl_trans::date = CURRENT_DATE AND status_transaksi='finish' AND status_bayar='paid'${f.sql}`, f.params),
      query(`SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(1) AS jum FROM t_transaction WHERE EXTRACT(MONTH FROM tgl_trans) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM tgl_trans) = EXTRACT(YEAR FROM CURRENT_DATE) AND status_transaksi='finish' AND status_bayar='paid'${f.sql}`, f.params),
      query(`SELECT to_char(tgl_trans,'YYYY-MM') AS month_key, SUM(grand_total) AS total, COUNT(1) AS jum FROM t_transaction WHERE tgl_trans >= to_char(CURRENT_DATE - interval '11 months','YYYY-MM-01')::date AND status_transaksi='finish' AND status_bayar='paid'${f.sql} GROUP BY to_char(tgl_trans,'YYYY-MM') ORDER BY month_key`, f.params),
    ]);

    return reply.send({
      success: true,
      message: 'Berhasil',
      data: {
        total_chargebox: totalCharge[0].jml,
        total_mitra: totalTenant[0].jml,
        total_user: totalUser[0].jml,
        charging_hari_ini: chargingToday[0].jml,
        transaksi_hari_ini: trxToday[0],
        transaksi_bulan_ini: trxMonth[0],
        grafik_bulanan: monthly,
      },
    });
  } catch (err) {
    console.error('[admin.dashboard]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function listChargebox(request, reply) {
  try {
    const f = mitraFilter(request.admin, 'o.id_mitra');
    const rows = await query(
      `SELECT o.id_chargebox AS id, o.chargebox_id, o.nama_chargebox, o.last_ping,
              t.name AS mitra, COUNT(d.id) AS jumkonektor, a.nama_area, a.alamat, o.id_mitra
       FROM t_chargebox o
       LEFT JOIN t_connector_detail d ON d.chargebox_id = o.chargebox_id AND d.connector_id != 0
       LEFT JOIN t_mitra t ON o.id_mitra = t.id_mitra
       LEFT JOIN t_area a ON o.id_area = a.id_area
       WHERE o.chargebox_id != ''${f.sql}
       GROUP BY o.id_chargebox, o.chargebox_id, o.nama_chargebox, o.last_ping, t.name, a.nama_area, a.alamat, o.id_mitra
       ORDER BY o.nama_chargebox ASC`,
      f.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listChargebox]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function listTransaction(request, reply) {
  try {
    const f = mitraFilter(request.admin, 't.id_mitra');
    const rows = await query(
      `SELECT t.no_trans, t.tgl_trans, t.chargebox_id, t.connector_id, t.grand_total,
              t.tipe_charging, t.status_transaksi, t.status_bayar, cb.nama_chargebox
       FROM t_transaction t
       LEFT JOIN t_chargebox cb ON cb.chargebox_id = t.chargebox_id
       WHERE 1=1${f.sql}
       ORDER BY t.tgl_trans DESC
       LIMIT 100`,
      f.params
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listTransaction]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

module.exports = { login, getCaptcha, me, dashboard, listChargebox, listTransaction };
