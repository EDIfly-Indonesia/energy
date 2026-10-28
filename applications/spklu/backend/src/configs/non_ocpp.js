const crc = require('crc');
const db = require('../services/database.service');
const { pool, poolpostgre } = db;
const lib = require('../configs/lib');
const trans = require('../controllers/controller-transaction');
const nonocpp = require("../configs/non_ocpp");
const state = require('../services/chargingState').state;
function format_angka_digit(number, targetLength) {
    var output = number + '';
    while (output.length < targetLength) {
        output = '0' + output;
    }
    return output;
}

function dec2hex(dec) {
    hexString = dec.toString(16);
    return hexString.toUpperCase();
}
function hex2bin(hex){
    hex = hex.replace("0x", "").toLowerCase();
    var out = "";
    for(var c of hex) {
        switch(c) {
            case '0': out += "0000"; break;
            case '1': out += "0001"; break;
            case '2': out += "0010"; break;
            case '3': out += "0011"; break;
            case '4': out += "0100"; break;
            case '5': out += "0101"; break;
            case '6': out += "0110"; break;
            case '7': out += "0111"; break;
            case '8': out += "1000"; break;
            case '9': out += "1001"; break;
            case 'a': out += "1010"; break;
            case 'b': out += "1011"; break;
            case 'c': out += "1100"; break;
            case 'd': out += "1101"; break;
            case 'e': out += "1110"; break;
            case 'f': out += "1111"; break;
            default: return "";
        }
    }

    return out;
}
function parsePacket(buffer) {
	
    if (buffer.length < 20) {
        console.error('Incomplete packet');
        return null;
    }

    const syn = buffer.readUInt16BE(0);
	 
    if (syn !== 0x3AA3) {
		 
        console.error(`Invalid SYN bytesa ${new Date().toISOString()}`);
        return null;
    }
	
    const res = buffer.slice(2, 5); // RES (3 bytes)
	
    const ptrol = buffer.readUInt8(5); // PTROL (1 byte)
	
    const addr = buffer.slice(6, 14); // ADDR (8 bytes)
	console.log(`addr ${addr.toString('hex')}`);
    const slen = buffer.readUInt16BE(14); // SLEN (2 bytes)
	
    const command = buffer.readUInt16BE(16); // COMMAND (2 bytes)
  
   
    
    // if (buffer.length < 20 + slen) {
        // console.error('Incomplete APPDATA');
        // return null;
    // }

    const appData = buffer.slice(18, 18 + slen); // APPDATA (variable length)
	
    const crc16 = buffer.readUInt16BE(buffer.length-2); // CRC16 (2 bytes)
	
    const packetWithoutCRC = buffer.slice(0, buffer.length-2);
	
    const calculatedCRC16 = crc.crc16ccitt(packetWithoutCRC, 0xA1EC);
    if (crc16 !== calculatedCRC16) {
		
        return null;
    }

    return { syn, res, ptrol, addr, slen, command, appData, crc16 };
}
function hex2dec(dec) {
    hexString =  parseInt(dec, 16);;
    return hexString;
}

// Function to create a binary packet
function createPacket(ptrol, addr, command, appData) {
    const slen = appData.length; // Length of APPDATA
	
    const buffer = Buffer.alloc(20 + slen); // 2 + 3 + 1 + 8 + 2 + 2 + slen + 2 = 20 + slen bytes
    buffer.writeUInt16BE(0x3AA3, 0); // SYN
    buffer.fill(0x00, 2, 5); // RES (3 bytes of 0x00)
    buffer.writeUInt8(ptrol, 5); // PTROL
    addr.copy(buffer, 6); // ADDR
	console.log(`addrcreate ${addr.toString('hex')}`);
    buffer.writeUInt16BE(slen+2, 14); // SLEN
    buffer.writeUInt16BE(command, 16); // COMMAND
    appData.copy(buffer, 18); // APPDATA

    // Calculate CRC16 with initial value 0xA1EC
    const packetWithoutCRC = buffer.slice(0, 18 + slen);
    const crc16 = crc.crc16ccitt(packetWithoutCRC, 0xA1EC);
    buffer.writeUInt16BE(crc16, 18 + slen); // CRC16

    return buffer;
}

