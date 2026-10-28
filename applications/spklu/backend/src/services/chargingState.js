/**
 * chargingState.js — Centralized charging state management
 *
 * Replaces global variables with a single module that provides:
 * - In-memory state storage for active charging sessions
 * - Database recovery on startup (PostgreSQL)
 */

const db = require('./database.service');
const { query, run } = db;

// ============================================================
// STATE STORAGE — replaces all global.xxx arrays/objects
// ============================================================

// Per-transaction state (keyed by no_trans)
const state = {
  gid_user: {},           // no_trans -> user_id
  gtoken_fcm: {},         // no_trans -> FCM token
  gtrans_id: {},          // parseInt(no_trans) -> no_trans (OCPP protocol)
  gtrans_id2: {},         // chargebox_id -> { connector_id -> trans_id }
  gjenis_charging: {},    // no_trans -> "kwh" | "duration"
  gjumlah_kwh: {},        // no_trans -> ordered kWh (in watt)
  gterpakai_kwh: {},      // no_trans -> used kWh
  gjumlah_durasi: {},     // no_trans -> ordered duration (in ms)
  glama_durasi: {},       // no_trans -> elapsed duration (in ms)
  gawal_kwh: {},          // no_trans -> initial meter value
  gtrans_ordernumber: {}, // no_trans -> order number
  gtransid_manual: {},    // connector_id -> manual trans_id
  ginterval: {},          // no_trans -> setInterval handle
  ginterval2: {},         // no_trans -> setTimeout handle

  // Non-OCPP state
  gnotrans_id: {},        // some_id -> no_trans
  gkwhnonocpp: {},        // trans_id -> [kwh readings]
  gnotransnonocpp: {},    // chargebox_id -> { connector_id -> trans_id }

  // Transient stop state
  stopwaktu: '',
  stopvalue: '',
  stopreason: '',

  // Connection state (rebuilt on reconnect)
  allClients: new Map(),
  gsocket: null,

  // Controller state
  parameter: new Map(),
};

// ============================================================
// GETTERS — backward-compatible access to state
// ============================================================

function getGidUser() { return state.gid_user; }
function getGtokenFcm() { return state.gtoken_fcm; }
function getGtransId() { return state.gtrans_id; }
function getGtransId2() { return state.gtrans_id2; }
function getGjenisCharging() { return state.gjenis_charging; }
function getGjumlahKwh() { return state.gjumlah_kwh; }
function getGterpakaiKwh() { return state.gterpakai_kwh; }
function getGjumlahDurasi() { return state.gjumlah_durasi; }
function getGlamaDurasi() { return state.glama_durasi; }
function getGawalKwh() { return state.gawal_kwh; }
function getGtransOrdernumber() { return state.gtrans_ordernumber; }
function getGtransidManual() { return state.gtransid_manual; }
function getGinterval() { return state.ginterval; }
function getGinterval2() { return state.ginterval2; }
function getGnotransId() { return state.gnotrans_id; }
function getGkwhnonocpp() { return state.gkwhnonocpp; }
function getGnotransnonocpp() { return state.gnotransnonocpp; }
function getStopwaktu() { return state.stopwaktu; }
function getStopvalue() { return state.stopvalue; }
function getStopreason() { return state.stopreason; }
function getAllClients() { return state.allClients; }
function getGsocket() { return state.gsocket; }

// ============================================================
// SETTERS — update state
// ============================================================

function setStopwaktu(val) { state.stopwaktu = val; }
function setStopvalue(val) { state.stopvalue = val; }
function setStopreason(val) { state.stopreason = val; }
function setGsocket(val) { state.gsocket = val; }

function setGawalKwh(noTrans, val) { state.gawal_kwh[noTrans] = val; }
function setGlamaDurasi(noTrans, val) { state.glama_durasi[noTrans] = val; }
function setGterpakaiKwh(noTrans, val) { state.gterpakai_kwh[noTrans] = val; }

// ============================================================
// SET TRANSAKSI — bulk set all state for a transaction
// ============================================================

function setTransaksi(noTrans, data) {
  const transId = parseInt(noTrans);

  if (data.id_user !== undefined) state.gid_user[noTrans] = data.id_user;
  if (data.token_fcm !== undefined) state.gtoken_fcm[noTrans] = data.token_fcm;
  if (data.trans_id !== undefined) {
    state.gtrans_id[transId] = noTrans;
    state.gtrans_id[noTrans] = data.trans_id;
  }
  if (data.chargebox_id !== undefined && data.connector_id !== undefined) {
    if (!state.gtrans_id2[data.chargebox_id]) {
      state.gtrans_id2[data.chargebox_id] = [];
    }
    state.gtrans_id2[data.chargebox_id][data.connector_id] = transId;
  }
  if (data.jenis_charging !== undefined) state.gjenis_charging[noTrans] = data.jenis_charging;
  if (data.jumlah_kwh !== undefined) state.gjumlah_kwh[noTrans] = data.jumlah_kwh;
  if (data.terpakai_kwh !== undefined) state.gterpakai_kwh[noTrans] = data.terpakai_kwh;
  if (data.jumlah_durasi !== undefined) state.gjumlah_durasi[noTrans] = data.jumlah_durasi;
  if (data.lama_durasi !== undefined) state.glama_durasi[noTrans] = data.lama_durasi;
  if (data.awal_kwh !== undefined) state.gawal_kwh[noTrans] = data.awal_kwh;
  if (data.trans_ordernumber !== undefined) state.gtrans_ordernumber[noTrans] = data.trans_ordernumber;
  if (data.transid_manual !== undefined) state.gtransid_manual[noTrans] = data.transid_manual;
}

