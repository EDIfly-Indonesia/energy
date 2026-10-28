const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const helmet = require('helmet');
const cors = require('cors');
const { RPCServer, createRPCError } = require('ocpp-rpc');
const handle = require("./src/ocpp/handle.js");
const net = require("net");
const nonocpp = require("./src/configs/non_ocpp.js");
const setting = require("./src/configs/global.js");
const db = require('./src/services/database.service');
const { pool, poolpostgre } = db;
const lib = require("./src/configs/lib");
const chargingState = require('./src/services/chargingState');
const refundUnusedPaidTransactions = require('./src/jobs/refundUnusedPaidTransactions.js');
const refundTroubleCharging = require('./src/jobs/refundTroubleCharging.js');

refundUnusedPaidTransactions.init(pool, poolpostgre);
refundTroubleCharging.init(pool, poolpostgre);

const port = 8484;
const state = chargingState.state;

process.env.TZ = "Asia/Jakarta";

// Recovery: load active charging sessions from database on startup
chargingState.loadFromDatabase(pool, poolpostgre).catch(err => {
    console.error('[Startup] Failed to load charging state from database:', err);
});
const rpcServer = new RPCServer({
    protocols: ['ocpp1.6'], // server accepts ocpp1.6 subprotocol
	pingIntervalMs : 5000
    //strictMode: true, 
	// enable strict validation of requests & responses
});


// app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false, 
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(bodyParser.json({limit: "100mb"}));
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit:100000}));
app.get('/', (req, res) => {
  res.send('OK');
});
const nDate = new Date().toString();
const nDate2 = new Date().toISOString();
const dt = new Date();
dt.setMinutes(dt.getMinutes()-dt.getTimezoneOffset());
const httpServer = app.listen(8080, () => { 
  console.log('Express is listening on port 8080!')
  
})
httpServer.on('upgrade', rpcServer.handleUpgrade);

rpcServer.on('close', (client) => {
    console.log('disconnect', client.identity);
})

rpcServer.on('client',async (client) => {
    // RPC client connected
  let awalwH=0;
  let jenischarging="kw";
  let jumlahkwh=0;
  let trans_id=1;
	 console.log(`${client.identity} connected`);
   
	 
	state.allClients.set(client.identity, client); 
    client.call('ChangeConfiguration', {
        key: 'HeartbeatInterval',
        value: '60'
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

    // console.log('=======');	
	// Only initialize if no recovery data exists (preserve loadFromDatabase results)
	if (!state.gtrans_id2[client.identity]) state.gtrans_id2[client.identity]=[];
	if (!state.gtransid_manual[client.identity]) state.gtransid_manual[client.identity]=[];
    
    client._ws.on('pong', (message) => {
        console.log('pong ' + client.identity);
    });

	client.handle('BootNotification', async ({params}) => {
		const dt = new Date();
		dt.setMinutes(dt.getMinutes()-dt.getTimezoneOffset());				
		console.log(`Server got BootNotificationnn from ${client.identity}:`, params);

 
        // respond to accept the client
        return {
            status: "Accepted",
            interval: 300,
            currentTime: dt.toISOString()
        };
    });
	
	client.handle('Authorize', async ({params}) => {
        console.log(`Server got Authorize from ${client.identity}:`, params);
		
        // respond to accept the client
        // 1962636774
        const ids = ['000000010772', '000000010771']

        try {
            if (ids.includes(params.idTag)) {
            console.log('OK')
            } else {
                console.log('NOK')
            }
        } catch (e) {
            console.log(e);
        }

        return {
            idTagInfo: {status:"Accepted"},
            
        };
    });
    client.handle('MeterValues', async ({params}) => {
		
		console.log('metervalues', JSON.stringify(params));
		handle.handling_MeterValues(params,client.identity);
		
		return {};
    });
    
    // create a specific handler for handling Heartbeat requests
    client.handle('Heartbeat', async (data) => {
        // const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

        // console.log(data);

        console.log('[' + new Date() + '] Heartbeat from', client.identity);

        handle.handling_Heartbeat(client.identity, new Date());

        return {
            currentTime: new Date()
        };
    });
    
    
    client.handle('StatusNotification', async ({params}) => {
        console.log(`Server got StatusNotification from ${client.identity}:`, params);
		if(params.connectorId>0)
		handle.handling_statusNotification(params, client.identity);
		
        return {};
    });
	
	client.handle('StopTransaction', async ({params}) => {
        console.log(`Server got StopTransactionnn from ${client.identity}:`, params);
		
		handle.handling_stopTransaction(params,params.idTag,state.gid_user[params.idTag],state.gtoken_fcm[params.idTag],client.identity,state.gtrans_id[params.idTag]);
		
        return {};
    });
	
	client.handle('StartTransaction', async ({params}) => {
       
        console.log(`Charging station started charging using ID Tag: `,params);
		let idtrans=state.gtrans_id[params.idTag];
		state.gawal_kwh[idtrans]=params.meterStart;
		
		if(state.gtrans_id2[client.identity][params.connectorId]!=null){
			handle.handling_startTransaction(state.gtrans_id2[client.identity][params.connectorId],params);
		}
		else {
			handle.handling_manualTransaction(params, client.identity);
			state.gtrans_id2[client.identity][params.connectorId]=null;
		}
        return {
            idTagInfo: {
                status: 'Accepted', // idTag accepted
            },			transactionId: state.gtrans_id[params.idTag], // the transactionId should relate to a record stored somewhere in your back-end
        };
    });

    // create a wildcard handler to handle any RPC method
    client.handle(({method, params}) => {
        
        console.log(`Serverr goti ${method} from ${client.identity}:`, params);
		
		//throw createRPCError("NotImplemented");
         return {
            idTagInfo: {status:"Accepted"},
            
        };
    });
	
	
});
process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
});
const appRoute = require('./src/routes/route');
app.use('/', appRoute);


