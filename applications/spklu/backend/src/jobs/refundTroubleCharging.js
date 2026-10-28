const db = require('../services/database.service');
const { query } = db;
const trans = require('../controllers/controller-transaction');

async function runJob() {
  try {
    console.log('Running refund trouble charging job...');
    const sql = `SELECT t.no_trans, t.id_user, t.tgl_trans, t.chargebox_id, t.status_bayar, t.tipe_charging, t.ttl_refund, t.jml_kwh_order, t.jml_kwh_terpakai, td.stop_reason
                FROM t_transaction_detail td
                LEFT JOIN t_transaction t ON t.no_trans = td.no_trans
                WHERE stop_reason = 'PowerLoss' AND t.ttl_refund = 0 AND t.jml_kwh_order > t.jml_kwh_terpakai
                ORDER BY t.id DESC`;

    const results = await query(sql);

    for (const row of results) {
      console.log(`Processing transaction: ${row.no_trans}`);
      await trans.refund(row.no_trans, true);
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = { run: runJob };
