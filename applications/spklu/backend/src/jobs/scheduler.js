'use strict';

/**
 * Periodic jobs started at boot.
 * Ported to PostgreSQL (single source).
 */

const db = require('../services/database.service');
const { query, run } = db;
const lib = require('../configs/lib');
const refundUnusedPaidTransactions = require('./refundUnusedPaidTransactions');
const refundTroubleCharging = require('./refundTroubleCharging');

function startScheduler() {
  // Refund jobs — every 60s
  setInterval(async () => {
    refundUnusedPaidTransactions.run();
    refundTroubleCharging.run();
  }, 60000);

  // Stale charging watchdog — every 30s
  setInterval(async () => {
    const sql = `SELECT t.id AS t_id, t.no_trans, td.start_timestamp, t.status_transaksi, t.jml_kwh_order, t.chargebox_id, t.connector_id, cb.nama_chargebox, t.id_user, cb.last_ping, cd.electric_power, u.token
                FROM t_transaction t
                LEFT JOIN t_transaction_detail td ON td.no_trans = t.id::varchar
                LEFT JOIN t_chargebox cb ON cb.chargebox_id = t.chargebox_id
                INNER JOIN t_connector_detail cd ON cd.chargebox_id = t.chargebox_id AND cd.connector_id = t.connector_id
                INNER JOIN t_user_mobile u ON t.id_user = u.id_user
                WHERE t.status_transaksi = 'charging'
                AND (cb.last_ping < now() - interval '8 minutes' OR cb.last_ping IS NULL)`;

    try {
      const results = await query(sql);
      for (const t of results) {
        await run(`UPDATE t_connector_detail SET status = 'Not Available' WHERE chargebox_id=$1`, [t.chargebox_id]);
        await run(`UPDATE t_transaction SET status_transaksi = 'finish' WHERE id=$1`, [t.t_id]);

        const orderedEnergyKWh = t.jml_kwh_order / 1000;
        const estimatedHours = orderedEnergyKWh / t.electric_power;
        const estimatedMs = estimatedHours * 60 * 60 * 1000;

        const estimatedFinishTime = new Date(t.start_timestamp).getTime() + estimatedMs;
        const nowTime = new Date().getTime();

        console.log(`estimate minutes: ${t.jml_kwh_order / (t.electric_power / 60)}`);

        if (nowTime > estimatedFinishTime) {
          const message = `Terjadi gangguan koneksi charger. Mohon hentikan charging secara manual dengan menekan Emergency Stop.`;
          lib.kirimnotif(t.token, t.no_trans, 'Charging Selesai', message, 'finishcharging');
          console.log('push notif ', t.token, t.no_trans, 'Charging Selesai', message, 'finishcharging');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, 30000);

  // Monthly kWh reset (replaces legacy MySQL event `e_kwhuser`):
  // UPDATE t_kwh_user SET bln_ini = 0 on the 1st of every month.
  const resetMonthlyKwh = async () => {
    const now = new Date();
    if (now.getDate() !== 1) return;
    try {
      const res = await run('UPDATE t_kwh_user SET bln_ini = 0');
      console.log(`[e_kwhuser] Monthly kWh reset: ${res.rowCount} row(s)`);
    } catch (err) {
      console.error('[e_kwhuser]', err);
    }
  };
  resetMonthlyKwh(); // also run at boot in case today is the 1st
  setInterval(resetMonthlyKwh, 3600000); // check hourly
}

module.exports = { startScheduler };
