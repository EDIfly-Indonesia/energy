require('dotenv').config({ path: './.env' });
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const axios = require('axios');
const nodemailer = require('nodemailer');
const path = require('path');
const messaging = require("../configs/firebaseConfig");
const db = require('../services/database.service');
const { query } = db;
const { decryptSecret } = require('./secret');
function encrypt(pass) {
   let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
   let encrypted = cipher.update(pass);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(pass) {
   let iv = Buffer.from(pass.iv, 'hex');
   let encryptedText = Buffer.from(pass.encryptedData, 'hex');
   let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString();
}
function  cektoken(req,res){
    // Auth is enforced by the Fastify preHandler (mobileTokenAuth). This is now a
    // PURE function (returns boolean, sends nothing). The old send-then-continue
    // pattern let handlers run business logic on invalid tokens — never res.send here.
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) return false;
        const theToken = req.headers.authorization.split(' ')[1];
        if (!theToken) return false;
        const decoded = jwt.verify(theToken, process.env.SECRET_KEY);
        if (!decoded || !decoded.data || !decoded.data.email) return false;
        const key = crypto.createHmac('sha256', process.env.PENGACAK).update(decoded.data.email).digest('hex');
        return decoded.key === key;
    } catch (e) {
        return false;
    }
}
	
	function  cekkey(req,res){
    // Pure (returns boolean, sends nothing) — see cektoken note above.
    try {
        return req.headers['key-header'] === process.env.KEY_HEADER;
    } catch (e) {
        return false;
    }
    }
	
	function  cekheader(req,res){
    let hasil=false;
       if(
            !req.headers.authorization ||
            !req.headers.authorization.startsWith('Bearer') ||
            !req.headers.authorization.split(' ')[1]
            ){
                 res.send({ 
                    success: false, 
                    message: 'invalid',
                    data: null 
                });
                
                
            }
               try {
            const theToken = req.headers.authorization.split(' ')[1];
            //const decoded = jwt.verify(theToken, process.env.SECRET_KEY);
            if(theToken!=process.env.SECRET_KEY){
				res.send({ 
                        success: false, 
                        message: 'invalid',
                        data: null 
                });
			}
         
               }
               catch(e) {
                        res.send({ 
                        success: false, 
                        message: 'invalid',
                        data: null 
                });
             }
            
    }
	
async function getSmtpConfig() {
    try {
        const rows = await query('SELECT nama_setting, value_setting FROM t_setting WHERE nama_setting LIKE $1', ['smtp_%']);
        const cfg = {};
        for (const r of rows) cfg[r.nama_setting] = r.value_setting;
        return cfg;
    } catch (e) {
        console.error('[smtp] gagal baca konfigurasi dari t_setting:', e.message);
        return null;
    }
}

async function kirimemailotp(emailtujuan, otp) {
    try {
        // SMTP config diambil dari t_setting (editable via halaman Setting admin), BUKAN .env.
        const cfg = await getSmtpConfig();
        if (!cfg || !cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
            console.error('[smtp] smtp_host / smtp_user / smtp_pass belum diisi di t_setting');
            return false;
        }
        const transporter = nodemailer.createTransport({
            host: cfg.smtp_host,
            port: Number(cfg.smtp_port) || 465,
            secure: cfg.smtp_secure !== 'false',
            auth: {
                user: cfg.smtp_user,
                pass: decryptSecret(cfg.smtp_pass),
            },
            // Fail fast instead of hanging the request when the SMTP host is
            // unreachable (e.g. outbound 465/587 blocked by the provider firewall).
            connectionTimeout: Number(cfg.smtp_timeout) || 10000,
            greetingTimeout: Number(cfg.smtp_timeout) || 10000,
            socketTimeout: Number(cfg.smtp_timeout) || 10000,
        });
        const mail = {
            to: emailtujuan,
            from: cfg.smtp_from || `"Admin GoCaz" <${cfg.smtp_user}>`,
            subject: 'Kode OTP',
            html: htmlOTP(otp),
        };
        const info = await transporter.sendMail(mail);
        return Boolean(info && info.messageId);
    } catch (e) {
        console.error('[kirimemailotp]', e.message);
        return false;
    }
}

