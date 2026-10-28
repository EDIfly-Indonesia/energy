const db = require('../services/database.service');
const { pool, poolpostgre, query } = db;
const lib = require('../configs/lib');
const trans = require('../controllers/controller-transaction');
const state = require('../services/chargingState').state;
function getObjectKey(obj, value) {
  return Object.keys(obj).find((key) => obj[key] === value);
}
module.exports = {

  handling_startTransaction: function(transnumber, params) {
    let sqlstatus = `update t_transaction set status_transaksi='charging' where no_trans=$1;`;
    pool.query(sqlstatus, [transnumber]).catch(e => console.error(e));

    let sqldetail = `update t_transaction_detail set id_tag=$1,start_timestamp=$2,start_value=$3 where no_trans=$4`;
    pool.query(sqldetail, [params.idTag, new Date(), params.meterStart, transnumber]).catch(e => console.error(e));
  },

  handling_manualTransaction: async function(params, chargeboxId) {
    const trans_id = Date.parse(new Date().toISOString());
    state.gtransid_manual[params.connectorId] = trans_id;
    let data = {
      trans_id: trans_id,
      chargebox_id: chargeboxId,
      connector_id: params.connectorId,
      id_tag: params.idTag,
      start_timestamp: new Date(),
      start_value: params.meterStart,
    };
    try {
      await query(
        `INSERT INTO t_transaction_manual (trans_id, chargebox_id, connector_id, id_tag, start_timestamp, start_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [data.trans_id, data.chargebox_id, data.connector_id, data.id_tag, data.start_timestamp, data.start_value]
      );
    } catch (e) {
      console.error('[handling_manualTransaction]', e);
    }
  },

  handling_Heartbeat: function(a, b) {
    let sql = `update t_chargebox set last_ping=$1 where chargebox_id=$2;`;
    pool.query(sql, [b, a]).catch(e => console.error(e));
  },

  handling_log: async function(log) {
    try {
      await query(`INSERT INTO t_log_ebike (log) VALUES ($1)`, [log]);
    } catch (e) {
      console.error('[handling_log]', e);
    }
  },

  handling_stopTransaction: async function(params, transnumber, id_user, token, chargeboxId, trans_id) {
    const key = getObjectKey(state.gtrans_id2[chargeboxId], trans_id);

    let lama_durasi = state.glama_durasi[transnumber];

    try {
      let sqlstatus = `update t_transaction set status_transaksi='finish',durasi_terpakai=$1 where no_trans=$2;`;
      await pool.query(sqlstatus, [lama_durasi, transnumber]).catch(e => console.error(e));

      let sqldetail = `update t_transaction_detail set stop_timestamp=$1, stop_value=$2,stop_reason=$3 where no_trans=$4;`;
      const resDetail = await pool.query(sqldetail, [new Date(), params.meterStop, params.reason, transnumber]);

      if (resDetail.rowCount === 0) {
        let sqlmanual = "";
        if (params.idTag != "") {
          sqlmanual = `update t_transaction_manual set stop_timestamp=$1, stop_value=$2,stop_reason=$3,status='stop' where id_tag=$4 and status='charging';`;
          await pool.query(sqlmanual, [new Date(), params.meterStop, params.reason, params.idTag]).catch(e => console.error(e));
        }
        else {
          sqlmanual = `update t_transaction_manual set stop_timestamp=$1, stop_value=$2,stop_reason=$3,status='stop' where chargebox_id=$4 and id_tag='' and status='charging';`;
          await pool.query(sqlmanual, [new Date(), params.meterStop, params.reason, chargeboxId]).catch(e => console.error(e));
        }
      }
      else {
        if (state.gjenis_charging[transnumber] == "kwh") {
          if (state.gjumlah_kwh[transnumber] > (params.meterStop - state.gawal_kwh[transnumber])) {
            trans.refund(transnumber);
          }
          else {
            console.log("tidak refund");
          }
        }
        else {
          if (state.gjumlah_durasi[transnumber] > state.glama_durasi[transnumber]) {
            console.log("refund durasi");
            trans.refund(transnumber);
          }
          else {
            console.log("tidak refund");
          }
        }

        state.gtrans_id[key] = null;
        state.gtrans_id2[chargeboxId][key] = null;

        var isiberita = `Charging ${transnumber} selesai!`;
        let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
        await poolpostgre.query(sqlpostgre, [id_user, transnumber, 'finishcharging', 'Charging Selesai', isiberita]).catch(e => console.error(e));
        lib.kirimnotifselesai(token, transnumber, id_user);
      }
    } catch (e) {
      console.error('[handling_stopTransaction]', e);
    }

    state.gtrans_id[transnumber] = null;
    state.gtrans_id2[chargeboxId][key] = null;
  },

  handling_statusNotification: async function(params, chargeboxId) {
    let data = {
      chargebox_id: chargeboxId,
      connector_id: params.connectorId,
      error_code: params.errorCode,
      status: params.status,
      waktu: new Date(),
      info: params.info,
    };
    try {
      await query(
        `INSERT INTO t_connector_status (chargebox_id, connector_id, error_code, status, waktu, info)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [data.chargebox_id, data.connector_id, data.error_code, data.status, data.waktu, data.info]
      );
    } catch (e) {
      console.error('[handling_statusNotification]', e);
    }

    let sqlpostgre = `INSERT INTO konektor (chargebox_id,connector_id,status,waktu) VALUES ($1,$2,$3,$4) ON CONFLICT (chargebox_id,connector_id) DO UPDATE
        SET status = $5,waktu=$6;`;
    await poolpostgre.query(sqlpostgre, [chargeboxId, params.connectorId, params.status, new Date(), params.status, new Date()]).catch(e => console.error(e));

    // khusus manual
    if ((params.status == "Finishing") && (state.stopreason != "") && (state.gtrans_id2[chargeboxId][params.connectorId] == null)) {
      let sql = `update t_transaction_manual set stop_timestamp=$1, stop_value=$2,stop_reason=$3,status='stop' where trans_id=$4;`;
      try {
        await pool.query(sql, [new Date(), state.stopvalue, state.stopreason, state.gtransid_manual[params.connectorId]]);
        state.stopwaktu = params.timestamp;
        state.stopvalue = params.meterStop;
        state.stopreason = params.reason;
      } catch (e) {
        console.error(e);
      }
    }

    if (params.status == "Charging" && (state.gtrans_id2[chargeboxId][params.connectorId] != null)) {
      const cli = state.allClients.get(chargeboxId);
      var trans_id = state.gtrans_id2[chargeboxId][params.connectorId];

      if (state.gjenis_charging[trans_id] == "duration") {
        console.log(`gjenis_charging ${state.gjenis_charging[trans_id]} `);
        console.log(`Start transaction ${chargeboxId} `);
        let setiap = 2000;
        var lama = 2000;
        state.glama_durasi[trans_id] = 0;
        var connector_id = params.connectorId;

        const interval = setInterval(() => {
          lama += setiap;
          simpanpostgre(state.gtrans_id[trans_id].toString(), lama, "duration");
          state.glama_durasi[trans_id] = lama;
        }, setiap);

        state.ginterval[trans_id] = interval;
        const interval2 = setTimeout(async () => {
          try {
            let sql2 = `select status from t_connector_status where chargebox_id=$1 and connector_id=$2 order by id desc limit 1;`;
            const results = await query(sql2, [chargeboxId, connector_id]);
            if (results.length === 0) return;
            let statusnya = results[0].status;
            if (statusnya == "Charging") {
              console.log(`Stopping transaction due to timeout`);
              const responsestop = await cli.call('RemoteStopTransaction', {
                transactionId: trans_id
              });
              clearInterval(interval);
            }
          } catch (e) {
            console.error(e);
          }
        }, state.gjumlah_durasi[trans_id]);
        state.ginterval2[trans_id] = interval2;
      }
    }
  },

  handling_MeterValues: function(params, chargebox_id) {
    const connectorId = params.connectorId;
    const meterValues = params.meterValue;
    const sampledValues = meterValues[0].sampledValue;
    let akhirwH = 0;
    let penggunaan = 0;
    const client = state.allClients.get(chargebox_id);
    var trans_id = state.gtrans_id2[chargebox_id]?.[connectorId];
    if (!trans_id) {
      console.log(`[MeterValues] No active transaction for ${chargebox_id} connector ${connectorId}, skipping.`);
      return;
    }
    var suhu = 0;
    var ampere = 0;
    var volt = 0;
    var baterai = 0;

    if (state.gjenis_charging[trans_id] == "kwh") {
      jumlahkwh = state.gjumlah_kwh[trans_id];

      sampledValues?.forEach((value) => {
        switch (value.measurand) {
          case "Energy.Active.Import.Register":
            akhirwH = value.value;
            console.log(`akhirwH ${akhirwH}`);
            penggunaan = akhirwH - state.gawal_kwh[trans_id];
            console.log(`penggunaan ${penggunaan}`);
            console.log(`jumlahkwh ${jumlahkwh}`);
            penggunaan = Math.round(penggunaan);
            break;
          case "Temperature":
            suhu = value.value;
            break;
          case "Current.Import":
            if (value.phase == "L1") ampere = value.value;
            break;
          case "Voltage":
            if (value.phase == "L1-N") volt = value.value;
            break;
          case "SoC":
            baterai = value.value;
            break;
        }
      });
      simpanpostgrekwh(state.gtrans_id[trans_id].toString(), penggunaan, ampere, volt, baterai, suhu);

      if (penggunaan >= jumlahkwh) {
        const responsestop = client.call('RemoteStopTransaction', {
          transactionId: state.gtrans_id[trans_id]
        });
      }
    }
    else if (state.gjenis_charging[trans_id] == "duration") {
      let jumlahdurasi = state.gjumlah_durasi[trans_id];

      sampledValues?.forEach((value) => {
        switch (value.measurand) {
          case "Energy.Active.Import.Register":
            akhirwH = value.value;
            penggunaan = akhirwH - state.gawal_kwh[trans_id];
            break;
          case "Temperature":
            suhu = value.value;
            break;
          case "Current.Import":
            if (value.phase == "L1") ampere = value.value;
            break;
          case "Voltage":
            if (value.phase == "L1-N") volt = value.value;
            break;
          case "SoC":
            baterai = value.value;
            break;
        }
      });
      simpanpostgreduration(state.gtrans_id[trans_id].toString(), penggunaan, ampere, volt, baterai, suhu);
    }
  },

};