const server = net.createServer((socket) => {
    console.log(`Client connected ${JSON.stringify(socket)}`);
	let buffer = Buffer.alloc(0);
	let ischarge=false;
	state.gsocket=socket;
   var response ="";
    socket.on("data", (data) => {
       buffer = Buffer.concat([buffer, data]); 
	   while (buffer.length >= 20) { // Minimum packet size is 20 bytes (without APPDATA)
            const packet = nonocpp.parsePacket(buffer);
            if (packet) {
               

                // Handle the command 
                switch (packet.command) {
                    case 0x09C0: // Status Update
                        console.log(`Respon start charging`);
						nonocpp.handle_responstar(packet.addr.toString('hex'),packet.appData);
                        break;
					 case 0x0901: // Status Update
					  console.log(`Login ${new Date().toISOString()}`);
					  response = nonocpp.createPacket(packet.ptrol, packet.addr, packet.command, Buffer.from([0x00]));
                      // Only initialize if no recovery data exists
					  if (!state.gnotransnonocpp[packet.addr.toString('hex')]) state.gnotransnonocpp[packet.addr.toString('hex')]=[];
					  if (!state.gtrans_id2[packet.addr.toString('hex')]) state.gtrans_id2[packet.addr.toString('hex')]=[];
                        break;
					 case 0x0902: // Status Update
					
					    response = nonocpp.createPacket(packet.ptrol, packet.addr, packet.command, Buffer.from([0x01,0x07E9,0x05,0x0C,0x10,0x02,0x0C,0x02]));
                       
						nonocpp.handle_heartbeat(packet.addr.toString('hex'),packet.appData);
						
                        break;
                    default:
                        console.log('Unknown command:', packet.command);
                }

                // Send a response (e.g., acknowledgment)
              
                socket.write(response);
				// if(ischarge==false){
						// setTimeout(function() {
							// console.log('Blah blah blah blah extra-blah');
							// response = nonocpp.createPacket(packet.ptrol, packet.addr, 0x09C0, Buffer.from([0x01,0x00,0x00000005,0x00000007]));//start
							//response = nonocpp.createPacket(packet.ptrol, packet.addr, 0x09DF, Buffer.from([]));//restar device
							  // socket.write(response);
						// }, 3000);
						// ischarge=true;
						
						// setTimeout(function() {
							// console.log('Blah blah blah blah extra-blah');
							// response = nonocpp.createPacket(packet.ptrol, packet.addr, 0x09C0, Buffer.from([0x02,0x00,0x0000003C,0x00000005]));//start
							//response = nonocpp.createPacket(packet.ptrol, packet.addr, 0x09DF, Buffer.from([]));//restar device
							  // socket.write(response);
						// }, 60000);
				// }
				

                // Remove the processed packet from the buffer
                buffer = buffer.slice(20 + packet.slen); // Total packet size = 20 + SLEN
            } else {
                break; // Incomplete or invalid packet, wait for more data
            }
        }
      
    });

    socket.on("end", () => {
        console.log("Client disconnected");
    });

    socket.on("error", (error) => {
        console.log(`Socket Error: ${error.message}`);
    });
});