function handle_heartbeat(chargebox_id,buffer){
	console.log("Mulai heartbeat");
	
	const datatype= buffer.slice(0, 1);
	
	const datalength= buffer.slice(1, 3);
	
	const datalength2=parseInt(datalength.toString('hex'), 16);
	
	const devicestatus= buffer.slice(3, 4);
	
	const reserved= buffer.slice(4, 6);
	
	const jumrelay=(datalength2-3)/5;
	
	const power0= buffer.slice(6, 10);
	const status0= buffer.slice(10, 11);
	
	const power1= buffer.slice(11, 15);
	const status1= buffer.slice(15, 16);
	
	 const bin=hex2bin(status0.toString('hex')); 
	
	const relaypower=[];
	const relaystatus=[];
	
	var mulaipower=6;
	for(i=0;i<jumrelay;i++){
		
		relaypower[i]=buffer.slice(mulaipower, (mulaipower+4));
		relaystatus[i]=buffer.slice((mulaipower+4), (mulaipower+5));
		mulaipower+=5;
		
		if(relaystatus[i].toString('hex')=="01"){
			//hitung kwh dlll
			
			//cari idtrans yg aktif yg sesuai dengan relay ini
			idtrans=state.gnotransnonocpp[chargebox_id][i];
			
			const valuekwh=hex2dec(relaypower[i].toString('hex'));
			console.log(`valuekwh ${valuekwh}`);
			var pemakaian=0;
			var valuewatt=valuekwh*0.163333;
			state.gkwhnonocpp[idtrans].push(Math.round(valuewatt));
			if(state.gkwhnonocpp[idtrans].length>0){ //get awal kwh
				
				pemakaian=Math.round(valuewatt)-state.gkwhnonocpp[idtrans][0];
				console.log(`pemakaian ::::::: ${pemakaian}`);
				simpanpostgrekwh(idtrans, pemakaian);
				if(state.gkwhnonocpp[idtrans].length==1){
					no_trans=state.gnotrans_id[idtrans];
					console.log(`no_transheartbeat ${no_trans}`);
					let sqldetail=`update t_transaction_detail set start_value=$1 where no_trans=$2`;
					var hasildetail =  pool.query(sqldetail,[state.gkwhnonocpp[idtrans][0],no_trans]).catch(e=>console.error(e));
				}
				
				kontrol(pemakaian,idtrans,chargebox_id,i);
			}
		}
		
		else {
			
		}
		
	}
	
	
	
	console.log("Akhir heartbeat");
	
	
	let sqlping=`update t_chargebox set last_ping=$1 where chargebox_id=$2;`;
	var hasilpingl =  pool.query(sqlping,[ new Date(), chargebox_id]).catch(e=>console.error(e));
}

function kontrol(pemakaian,idtransdb,chargebox_id,connector_id){
	
	if(state.gjenis_charging[idtransdb]=="kwh"){
		console.log(`pemaiakian ${pemakaian}`);
		
		if((pemakaian)>= state.gjumlah_kwh[idtransdb]){
			
			stopcharging(idtransdb,connector_id,chargebox_id);
			// akhir stop charging
		}
	}		else {
		 simpanpostgreduration(idtransdb, pemakaian);
		}
	
}

function stopcharging(idtransdb,connector_id,chargebox_id){
	
			console.log(`idtransdb STOPP ${idtransdb}`);
			// stop charging
			connector_id=format_angka_digit(connector_id,2);
			let notrans=dec2hex(idtransdb);
		 
			notrans=format_angka_digit(notrans.toString('hex'),8);
			
			
			 let durasi=0;
			let durasihex=dec2hex(durasi);
			durasihex=format_angka_digit(durasihex,8);
			let datana="02"+connector_id+durasihex+notrans;
			response = createPacket(0x06, Buffer.from(chargebox_id,'hex') , 0x09C0, Buffer.from(datana,'hex'));
		    state.gsocket.write(response);
}