function simpanpostgre(transnumber, penggunan, jenischarging) {
  if (jenischarging == "kwh") {
    let sql = `update charging set penggunaan=$1,masuk_kwh=$1 where no_trans=$2;`;
    poolpostgre.query(sql, [penggunan, transnumber]).catch(e => console.error(e));
  }
  else {
    let sql = `update charging set penggunaan=$1 where no_trans=$2;`;
    poolpostgre.query(sql, [penggunan, transnumber]).catch(e => console.error(e));
  }
}

function simpanpostgrekwh(transnumber, penggunaan, ampere, volt, baterai, suhu) {
  let sql = `update charging set penggunaan=$1,masuk_kwh=$1,ampere=$2,volt=$3,baterai=$4,suhu=$5 where no_trans=$6;`;
  poolpostgre.query(sql, [penggunaan, ampere, volt, baterai, suhu, transnumber]).catch(e => console.error(e));
}

function simpanpostgreduration(transnumber, penggunaan, ampere, volt, baterai, suhu) {
  let sql = `update charging set masuk_kwh=$1,ampere=$2,volt=$3,baterai=$4,suhu=$5 where no_trans=$6;`;
  poolpostgre.query(sql, [penggunaan, ampere, volt, baterai, suhu, transnumber]).catch(e => console.error(e));
}
