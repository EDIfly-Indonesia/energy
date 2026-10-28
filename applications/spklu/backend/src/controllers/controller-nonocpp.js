const db = require('../services/database.service');
const { pool, poolpostgre } = db;
const { RPCClient } = require('ocpp-rpc');
const doku = require("../configs/doku");
const bmsdoku = require("../configs/bmsdoku");
const nonocpp = require("../configs/non_ocpp");
const crypto = require("crypto");
const state = require('../services/chargingState').state;
const { tokenUserId } = require('../services/permission');

pool.on('error',(err)=> {
    console.error(err);
});


module.exports ={
    // Ambil data semua barang
  


	 async startcharging(req,res) {
         //lib.cektoken(req,res);
		 const id_user = tokenUserId(req);
		 if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
		 if (!state.gsocket) return res.send({ success: false, message: 'Chargebox tidak terhubung', data: null });
		 let token_fcm = req.body.token_fcm;
		 let chargebox_id = req.body.chargebox_id;
		 let connector_id = req.body.connector_id;
		 let durasi=req.body.jumlah;
		 let durasihex=nonocpp.dec2hex(durasi);
		 let jumlah = req.body.jumlah;
		 let jenischarging =req.body.jenischarging=="kwh" ? req.body.jenischarging : "duration" ; //durasi atau kwh,durasi dalam detik
		 let responsestart ="";
		 let durasicharging = 0;
		 let jumlahkwh = 0;
		 
		 if(jenischarging=="duration") durasicharging=jumlah*1000;
		 else jumlahkwh=jumlah * 1000;
		 durasihex=nonocpp.format_angka_digit(durasihex,8);
		
		 const decimalToHex = dec => dec.toString(16);
		 
		 connector_id=nonocpp.format_angka_digit(connector_id,2);
		 durasi=nonocpp.format_angka_digit(durasi,8);

		
		  let notrans=req.body.transaction_number;
		  let idtransdb=req.body.transaction_number;
		   let transnumber = state.gnotrans_id[notrans];;
		   
		
		 notrans=nonocpp.dec2hex(notrans);
		  
		  notrans=nonocpp.format_angka_digit(notrans.toString('hex'),8);
		 
		 let datana="01"+connector_id+durasihex+notrans;
		 
		
		  response = nonocpp.createPacket(0x06, Buffer.from(chargebox_id,'hex') , 0x09C0, Buffer.from(datana,'hex'));
		  state.gsocket.write(response);
		  
			 state.gtrans_id2[chargebox_id][req.body.connector_id]=parseInt(transnumber);
			 state.gid_user[idtransdb]=id_user;
			 state.gtoken_fcm[idtransdb]=token_fcm;
			 state.gjenis_charging[idtransdb]=jenischarging; //
			 state.glama_durasi[idtransdb]=0;
			
			 if(jenischarging=="duration") {
					state.gjumlah_durasi[idtransdb]=durasicharging;//
					
			}
			 
			 else {
				 
				 state.gjumlah_kwh[idtransdb]=jumlahkwh;//
				
				 
			 }
			res.send({ 
						success: true, 
						message: datana,
						data: null
					});
    },
	
	async stopcharging(req,res) {
         //lib.cektoken(req,res);
		 if (!state.gsocket) return res.send({ success: false, message: 'Chargebox tidak terhubung', data: null });
		 let chargebox_id = req.body.chargebox_id;
		 let notrans = req.body.transaction_number;
		 let connector_id = req.body.connector_id;
		 let durasi=0;
		 let durasihex=nonocpp.dec2hex(durasi);
		 durasihex=nonocpp.format_angka_digit(durasihex,8);
		
		
		 connector_id=nonocpp.format_angka_digit(connector_id,2);
		 notrans=nonocpp.dec2hex(notrans);
		 
		 notrans=nonocpp.format_angka_digit(notrans.toString('hex'),8);
		  console.log(`bandingkanStop ?????? ${notrans}`)
		 let datana="02"+connector_id+durasihex+notrans;
		 
		 //response = nonocpp.createPacket(0x06, Buffer.from([0x2503040210010001]) , 0x09C0, Buffer.from([0x01,0x00,0x00000005,0x00000008]));//start
		  response = nonocpp.createPacket(0x06, Buffer.from(chargebox_id,'hex') , 0x09C0, Buffer.from(datana,'hex'));
		  state.gsocket.write(response);
			res.send({ 
						success: true, 
						message: datana,
						data: null
					});
    },
	


  
   
}