// ============================================================
// CLEAR TRANSAKSI — cleanup when charging finishes
// ============================================================

function clearTransaksi(noTrans) {
  const transId = parseInt(noTrans);

  if (state.ginterval[transId]) {
    clearInterval(state.ginterval[transId]);
    delete state.ginterval[transId];
  }
  if (state.ginterval2[transId]) {
    clearTimeout(state.ginterval2[transId]);
    delete state.ginterval2[transId];
  }

  delete state.gid_user[noTrans];
  delete state.gtoken_fcm[noTrans];
  delete state.gtrans_id[transId];
  delete state.gtrans_id[noTrans];
  delete state.gjenis_charging[noTrans];
  delete state.gjumlah_kwh[noTrans];
  delete state.gterpakai_kwh[noTrans];
  delete state.gjumlah_durasi[noTrans];
  delete state.glama_durasi[noTrans];
  delete state.gawal_kwh[noTrans];
  delete state.gtrans_ordernumber[noTrans];
}

function clearIntervalById(transId) {
  if (state.ginterval[transId]) {
    clearInterval(state.ginterval[transId]);
    delete state.ginterval[transId];
  }
  if (state.ginterval2[transId]) {
    clearTimeout(state.ginterval2[transId]);
    delete state.ginterval2[transId];
  }
}

// ============================================================
// LOAD FROM DATABASE — recovery on startup (PostgreSQL)
// ============================================================

async function loadFromDatabase() {
  console.log('[chargingState] Loading active charging sessions from database...');

  const sql = `
        SELECT t.no_trans, t.chargebox_id, t.connector_id, t.id_user,
            t.tipe_charging, t.jml_kwh_order, t.jml_durasi_order,
            td.start_timestamp, td.start_value, u.token AS fcm_token
        FROM t_transaction t
        JOIN t_transaction_detail td ON t.no_trans = td.no_trans
        JOIN t_user_mobile u ON t.id_user = u.id_user
        WHERE t.status_transaksi = 'charging'
    `;

  const results = await query(sql);

  if (!results || results.length === 0) {
    console.log('[chargingState] No active charging sessions found.');
    return 0;
  }

  console.log(`[chargingState] Found ${results.length} active charging session(s). Recovering...`);

  let recovered = 0;
  let expired = 0;

  for (const row of results) {
    const noTrans = row.no_trans;
    const transId = parseInt(noTrans);
    const chargeboxId = row.chargebox_id;
    const connectorId = row.connector_id;

    state.gid_user[noTrans] = row.id_user;
    state.gtoken_fcm[noTrans] = row.fcm_token;
    state.gtrans_id[transId] = noTrans;
    state.gtrans_id[noTrans] = transId;

    if (!state.gtrans_id2[chargeboxId]) {
      state.gtrans_id2[chargeboxId] = [];
    }
    state.gtrans_id2[chargeboxId][connectorId] = transId;

    state.gjenis_charging[noTrans] = row.tipe_charging;
    state.gjumlah_kwh[noTrans] = row.jml_kwh_order;
    state.gawal_kwh[noTrans] = row.start_value || 0;
    state.glama_durasi[noTrans] = 0;

    if (row.tipe_charging === 'duration') {
      state.gjumlah_durasi[noTrans] = row.jml_durasi_order;
    } else {
      state.gjumlah_kwh[noTrans] = row.jml_kwh_order;
    }

    const startTimestamp = new Date(row.start_timestamp).getTime();
    const orderValue = row.tipe_charging === 'duration' ? row.jml_durasi_order : Infinity;

    const elapsed = Date.now() - startTimestamp;
    const remaining = orderValue - elapsed;

    if (remaining <= 0 && row.tipe_charging === 'duration') {
      console.log(`[chargingState] Session ${noTrans} expired (elapsed: ${elapsed}ms, ordered: ${orderValue}ms). Marking as finish.`);
      await run(`UPDATE t_transaction SET status_transaksi='finish' WHERE no_trans=$1`, [noTrans]);
      await run(`UPDATE t_connector_detail SET status='Available' WHERE chargebox_id=$1 AND connector_id=$2`, [chargeboxId, connectorId]);
      expired++;
      continue;
    }

    recovered++;
  }

  console.log(`[chargingState] Recovery complete: ${recovered} session(s) recovered, ${expired} session(s) expired.`);
  return recovered;
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  state,
  getGidUser,
  getGtokenFcm,
  getGtransId,
  getGtransId2,
  getGjenisCharging,
  getGjumlahKwh,
  getGterpakaiKwh,
  getGjumlahDurasi,
  getGlamaDurasi,
  getGawalKwh,
  getGtransOrdernumber,
  getGtransidManual,
  getGinterval,
  getGinterval2,
  getGnotransId,
  getGkwhnonocpp,
  getGnotransnonocpp,
  getStopwaktu,
  getStopvalue,
  getStopreason,
  getAllClients,
  getGsocket,
  setStopwaktu,
  setStopvalue,
  setStopreason,
  setGsocket,
  setGawalKwh,
  setGlamaDurasi,
  setGterpakaiKwh,
  setTransaksi,
  clearTransaksi,
  clearIntervalById,
  loadFromDatabase,
};