async function handle_responstar(chargebox_id,buffer){
	console.log("Mulai responstar");
	
	const transaksi_id= buffer.slice(0, 1);
	
	const isSukses= buffer.slice(2, 3);
	if(isSukses.toString('hex')=="00"){
		
		const idtrans= buffer.slice(3, 7);
	
		const idtransdb=hex2dec(idtrans.toString('hex'));
	
		
		
		
		
		const relay_id= buffer.slice(1, 2);
		console.log(`relay_id ${relay_id.toString('hex')}`);
		const relay=hex2dec(relay_id.toString('hex'));
		if(transaksi_id.toString('hex')=="01"){ //start charging
			// insert ke postgre update stta
			updatestatustransaksi(chargebox_id,idtransdb,"charging",relay);
			updatestatuskonektor(chargebox_id,relay,"Charging");
			//insert ke postgre  tabel charging
			let ordervalue=state.gjenis_charging[idtransdb]=="duration"? state.gjumlah_durasi[idtransdb] : state.gjumlah_kwh[idtransdb];
			let sqlpostgre=`INSERT INTO charging( no_trans,chargebox_id,connector_id,tanggal,jenis,order_value) values($1,$2,$3,$4,$5,$6);`;
		    var hasil2 =  poolpostgre.query(sqlpostgre,[idtransdb,chargebox_id,relay,new Date(),state.gjenis_charging[idtransdb],ordervalue]);
			// akhir insert ke postgre  tabel charging
			state.gnotransnonocpp[chargebox_id][relay]=idtransdb;
			state.gkwhnonocpp[idtransdb]=[];
		
			console.log("Akhir responstar");
		}
	
		else { //stop charging
			
			updatestatuskonektor(chargebox_id,relay,"Available");
			state.gnotransnonocpp[chargebox_id][relay]=null;
			
			console.log(`no_trans_stop-------------------------- ${idtransdb}`);
			updatestatustransaksi(chargebox_id,idtransdb,"finish",relay);
			pjg=state.gkwhnonocpp[idtransdb].length;
			kwhakhir=state.gkwhnonocpp[idtransdb][(pjg-1)];
			pemakaian_akhir=kwhakhir-state.gkwhnonocpp[idtransdb][0];
			console.log(`pemakaian_akhir ${pemakaian_akhir}`);
			
			console.log(`pjg ${pjg}`);
			console.log(`kwhakhir ${kwhakhir}`);
		
					
					console.log(`no_transheartbeat ${idtransdb}`);
					let sqldetail=`update t_transaction_detail set stop_timestamp=$1, stop_value=$2 where no_trans=$3`;
					
					await pool.query(sqldetail, [new Date(),kwhakhir,idtransdb]).catch(e=>console.error(e));
							{
								
							
										//cek refund
										cekrefund(idtransdb,pemakaian_akhir,idtransdb);
										//akhir cek refund
										state.gkwhnonocpp[idtransdb]=[];
										
										var isiberita=`Charging ${idtransdb} selesai!`;
										let sqlpostgre=`INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
						var hasil2 =  poolpostgre.query(sqlpostgre,[ state.gid_user[idtransdb],idtransdb,'finishcharging','Charging Selesai',isiberita]).catch(e=>console.error(e));
					
						lib.kirimnotifselesai(state.gtoken_fcm[idtransdb],idtransdb,state.gid_user[idtransdb]);
								}
					
					
			
			
			console.log(`no_trans ${idtransdb}`);
			console.log("Stopcharging/Close relay");
			console.log("Akhir responstop");
		}
	}
	
	else {
		console.log(`Perintah tidak sukses`);
	}
	
	
	
	
	
	
	
	
	const terminaltrans= buffer.slice(7, 11);
	
	
	
	
	
}

function cekrefund(transnumber,pemakaian,idtransdb){
	
	console.log(`gjenis_charging===${state.gjenis_charging[idtransdb]}`);
	if(state.gjenis_charging[idtransdb]=="kwh"){
		
		if(state.gjumlah_kwh[idtransdb] > pemakaian ){
			console.log(`gjumlah_kwh[idtransdb] ${state.gjumlah_kwh[idtransdb]}`);
				trans.refund(transnumber);
		}
		else {
			console.log("tidak refund");
													
		}						
								
											
									
										}
}

function updatestatuskonektor(chargeboxId,relay,statusna){
	console.log(`relay ${relay}`);
	let now=new Date();
	let sqlpostgre=`INSERT INTO konektor (chargebox_id,connector_id,status,waktu) VALUES ($1,$2,$3,$4) ON CONFLICT (chargebox_id,connector_id) DO UPDATE
								SET status = $5,waktu=$6;`;
	var results =  poolpostgre.query(sqlpostgre,[chargeboxId,relay,statusna,now,statusna,now]);
}

function updatestatustransaksi(chargeboxId,trans_id,statusna,relay){
	console.log(`updatestatustransaksi ${trans_id} ${statusna}`);
	let now=new Date();
	let sqlstatus=`update t_transaction set status_transaksi=$1 where no_trans=$2;`;
	var hasil =  pool.query(sqlstatus,[statusna,trans_id]).catch(e=>console.error(e));
	
	if(statusna=="charging"){
		let sqldetail=`update t_transaction_detail set id_tag=$1,start_timestamp=$2 where no_trans=$3`;
		var hasildetail =  pool.query(sqldetail,[chargeboxId, new Date(),trans_id]).catch(e=>console.error(e));
		
		if(state.gjenis_charging[trans_id]=="duration"){
			console.log(`gjenis_charging ${state.gjenis_charging[trans_id]} `);
			console.log(`gorder durasi ${state.gjumlah_durasi[trans_id]} `);
						console.log(`Start transaction ${chargeboxId} `);
						let setiap=2000;
						var lama=2000;
						state.glama_durasi[trans_id]=0;
						var connector_id=relay;
						
						const interval = setInterval(() => {
									lama+=setiap;
									console.log(`lama durasi>>>>>>>>>>>>> ${lama}`);
									simpanpostgre(trans_id,lama,"duration");
									
									state.glama_durasi[trans_id]=lama;
								  
								}, setiap);	 
								
								
								state.ginterval[trans_id]=interval;
								const interval2 = setTimeout (() => {
									console.log(`Stopping transaction  due to timeout`);
												stopcharging(trans_id,connector_id,chargeboxId);
												clearInterval(interval);	
													
												  }, state.gjumlah_durasi[trans_id]);
								  state.ginterval2[trans_id]=interval2;
		}
	}
	
	else {
		
	}
}

 function simpanpostgrekwh(transnumber, penggunaan) {
	  
		let sql=`update charging set penggunaan=$1,masuk_kwh=$1 where no_trans=$2;`;
	    var hasil =  poolpostgre.query(sql,[penggunaan,transnumber]);
		
  }
  
   function simpanpostgre(transnumber, penggunan,jenischarging) {
		if(jenischarging=="kwh"){
			let sql=`update charging set penggunaan=$1,masuk_kwh=$1 where no_trans=$2;`;
			var hasil =  poolpostgre.query(sql,[penggunan,transnumber]);
		}
		
		else {
			console.log(`simpanpenggunaan ????????? ${penggunan}`);
			console.log(`simpanpenggunaan2 ????????? ${transnumber}`);
			let sql=`update charging set penggunaan=$1 where no_trans=$2;`;
			var hasil =  poolpostgre.query(sql,[penggunan,transnumber]);
		}
		
		
		
    
   }
   
   function simpanpostgreduration(transnumber, penggunaan) {
	  
		let sql=`update charging set masuk_kwh=$1 where no_trans=$2;`;
	    var hasil =  poolpostgre.query(sql,[penggunaan,transnumber]);
		
  }
function simpanlog(chargebox_id,log){
	
let sqlstatus=`insert into t_log(chargebox_id,isi) values($1,$2);`;
	var hasil =  pool.query(sqlstatus,[chargebox_id,log]).catch(e=>console.error(e));
}

 module.exports = { parsePacket,createPacket,handle_heartbeat,handle_responstar,format_angka_digit,dec2hex};
