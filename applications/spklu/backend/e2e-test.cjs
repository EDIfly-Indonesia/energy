'use strict';
/* E2E smoke test for SPKLU backend (items 1, 2, 5). Run against a booted backend. */
process.chdir(__dirname);
require('dotenv').config({ path: './.env' });

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BASE = 'http://localhost:8080';
const pool = new Pool({
  host: 'localhost',
  user: process.env.DB_USER_POSTGRE,
  password: process.env.DB_PASSWORD_POSTGRE,
  database: process.env.DB_DATABASE_POSTGRE,
  port: Number(process.env.DB_PORT_POSTGRE || 5432),
});

function md5(s) { return crypto.createHash('md5').update(String(s)).digest('hex'); }

let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`); }
}

async function jfetch(method, path, { body, token } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

(async () => {
  const now = Date.now();
  const email = `e2e-${now}@example.com`;

  console.log('\n=== 1. Admin auth + role ===');
  const login = await jfetch('POST', '/admin/login', { body: { username: 'admin', password: 'admin' } });
  check('admin login success', login.json?.success === true, JSON.stringify(login.json));
  check('admin login returns type_id=1 (superadmin)', login.json?.type_id === 1);
  check('admin login returns type_code', login.json?.type_code === 'superadmin');
  const adminToken = login.json?.token;

  const me = await jfetch('GET', '/admin/me', { token: adminToken });
  check('/admin/me returns superadmin', me.json?.success && me.json?.data?.type_code === 'superadmin');

  const dashAuth = await jfetch('GET', '/admin/dashboard', { token: adminToken });
  check('/admin/dashboard (auth) ok', dashAuth.json?.success === true);

  const dashNoAuth = await jfetch('GET', '/admin/dashboard');
  check('/admin/dashboard (no token) -> 401', dashNoAuth.status === 401, `status=${dashNoAuth.status}`);

  console.log('\n=== 2. Upload foto (multipart) ===');
  const fd = new FormData();
  fd.append('file', new Blob(['fake-image-bytes'], { type: 'image/jpeg' }), 'test.jpg');
  const upRes = await fetch(BASE + '/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: fd });
  const upJson = await upRes.json().catch(() => null);
  check('upload success', upJson?.success === true, JSON.stringify(upJson));
  const uploadUrl = upJson?.data?.url;
  check('upload returns url', typeof uploadUrl === 'string' && uploadUrl.startsWith('/uploads/'));
  if (uploadUrl) {
    const served = await fetch(BASE + uploadUrl);
    check('uploaded file served (200)', served.status === 200, `status=${served.status}`);
  }

  console.log('\n=== 3. Seed chargebox + mitra admin (owner filtering) ===');
  const existingCb = await pool.query(`SELECT 1 FROM t_chargebox WHERE chargebox_id = 'E2E001'`);
  if (existingCb.rows.length === 0) {
    await pool.query(`INSERT INTO t_chargebox (chargebox_id, nama_chargebox, jenis, id_mitra, id_area, ocpp_protocol, is_public, is_active)
                      VALUES ('E2E001', 'Chargebox E2E', 'car', 3, 2, 'ocpp1.6J', 1, 1)`);
  }
  // connector #1 is auto-created by trigger trg_tchargebox_ai — just update its pricing
  await pool.query(`UPDATE t_connector_detail SET electric_power=22000, connector_type='Type2', harga_perkwh=3000, harga_perjam=5000, status='Available'
                    WHERE chargebox_id='E2E001' AND connector_id=1`);
  await pool.query(`DELETE FROM t_users_admin WHERE code = 'mitra-e2e'`);
  await pool.query(`INSERT INTO t_users_admin (code, name, email, password, type_id, verified, active, foto, id_role, id_mitra)
                    VALUES ($1, 'Mitra Test', 'mitra-e2e@example.com', $2, 3, 1, 1, '', 0, 3)`, ['mitra-e2e', md5('mitra123')]);
  const mitraLogin = await jfetch('POST', '/admin/login', { body: { username: 'mitra-e2e', password: 'mitra123' } });
  check('mitra admin login', mitraLogin.json?.success === true);
  check('mitra admin type_id=3 + id_mitra=3', mitraLogin.json?.type_id === 3 && mitraLogin.json?.id_mitra === 3);
  const mitraToken = mitraLogin.json?.token;

  const cbSuper = await jfetch('GET', '/admin/chargebox', { token: adminToken });
  const cbMitra = await jfetch('GET', '/admin/chargebox', { token: mitraToken });
  check('superadmin sees E2E chargebox', (cbSuper.json?.data || []).some((r) => r.chargebox_id === 'E2E001'));
  check('mitra admin list filtered to own mitra (id_mitra=3)', (cbMitra.json?.data || []).every((r) => r.id_mitra === 3) && (cbMitra.json?.data || []).length >= 1, `rows=${(cbMitra.json?.data || []).length}`);

  console.log('\n=== 4. Charging lifecycle (simpanorder free + trigger + callback) ===');
  const passhash = await bcrypt.hash('password123', 8);
  const userIns = await pool.query(`INSERT INTO t_user_mobile (email, password, nama, no_hp, id_mitra, id_jenismember, id_wallet)
                                    VALUES ($1, $2, 'E2E User', $3, 3, 0, 'W-E2E') RETURNING id_user, email, nama, no_hp, id_wallet, id_mitra, id_jenismember`,
                                    [email, passhash, '0812' + String(now).slice(-8)]);
  const user = userIns.rows[0];
  check('test user seeded (trigger saldo/kwh)', user.id_user > 0);

  const mobileToken = jwt.sign({ data: user, key: md5(user.email + process.env.PENGACAK) }, process.env.SECRET_KEY, { expiresIn: '7d' });

  const orderRes = await jfetch('POST', '/transaction/simpanorder', {
    token: mobileToken,
    body: {
      tipe_charging: 'kwh', id_carabayar: 1, chargebox_id: 'E2E001', connector_id: 1,
      id_user: user.id_user, id_mitra: 3, harga_satuan: 3000, jml_kwh_order: 5, jml_durasi_order: 0,
      biaya_lain: 0, jumlah: 0, total: 0, ppn: 0, pbjt: 0, pju: 0, grand_total: 0,
      nama: 'E2E User', email, no_hp: user.no_hp, jenis_kendaraan: 'car',
    },
  });
  check('simpanorder success (grand_total=0)', orderRes.json?.success === true, JSON.stringify(orderRes.json));
  const noTrans = orderRes.json?.no_trans;
  check('simpanorder returns no_trans', noTrans != null);

  const detail = await pool.query('SELECT * FROM t_transaction_detail WHERE no_trans = $1', [String(noTrans)]);
  check('trigger ttransaction_ai created detail row', detail.rows.length === 1, `detail=${detail.rows.length}`);

  const trx = await pool.query('SELECT status_transaksi, status_bayar FROM t_transaction WHERE id = $1', [noTrans]);
  check('transaction status = ready (free)', trx.rows[0]?.status_transaksi === 'ready', trx.rows[0]?.status_transaksi);

  console.log('\n=== 5. Payment callback (VA) ===');
  const ord2 = await pool.query(`INSERT INTO t_transaction (status_transaksi, tgl_trans, chargebox_id, connector_id, id_user, id_mitra, id_carabayar, tipe_charging, grand_total)
                                 VALUES ('order', now(), 'E2E001', 1, $1, 3, 1, 'kwh', 15000) RETURNING id`, [user.id_user]);
  const noTrans2 = ord2.rows[0].id;
  await pool.query(`UPDATE t_transaction SET no_trans = $1 WHERE id = $1`, [String(noTrans2)]);
  const cbRes = await jfetch('POST', '/callback/va', { body: { order: { invoice_number: `${noTrans2}-${user.id_user}-trans`, amount: 15000 } } });
  check('callback va responds success', cbRes.json?.success === true, JSON.stringify(cbRes.json));
  const trx2 = await pool.query('SELECT status_transaksi, status_bayar FROM t_transaction WHERE id = $1', [noTrans2]);
  check('callback va marks ready+paid', trx2.rows[0]?.status_transaksi === 'ready' && trx2.rows[0]?.status_bayar === 'paid',
    `${trx2.rows[0]?.status_transaksi}/${trx2.rows[0]?.status_bayar}`);

  console.log('\n=== 6. kWh tracking trigger (simulate stop) ===');
  const stopValue = 3000;
  await pool.query(`UPDATE t_transaction_detail SET start_value = '0', stop_value = $1 WHERE no_trans = $2`, [String(stopValue), String(noTrans)]);
  const kwh = await pool.query('SELECT bln_ini, ttl FROM t_kwh_user WHERE id_user = $1', [user.id_user]);
  check('kWh tracked (bln_ini = 3000)', Number(kwh.rows[0]?.bln_ini) === stopValue, `bln_ini=${kwh.rows[0]?.bln_ini}`);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E error:', e); process.exit(2); });
