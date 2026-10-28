'use strict';

/**
 * OCPP 1.6 WebSocket server (charge point facing).
 * Extracted from the legacy app.js monolith. Attach its `handleUpgrade`
 * to the Fastify HTTP server's "upgrade" event.
 */

const { RPCServer } = require('ocpp-rpc');
const handle = require('./handle');
const { state } = require('../services/chargingState');
const { query } = require('../services/database.service');

function createOcppServer() {
  const rpcServer = new RPCServer({
    protocols: ['ocpp1.6'], // server accepts ocpp1.6 subprotocol
    pingIntervalMs: 5000,
    // strictMode: true, // SEC-01 follow-up: enables strict OCPP payload validation,
    // but it ALSO validates the server's responses (incl. the wildcard handler's
    // generic {idTagInfo} shape) — enable only after testing against real chargeboxes.
  });

  // SEC-01: reject unregistered chargebox identities at the WebSocket handshake,
  // before any OCPP message can write to the database.
  rpcServer.auth(async (accept, reject, handshake) => {
    const identity = handshake.identity;
    if (!identity) {
      return reject(404, 'Identity diperlukan');
    }
    try {
      const rows = await query('SELECT 1 FROM t_chargebox WHERE chargebox_id = $1', [identity]);
      if (rows.length === 1) {
        accept();
      } else {
        console.warn(`[ocpp] Tolak identity chargebox tak terdaftar: ${identity}`);
        reject(404, 'Chargebox tidak terdaftar');
      }
    } catch (e) {
      console.error('[ocpp.auth]', e);
      reject(500, 'Gagal autentikasi');
    }
  });

  rpcServer.on('close', (client) => {
    console.log('disconnect', client.identity);
  });

  rpcServer.on('client', async (client) => {
    // RPC client connected
    let awalwH = 0;
    let jenischarging = 'kw';
    let jumlahkwh = 0;
    let trans_id = 1;
    console.log(`${client.identity} connected`);

    state.allClients.set(client.identity, client);
    client.call('ChangeConfiguration', {
      key: 'HeartbeatInterval',
      value: '60',
    });

    // console.log('SetChargingProfile');
    // client.call("SetChargingProfile", {
    //     "connectorId": 0,
    //     "csChargingProfiles": {
    //         "chargingProfileId": 123,
    //         "stackLevel": 1,
    //         "chargingProfilePurpose": "ChargePointMaxProfile",
    //         "chargingProfileKind": "Absolute",
    //         "chargingSchedule": {
    //         "chargingRateUnit": "W",
    //         "chargingSchedulePeriod": [
    //             { "startPeriod": 0, "limit": 7400 }
    //         ]
    //         }
    //     }
    // });

    // Only initialize if no recovery data exists (preserve loadFromDatabase results)
    if (!state.gtrans_id2[client.identity]) state.gtrans_id2[client.identity] = [];
    if (!state.gtransid_manual[client.identity]) state.gtransid_manual[client.identity] = [];

    client._ws.on('pong', (message) => {
      console.log('pong ' + client.identity);
    });

    client.handle('BootNotification', async ({ params }) => {
      const dt = new Date();
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      console.log(`Server got BootNotificationnn from ${client.identity}:`, params);

      // respond to accept the client
      return {
        status: 'Accepted',
        interval: 300,
        currentTime: dt.toISOString(),
      };
    });

    client.handle('Authorize', async ({ params }) => {
      console.log(`Server got Authorize from ${client.identity}:`, params);

      // 1962636774
      const ids = ['000000010772', '000000010771'];

      try {
        if (ids.includes(params.idTag)) {
          console.log('OK');
        } else {
          console.log('NOK');
        }
      } catch (e) {
        console.log(e);
      }

      return {
        idTagInfo: { status: 'Accepted' },
      };
    });

    client.handle('MeterValues', async ({ params }) => {
      console.log('metervalues', JSON.stringify(params));
      handle.handling_MeterValues(params, client.identity);

      return {};
    });

    // create a specific handler for handling Heartbeat requests
    client.handle('Heartbeat', async (data) => {
      console.log('[' + new Date() + '] Heartbeat from', client.identity);

      handle.handling_Heartbeat(client.identity, new Date());

      return {
        currentTime: new Date(),
      };
    });

    client.handle('StatusNotification', async ({ params }) => {
      console.log(`Server got StatusNotification from ${client.identity}:`, params);
      if (params.connectorId > 0) handle.handling_statusNotification(params, client.identity);

      return {};
    });

    client.handle('StopTransaction', async ({ params }) => {
      console.log(`Server got StopTransactionnn from ${client.identity}:`, params);

      handle.handling_stopTransaction(
        params,
        params.idTag,
        state.gid_user[params.idTag],
        state.gtoken_fcm[params.idTag],
        client.identity,
        state.gtrans_id[params.idTag]
      );

      return {};
    });

    client.handle('StartTransaction', async ({ params }) => {
      console.log(`Charging station started charging using ID Tag: `, params);
      let idtrans = state.gtrans_id[params.idTag];
      state.gawal_kwh[idtrans] = params.meterStart;

      if (state.gtrans_id2[client.identity][params.connectorId] != null) {
        handle.handling_startTransaction(state.gtrans_id2[client.identity][params.connectorId], params);
      } else {
        handle.handling_manualTransaction(params, client.identity);
        state.gtrans_id2[client.identity][params.connectorId] = null;
      }
      return {
        idTagInfo: {
          status: 'Accepted', // idTag accepted
        },
        transactionId: state.gtrans_id[params.idTag], // the transactionId should relate to a record stored somewhere in your back-end
      };
    });

    // create a wildcard handler to handle any RPC method
    client.handle(({ method, params }) => {
      console.log(`Serverr goti ${method} from ${client.identity}:`, params);

      // throw createRPCError("NotImplemented");
      return {
        idTagInfo: { status: 'Accepted' },
      };
    });
  });

  return rpcServer;
}

module.exports = { createOcppServer };
