        const WebSocket = require('ws');

        const PORT = 8080;
        const HEARTBEAT_INTERVAL = 60; // detik
        const WS_PING_INTERVAL = 30000;
        const WS_PONG_TIMEOUT = 60000;

        const wss = new WebSocket.Server({ port: PORT });
        const clients = new Map();

        console.log(`🚀 OCPP 1.6 WS server running on ${PORT}`);

        wss.on('connection', (ws, req) => {
          // identity biasanya dari URL: ws://host:4052/CP001
          const identity = req.url.replace('/', '') || 'UNKNOWN';

          const client = {
            id: identity,
            ws,
            lastHeartbeat: null,
            lastPong: null,
            status: 'UNKNOWN'
          };

          clients.set(identity, client);
          console.log('🔌 Connected:', identity);

          /* ===============================
            WS PONG
          =============================== */
          ws.on('pong', () => {
            client.lastPong = Date.now();
            console.log('🏓 Pong:', identity);
          });

          /* ===============================
            MESSAGE HANDLER
          =============================== */
          ws.on('message', (data) => {
            let msg;
            try {
              msg = JSON.parse(data);
            } catch {
              return;
            }
            console.log(msg);
            // OCPP JSON frame: [MessageTypeId, UniqueId, Action, Payload]
            const [type, uid, action, payload] = msg;

            /* ===============================
              BOOT NOTIFICATION
            =============================== */
            if (action === 'BootNotification') {
              console.log('BootNotification:', identity, payload);

              // Response
              ws.send(JSON.stringify([
                3,
                uid,
                {
                  status: 'Accepted',
                  currentTime: new Date().toISOString(),
                  interval: HEARTBEAT_INTERVAL
                }
              ]));

              // Set HeartbeatInterval
              sendCall(ws, 'ChangeConfiguration', {
                key: 'HeartbeatInterval',
                value: HEARTBEAT_INTERVAL.toString()
              });

              return;
            }

            /* ===============================
              HEARTBEAT
            =============================== */
            if (action === 'Heartbeat') {
              client.lastHeartbeat = Date.now();
              console.log('❤️ Heartbeat:', identity);

              ws.send(JSON.stringify([
                3,
                uid,
                { currentTime: new Date().toISOString() }
              ]));

              return;
            }

            /* ===============================
              STATUS NOTIFICATION
            =============================== */
            if (action === 'StatusNotification') {
              client.status = payload.status;
              console.log(
                '⚡ Status:',
                identity,
                payload.connectorId,
                payload.status
              );

              ws.send(JSON.stringify([3, uid, {}]));
              return;
            }
          });

          /* ===============================
            DISCONNECT
          =============================== */
          ws.on('close', () => {
            console.log('❌ Disconnected:', identity);
            clients.delete(identity);
          });
        });

        /* ===============================
          WS PING LOOP
        ================================ */
        setInterval(() => {
          for (const client of clients.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
              console.log('Ping: ', client.id);
              client.ws.ping();
            }
          }
        }, WS_PING_INTERVAL);

        /* ===============================
          WS PONG TIMEOUT
        ================================ */
        setInterval(() => {
          for (const client of clients.values()) {
            if (!client.lastPong) continue;

            if (Date.now() - client.lastPong > WS_PONG_TIMEOUT) {
              console.log('⛔ WS timeout:', client.id);
              //client.ws.terminate();
            }
          }
        }, 30000);

        /* ===============================
          HEARTBEAT TIMEOUT
        ================================ */
        setInterval(() => {
          for (const client of clients.values()) {
            if (!client.lastHeartbeat) continue;

            if (Date.now() - client.lastHeartbeat > HEARTBEAT_INTERVAL * 2000) {
              console.log('⛔ Heartbeat timeout:', client.id);
              //client.ws.terminate();
            }
          }
        }, 30000);

        /* ===============================
          HELPER: SEND CALL
        ================================ */
        function sendCall(ws, action, payload) {
          const uid = Math.random().toString(36).substring(2, 10);
          ws.send(JSON.stringify([2, uid, action, payload]));
        }