server.on("error", (error) => {
    console.log(`Server Error: ${error.message}`);
});

server.listen(port, () => {
    console.log(`TCP socket server is running on port: ${port}`);
});

setInterval(async () => {
    refundUnusedPaidTransactions.run();
    refundTroubleCharging.run();
}, 60000);

setInterval(() => {
    const sql = `SELECT t.id AS t_id, t.no_trans, td.start_timestamp, t.status_transaksi, t.jml_kwh_order, t.chargebox_id,  t.connector_id, cb.nama_chargebox, t.id_user, cb.last_ping, cd.electric_power, u.token
                FROM t_transaction t
                LEFT JOIN t_transaction_detail td
                ON t.id = td.no_trans
                LEFT JOIN t_chargebox cb
                ON cb.chargebox_id = t.chargebox_id
                INNER JOIN t_connector_detail cd
                ON cd.chargebox_id = t.chargebox_id AND cd.connector_id = t.connector_id
                INNER JOIN t_user_mobile u
                ON t.id_user = u.id_user
                WHERE t.status_transaksi = 'charging'
                AND (cb.last_ping < NOW() - INTERVAL 8 MINUTE OR cb.last_ping IS NULL)`;
							
    pool.getConnection(function(err, connection) {
        if (err) {
            console.error(err);
            return;
        }
        connection.query(sql, [],
            async function (error, results) {
                try {
                    if(error) throw error;  
                    
                    // console.log(results)
                    for (let i = 0; i < results.length; i++) {
                        const t = results[i];
                        
                        let sql = `update t_connector_detail set status = 'Not Available' where chargebox_id=?;`;
                        pool.query(sql, [t.chargebox_id]);

                        let sql2 = `update t_transaction set status_transaksi = 'finish' where id=?;`;
                        pool.query(sql2, [t.t_id]);

                        const orderedEnergyKWh = t.jml_kwh_order / 1000;
                        const estimatedHours = orderedEnergyKWh / t.electric_power;
                        const estimatedMs = estimatedHours * 60 * 60 * 1000;

                        const estimatedFinishTime = new Date(t.start_timestamp).getTime() + estimatedMs;
                        const nowTime = new Date().getTime();

                        console.log(`estimate minutes: ${t.jml_kwh_order / (t.electric_power / 60)}`)

                        if (nowTime > estimatedFinishTime) {
                            const message = `Terjadi gangguan koneksi charger. Mohon hentikan charging secara manual dengan menekan Emergency Stop.`
                            lib.kirimnotif(t.token, t.no_trans, 'Charging Selesai', message, "finishcharging");
                            console.log('push notif ', t.token, t.no_trans, 'Charging Selesai', message, "finishcharging")
                        }
                    }
                } catch (queryErr) {
                    console.error(queryErr);
                } finally {
                    connection.release();
                }
            });
    });
}, 30000);
