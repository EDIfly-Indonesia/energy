'use strict';

/**
 * Admin Laporan / Report — native Fastify handlers.
 * Financial reports rebuilt on SPKLU tables (t_transaction, t_topup, t_refund,
 * t_saldo_user, t_histori_saldo, t_mitra). Additive — does not touch mobile
 * endpoints. PostgreSQL-backed.
 *
 * Revenue rule (mirrors admin.dashboard): a transaction counts as income when
 * status_bayar='paid' AND status_transaksi='finish'. Topup income =
 * status_bayar='paid'. Refund outflow = status='done'.
 */

const db = require('../services/database.service');
const { query } = db;
const { ownerScope } = require('../services/permission');

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Default period = current month (1st .. today). Explicit from/to override.
function range(request) {
  const q = request.query || {};
  const now = new Date();
  const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  return { from: q.from || first, to: q.to || localDate(now) };
}

// id_mitra to filter by: owner-scoped admins are locked to their own mitra;
// super/admin may pass an optional ?id_mitra= query param.
function mitraId(request) {
  const forced = ownerScope(request.admin);
  if (forced) return forced;
  const q = request.query || {};
  return q.id_mitra ? Number(q.id_mitra) : null;
}

// ------------------------------------------------------------------ SUMMARY

async function summary(request, reply) {
  try {
    const { from, to } = range(request);
    const mid = mitraId(request);

    const tMitra = mid ? ' AND id_mitra = $3' : '';
    const uMitra = mid ? ' AND u.id_mitra = $3' : '';
    const saldoMitra = mid ? ' AND u.id_mitra = $1' : '';
    const tParams = mid ? [from, to, mid] : [from, to];

    const [trx, topup, refund, saldo] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS jum,
                COALESCE(SUM(grand_total),0)::float AS total,
                COALESCE(SUM(jml_kwh_terpakai),0)::float AS kwh
         FROM t_transaction
         WHERE status_bayar='paid' AND status_transaksi='finish'
           AND tgl_trans::date >= $1::date AND tgl_trans::date <= $2::date${tMitra}`,
        tParams
      ),
      query(
        `SELECT COUNT(*)::int AS jum, COALESCE(SUM(r.jumlah),0)::float AS total
         FROM t_topup r
         LEFT JOIN t_user_mobile u ON r.id_user = u.id_user
         WHERE r.status_bayar='paid'
           AND r.tgl_bayar::date >= $1::date AND r.tgl_bayar::date <= $2::date${uMitra}`,
        tParams
      ),
      query(
        `SELECT COUNT(*)::int AS jum, COALESCE(SUM(r.jumlah),0)::float AS total
         FROM t_refund r
         LEFT JOIN t_user_mobile u ON r.id_user = u.id_user
         WHERE r.status='done'
           AND COALESCE(r.tgl_done, r.tgl_buat)::date >= $1::date
           AND COALESCE(r.tgl_done, r.tgl_buat)::date <= $2::date${uMitra}`,
        tParams
      ),
      query(
        `SELECT COALESCE(SUM(s.saldo),0)::float AS total
         FROM t_saldo_user s
         LEFT JOIN t_user_mobile u ON s.id_user = u.id_user
         WHERE 1=1${saldoMitra}`,
        mid ? [mid] : []
      ),
    ]);

    const pemasukan = trx[0].total + topup[0].total;
    const pengeluaran = refund[0].total;

    return reply.send({
      success: true,
      message: 'Berhasil',
      data: {
        periode: { from, to },
        transaksi: trx[0],
        topup: topup[0],
        refund: refund[0],
        pemasukan,
        pengeluaran,
        net: pemasukan - pengeluaran,
        saldo_user: saldo[0].total,
      },
    });
  } catch (err) {
    console.error('[admin.report.summary]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// ------------------------------------------------------------- TRANSACTION

async function transaction(request, reply) {
  try {
    const { from, to } = range(request);
    const group = (request.query || {}).group === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const mid = mitraId(request);
    const tMitra = mid ? ' AND id_mitra = $3' : '';
    const params = mid ? [from, to, mid] : [from, to];

    const rows = await query(
      `SELECT to_char(tgl_trans, '${group}') AS periode,
              COUNT(*)::int AS jum_transaksi,
              COALESCE(SUM(jml_kwh_terpakai),0)::float AS kwh,
              COALESCE(SUM(jumlah),0)::float AS jumlah,
              COALESCE(SUM(ppn),0)::float AS ppn,
              COALESCE(SUM(pbjt),0)::float AS pbjt,
              COALESCE(SUM(pju),0)::float AS pju,
              COALESCE(SUM(grand_total),0)::float AS grand_total
       FROM t_transaction
       WHERE status_bayar='paid' AND status_transaksi='finish'
         AND tgl_trans::date >= $1::date AND tgl_trans::date <= $2::date${tMitra}
       GROUP BY periode
       ORDER BY periode`,
      params
    );

    const summaryData = rows.reduce(
      (acc, r) => ({
        jum_transaksi: acc.jum_transaksi + r.jum_transaksi,
        kwh: acc.kwh + r.kwh,
        grand_total: acc.grand_total + r.grand_total,
      }),
      { jum_transaksi: 0, kwh: 0, grand_total: 0 }
    );

    return reply.send({ success: true, message: 'Berhasil', data: { rows, summary: summaryData } });
  } catch (err) {
    console.error('[admin.report.transaction]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// -------------------------------------------------------------------- TOPUP

async function topup(request, reply) {
  try {
    const { from, to } = range(request);
    const mid = mitraId(request);
    const uMitra = mid ? ' AND u.id_mitra = $3' : '';
    const params = mid ? [from, to, mid] : [from, to];

    const rows = await query(
      `SELECT r.no_trans, r.tgl_topup, r.tgl_bayar, r.jumlah, r.status_bayar, r.status_topup,
              u.nama, u.email
       FROM t_topup r
       LEFT JOIN t_user_mobile u ON r.id_user = u.id_user
       WHERE r.status_bayar='paid'
         AND r.tgl_bayar::date >= $1::date AND r.tgl_bayar::date <= $2::date${uMitra}
       ORDER BY r.tgl_bayar DESC
       LIMIT 500`,
      params
    );

    const total = rows.reduce((acc, r) => acc + Number(r.jumlah), 0);
    return reply.send({ success: true, message: 'Berhasil', data: { rows, total, jum: rows.length } });
  } catch (err) {
    console.error('[admin.report.topup]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// ------------------------------------------------------------------- REFUND

async function refund(request, reply) {
  try {
    const { from, to } = range(request);
    const mid = mitraId(request);
    const uMitra = mid ? ' AND u.id_mitra = $3' : '';
    const params = mid ? [from, to, mid] : [from, to];

    const rows = await query(
      `SELECT r.id, r.no_trans, r.jml_transaksi, r.jumlah, r.status, r.tgl_buat, r.tgl_done,
              u.nama, u.email
       FROM t_refund r
       LEFT JOIN t_user_mobile u ON r.id_user = u.id_user
       WHERE r.status='done'
         AND COALESCE(r.tgl_done, r.tgl_buat)::date >= $1::date
         AND COALESCE(r.tgl_done, r.tgl_buat)::date <= $2::date${uMitra}
       ORDER BY COALESCE(r.tgl_done, r.tgl_buat) DESC
       LIMIT 500`,
      params
    );

    const total = rows.reduce((acc, r) => acc + Number(r.jumlah), 0);
    return reply.send({ success: true, message: 'Berhasil', data: { rows, total, jum: rows.length } });
  } catch (err) {
    console.error('[admin.report.refund]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// -------------------------------------------------------------------- MITRA

async function mitra(request, reply) {
  try {
    const { from, to } = range(request);
    const mid = mitraId(request);
    const tMitra = mid ? ' AND t.id_mitra = $3' : '';
    const params = mid ? [from, to, mid] : [from, to];

    const rows = await query(
      `SELECT m.id_mitra, m.name AS mitra,
              COUNT(t.id)::int AS jum_transaksi,
              COALESCE(SUM(t.jml_kwh_terpakai),0)::float AS kwh,
              COALESCE(SUM(t.grand_total),0)::float AS total
       FROM t_transaction t
       JOIN t_mitra m ON t.id_mitra = m.id_mitra
       WHERE t.status_bayar='paid' AND t.status_transaksi='finish'
         AND t.tgl_trans::date >= $1::date AND t.tgl_trans::date <= $2::date${tMitra}
       GROUP BY m.id_mitra, m.name
       ORDER BY total DESC`,
      params
    );

    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.report.mitra]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

module.exports = { summary, transaction, topup, refund, mitra };
