'use strict';

/**
 * Non-OCPP raw TCP server (custom protocol, port 8484).
 * Extracted from the legacy app.js monolith.
 */

const net = require('net');
const nonocpp = require('../configs/non_ocpp');
const { state } = require('../services/chargingState');

function createNonOcppServer() {
  const server = net.createServer((socket) => {
    console.log(`Client connected ${JSON.stringify(socket)}`);
    let buffer = Buffer.alloc(0);
    let ischarge = false;
    state.gsocket = socket;
    var response = '';

    socket.on('data', (data) => {
      try {
        buffer = Buffer.concat([buffer, data]);
        while (buffer.length >= 20) {
          // Minimum packet size is 20 bytes (without APPDATA)
          const packet = nonocpp.parsePacket(buffer);
          if (packet) {
            // Handle the command
            switch (packet.command) {
              case 0x09c0: // Status Update
                console.log(`Respon start charging`);
                nonocpp.handle_responstar(packet.addr.toString('hex'), packet.appData)
                  .catch((e) => console.error('[nonocpp] responstar:', e.message));
                break;
              case 0x0901: // Login
                console.log(`Login ${new Date().toISOString()}`);
                response = nonocpp.createPacket(packet.ptrol, packet.addr, packet.command, Buffer.from([0x00]));
                // Only initialize if no recovery data exists
                if (!state.gnotransnonocpp[packet.addr.toString('hex')]) state.gnotransnonocpp[packet.addr.toString('hex')] = [];
                if (!state.gtrans_id2[packet.addr.toString('hex')]) state.gtrans_id2[packet.addr.toString('hex')] = [];
                break;
              case 0x0902: // Heartbeat
                response = nonocpp.createPacket(
                  packet.ptrol,
                  packet.addr,
                  packet.command,
                  Buffer.from([0x01, 0x07e9, 0x05, 0x0c, 0x10, 0x02, 0x0c, 0x02])
                );
                nonocpp.handle_heartbeat(packet.addr.toString('hex'), packet.appData);
                break;
              default:
                console.log('Unknown command:', packet.command);
            }

            // Send a response (e.g., acknowledgment)
            socket.write(response);

            // Remove the processed packet from the buffer
            buffer = buffer.slice(20 + packet.slen); // Total packet size = 20 + SLEN
          } else {
            break; // Incomplete or invalid packet, wait for more data
          }
        }
      } catch (error) {
        console.error('[nonocpp] packet handling error:', error.message);
        buffer = Buffer.alloc(0); // drop malformed data defensively
      }
    });

    socket.on('end', () => {
      console.log('Client disconnected');
    });

    socket.on('error', (error) => {
      console.log(`Socket Error: ${error.message}`);
    });
  });

  server.on('error', (error) => {
    console.log(`Server Error: ${error.message}`);
  });

  return server;
}

function startNonOcppServer(port = 8484) {
  const server = createNonOcppServer();
  server.listen(port, () => {
    console.log(`TCP socket server is running on port: ${port}`);
  });
  return server;
}

module.exports = { createNonOcppServer, startNonOcppServer };