function kirimnotif(registrationToken,transnumber,judul,isi,jenis){
	try {
		
			const message = {
			  notification:{
				title: judul,
				body :isi
			  },				  
			  data: {
				jenis: jenis,
				no_trans: transnumber,
				
			  },
			  "android":{
				  "priority":"normal"
				  // "notification":{
				  // "sound" :"finish_charging_ind"
			  // },	
				},
			  token: registrationToken
			};

			// Send a message to the device corresponding to the provided
			// registration token.
			messaging.send(message)
			  .then((response) => {
				// Response is a message ID string.
				console.log('Successfully sent message:', response);
			  })
			  .catch((error) => {
				console.log('Error sending message:', error);
			  });
		
	}
	
	catch(e) {
        console.log(e);
      
    }
		
	
}
 function kirimnotifselesai(token,transnumber,iduser){
	 console.log(`CHARGING SELESSAI`);
	 	var isiberita=`Charging ${transnumber} selesai!`;
		kirimwa(iduser,isiberita,transnumber);
		kirimnotif(token,transnumber,'Charging Selesai',isiberita,"finishcharging");
		
 }
 
 async function kirimwa(iduser,isiberita,transnumber){
	  let sql=`select no_hp from t_user_mobile where id_user=$1	 ;`
	  
	  try {
	    const results = await query(sql, [iduser]);
	    if (results.length === 0) return;
	    var no_hp = results[0].no_hp;
	    console.log(`no_hp adalah////////////////// : ${no_hp}`);
	    if (no_hp && no_hp.charAt(0) == "0") {
	      no_hp = "62" + no_hp.slice(1);
	      console.log(`NOWAnya adalah///////////// : ${no_hp}`);
	      waselesai(no_hp, transnumber);
	    }
	  } catch (err) {
	    console.error(err);
	  }
 }
 
 async function waselesai(no,transnumber){
	  let sql=`select t.no_trans,jml_kwh_order,jml_kwh_terpakai,start_timestamp,stop_timestamp from t_transaction t join 
	  t_transaction_detail d on t.no_trans=d.no_trans where t.no_trans=$1	 ;`
	  try {
	    const results = await query(sql, [transnumber]);
	    if (results.length === 0) return;
		var pesan="*CHARGING SELESAI!*";
		var isiwa=pesan +"\n";
		isiwa+="_Silahkan pindahkan kendaraan Anda,terima kasih!_" + "\n";
		isiwa+= `No transaksi: ${transnumber}\n`;
		isiwa+= `Kwh masuk 	: ${(results[0].jml_kwh_terpakai/1000)}\n`;
		isiwa+= `Start time 	: ${formatDateTime(results[0].start_timestamp)  }\n`;
		isiwa+= `Stop time 	: ${formatDateTime(results[0].stop_timestamp)}\n`;
		let data = JSON.stringify({
		"api_key": process.env.WA_API_KEY || "",
		  "receiver": no,
		  "data": {
			"message": isiwa
		  }
		});

		let config = {
		  method: 'post',
		  maxBodyLength: Infinity,
		  url: 'https://whatsapp.qtv.my.id/api/send-message',
		  headers: { 
			'Content-Type': 'application/json'
		  },
		  data : data
		};

		axios.request(config)
		.then((response) => {
		  console.log(JSON.stringify(response.data));
		})
		.catch((error) => {
		  console.log(error);
		});
	  } catch (err) {
	    console.error(err);
	  }
 }
 
 function formatDateTime(date) {
	 const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
   const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day} ${monthName} ${year} ${hours}:${minutes}`;
}
function htmlnya(namatoko,tanggalaktif){
    let html=`<html><head>
			<style>
			td{
				border-collapse: collapse;
					border-spacing: 0;
					font-family: 'Arial',sans-serif;
					color: #555;
					line-height: 1.5;
					border-bottom-color: #cccccc;
					border-bottom-width: 1px;
					border-bottom-style: solid;
					margin: 0;
					padding: 5px 10px;
				}
				.flex{padding:0px; color:#444; width:100%}
				@media only screen and (min-width: 500px) 
				{
					.flex{padding:0px; color:#444; width:70%}
				}
			</style>
			</head><body style='color:#444; padding:10px;font-size:14px'>
			<div style='border:solid 1px #ddd; padding:0px'>
			<div style='width:100%' align='center'>
				<div class='flex' align='left' >
					
					<h2 align='center' style='color:#444'> Pembayaran Sukses.</h2>
					<div style='color:#444'>
					Terima kasih telah melakukan Pembayaran.Berikut data keaktifan toko anda :<br>
					</div>
					<table border=0 widht='100%' style='margin-top:20px; width:100%' cellspacing='10' >
					   
						
					  
				   
					<p aling='center' style='padding:15px;background:rgb(240, 240, 240);'>
						<a style='font-family: \"Arial\",sans-serif;
								color: #000000!important;
								line-height: 1.5;
								text-decoration: none!important;
								display: block;
								clear: both;
								width: 50%;
								text-align: center;
							   
								font-size: 18px;
								margin: 0 auto;
								padding: 10px 0;' href='#' target='_BLANK'> Nama Toko:  ${namatoko}</a><br>
								<a style='font-family: \"Arial\",sans-serif;
								color: #000000!important;
								line-height: 1.5;
								text-decoration: none!important;
								display: block;
								clear: both;
								width: 50%;
								text-align: center;
							   
								font-size: 18px;
								margin: 0 auto;
								padding: 10px 0;' href='#' target='_BLANK'> Aktif sampai:  ${tanggalaktif}</a>
					</p>
					<p style='font-family:\"Arial\",sans-serif;color:#999;line-height:1.5;margin:0;padding:10px; font-size:12px; background:rgb(240, 240, 240);'>
						Segala bentuk informasi seperti
						<b>
						nomor kontak, alamat e-mail, atau password kamu bersifat rahasia.
						</b>
						Jangan menginformasikan data-data tersebut kepada siapa pun, termasuk kepada pihak yang mengatasnamakan AilaPOS.
					</p>
					
					<hr style='border:2px solid #ed1b2f'>
					<div align='center' style='color:#444'>Harap jangan membalas e-mail ini, karena e-mail ini dikirimkan secara otomatis oleh sistem.</div>
				</div>
				
			</div>

			</div>
			</body></html>`;
			
			return html;
}

    
function getwaktu(){
    let date_ob = new Date();

// current date
// adjust 0 before single digit date
        let date = ("0" + date_ob.getDate()).slice(-2);
        
        // current month
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        
        // current year
        let year = date_ob.getFullYear();
        
        // current hours
        let hours = date_ob.getHours();
        
        // current minutes
        let minutes = date_ob.getMinutes();
        
        // current seconds
        let seconds = date_ob.getSeconds();
        
        let waktuskrg=year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    
        return waktuskrg;
}

function htmlOTP(otp){
    let html=`<html><head>
			<style>
			td{
				border-collapse: collapse;
					border-spacing: 0;
					font-family: 'Arial',sans-serif;
					color: #555;
					line-height: 1.5;
					border-bottom-color: #cccccc;
					border-bottom-width: 1px;
					border-bottom-style: solid;
					margin: 0;
					padding: 5px 10px;
				}
				.flex{padding:0px; color:#444; width:100%}
				@media only screen and (min-width: 500px) 
				{
					.flex{padding:0px; color:#444; width:70%}
				}
			</style>
			</head><body style='color:#444; padding:10px;font-size:14px'>
			<div style='border:solid 1px #ddd; padding:0px'>
			<div style='width:100%' align='center'>
				<div class='flex' align='left' >
					
					<h2 align='center' style='color:#444'> OTP</h2>
					<div style='color:#444'>
					Berikut OTP aplikasi GoCaz:<br>
					</div>
					<table border=0 widht='100%' style='margin-top:20px; width:100%' cellspacing='10' >
					   
						
					  
				   
					<p aling='center' style='padding:15px;background:rgb(240, 240, 240);'>
						<a style='font-family: \"Arial\",sans-serif;
								color: #000000!important;
								line-height: 1.5;
								text-decoration: none!important;
								display: block;
								clear: both;
								width: 50%;
								text-align: center;
							   
								font-size: 18px;
								margin: 0 auto;
								padding: 10px 0;' href='#' target='_BLANK'> Kode OTP:  ${otp}</a><br>
								
					</p>
					<p style='font-family:\"Arial\",sans-serif;color:#999;line-height:1.5;margin:0;padding:10px; font-size:12px; background:rgb(240, 240, 240);'>
						Segala bentuk informasi seperti
						<b>
						nomor kontak, alamat e-mail, atau password kamu bersifat rahasia.
						</b>
						Jangan menginformasikan data-data tersebut kepada siapa pun, termasuk kepada pihak yang mengatasnamakan GoCaz.
					</p>
					
					<hr style='border:2px solid #ed1b2f'>
					<div align='center' style='color:#444'>Harap jangan membalas e-mail ini, karena e-mail ini dikirimkan secara otomatis oleh sistem.</div>
				</div>
				
			</div>

			</div>
			</body></html>`;
			
			return html;
}
    
    module.exports = { cektoken,cekheader,cekkey,getwaktu,kirimemailotp,kirimnotif,kirimnotifselesai};