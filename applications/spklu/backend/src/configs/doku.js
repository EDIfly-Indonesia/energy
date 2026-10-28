const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config({ path: './.env' });
const setting = require("../configs/global.js");
const shortid = require('shortid');  
var request = require('request');
var client_id=process.env.IS_PROD==0? process.env.CLIENT_ID_DOKU_DEV : process.env.CLIENT_ID_DOKU;
var secret_id=process.env.IS_PROD==0? process.env.SECRET_KEY_DOKU_DEV : process.env.SECRET_KEY_DOKU;

// Wallet pusat TIDAK boleh di-hardcode. Nilainya dibaca dari t_setting
// (admin_wallet / admin_wallet_sandbox) lewat global.gwallet_admin yang diisi
// configs/global.js. Sebelumnya nilai test "SAC-2661-1741083847148" ditulis
// langsung di sini, sehingga mengubah setting di dashboard tidak berpengaruh:
// transfer dan refund tetap memakai wallet test itu.
function idWalletAdmin() {
  const isProd = String(process.env.IS_PROD) === '1';
  const nilai = isProd ? global.gwallet_admin : global.gwallet_admin_sandbox;
  const id = String(nilai ?? '').trim();
  if (!/^SAC-/.test(id)) {
    throw new Error(
      'Wallet pusat belum diatur. Isi t_setting.' +
        (isProd ? 'admin_wallet' : 'admin_wallet_sandbox') +
        ' dengan ID sub account DOKU (lihat: node scripts/doku-wallet.cjs status)'
    );
  }
  return id;
}
var url_callback=process.env.IS_PROD==0? process.env.URL_CALLBACK_DEV : process.env.URL_CALLBACK_PROD;
var url_api=process.env.IS_PROD==0? process.env.URL_DOKU_DEV : process.env.URL_DOKU;

/**
 * Lampirkan wallet tujuan ke body topup (Accept Payment, Sub Account V1).
 *
 * `additional_info.account.id` menentukan wallet mana yang menerima dana.
 * Tanpa ini uang topup masuk ke akun utama merchant dan wallet pelanggan tetap
 * nol, sehingga pembayaran pakai saldo (transfer wallet user -> wallet pusat)
 * selalu gagal karena saldo tidak pernah terisi.
 *
 * Hanya ditambahkan bila idwallet benar-benar ID sub account (`SAC-...`), supaya
 * body tidak menjadi tidak valid ketika pemanggil tidak mengirim wallet.
 */
function lampirkanWallet(body, idwallet) {
  const id = String(idwallet ?? '').trim();
  if (!/^SAC-/.test(id)) return body;
  if (!body.additional_info) body.additional_info = {};
  body.additional_info.account = { id };
  return body;
}
// Generate Digest
async function generateDigest(jsonBody) {
    let jsonStringHash256 = crypto.createHash('sha256').update(jsonBody,"utf-8").digest();
    
    let bufferFromJsonStringHash256 = Buffer.from(jsonStringHash256);
    return bufferFromJsonStringHash256.toString('base64'); 
}
 
async function generateSignature( requestId, requestTimestamp, requestTarget, digest) {
    // Prepare Signature Component
    let componentSignature = "Client-Id:" + client_id;
    componentSignature += "\n";
    componentSignature += "Request-Id:" + requestId;
    componentSignature += "\n";
    componentSignature += "Request-Timestamp:" + requestTimestamp;
    componentSignature += "\n";
    componentSignature += "Request-Target:" + requestTarget;
    // If body not send when access API with HTTP method GET/DELETE
    if (digest) {
        componentSignature += "\n";
        componentSignature += "Digest:" + digest;
    }
 
    console.log(componentSignature.toString());
    console.log();

    // Calculate HMAC-SHA256 base64 from all the components above
    let hmac256Value = crypto.createHmac('sha256', secret_id)
                   .update(componentSignature.toString())
                   .digest();  
      
    let bufferFromHmac256Value = Buffer.from(hmac256Value);
    let signature = bufferFromHmac256Value.toString('base64');
    // Prepend encoded result with algorithm info HMACSHA256=
    return "HMACSHA256="+signature 
}
 

  async function postdoku(data,target,header){
	

		let config = {
		  method: 'post',
		  maxBodyLength: Infinity,
		  url: url_api + target,
		  headers: header,
		  data : data
		};
		let respon= await axios.request(config);
		return respon.data;


}

async function createtoken(data,target){
	
		let header= { 
					'X-Signature': client_id, 
					'X-Timestamp': no_trans, 
					'Request-Timestamp': new Date().toISOString(), 
					'X- Client-Key': headerSignature, 
					'Content-Type': 'application/json'
				  };

		let config = {
		  method: 'post',
		  maxBodyLength: Infinity,
		  url: url_api + target,
		  headers: header,
		  data : {
				"grantType":"client_credentials"
				}
		};
		let respon= await axios.request(config);
		return respon.data;


}
 async function createsignature(jsonBody,no_trans,target){
	 let digest = await generateDigest(jsonBody);
	 let timestamp=new Date().toISOString();
		let headerSignature = await generateSignature(
					
					no_trans,
					timestamp,
					target, // For merchant request to Jokul, use Jokul path here. For HTTP Notification, use merchant path here
					digest // Set empty string for this argumentes if HTTP Method is GET/DELETE
					);	

		let header= { 
					'Client-Id': client_id, 
					'Request-Id': no_trans, 
					'Request-Timestamp': timestamp, 
					'Signature': headerSignature, 
					'Content-Type': 'application/json'
				  };
		let hasil=await postreq(jsonBody,target,header);	
		return hasil;		
	 
 }
 
 
 
 
 
 async function createovo(no_trans,total,nama,email,no_hp,target,idwallet=""){
	 let j=`${total}${client_id}${no_trans}${no_hp}${secret_id}`;
	 let check_sum= crypto.createHash('sha256').update(j).digest('hex');;
	 // Pemanggil (controller-auth) sudah mengirim id_wallet sebagai argumen ke-7,
	 // tetapi fungsi ini dulu hanya punya 6 parameter sehingga nilainya dibuang
	 // dan topup OVO tidak pernah masuk ke wallet pelanggan.
	 let body = {
			"client": {
				"id": client_id
			},
			"order": {
				"invoice_number":no_trans,
				"amount": total
			},
			"ovo_info": {
				"ovo_id":no_hp
			},
			"security":{
				"check_sum": check_sum
			}
		};
	 body = lampirkanWallet(body, idwallet);
	 let jsonBody=  JSON.stringify(body);
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 async function saldowallet(no_trans,id_wallet){
	
	let target=`/sac-merchant/v1/balances/${id_wallet}`;
	let hasil=await	createsignatureget(no_trans,target);
	
	return hasil;
		
 }
 
 async function createlink(no_trans,total,nama,email,no_hp,target,idwallet=""){
	 
	 
	 let body={
		"order": {
        "invoice_number": no_trans,
        "amount": total,
        "callback_url": "https://merchant.com/return-url",
        "line_items": [
             {
               "name":"Biaya Charge",
               "price": total,
               "quantity": 1
             } 
        ]
    },
    "customer": {
            "name": nama,
            "email": email,
            "phone" : no_hp
    },
    "additional_info": {
        "override_notification_url": url_callback+"callback/va"
    }
		};
	
	 body = lampirkanWallet(body, idwallet); // wallet tujuan topup
	 let jsonBody=  JSON.stringify(body);
		
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 

 
 async function createshopepay(no_trans,total,target,idwallet=""){
	
	let body={
			
				"order": {
					"invoice_number": no_trans,
					"amount": total,
					"callback_url": "https://merchant.com/return-url",
					"expired_time": 300
				},
				"additional_info": {
					"override_notification_url": url_callback+"callback/va"
				}
			
		};
		// if(idwallet!="") {
			// body.additional_info.account={ "id": idwallet};
		// }
	 body = lampirkanWallet(body, idwallet); // wallet tujuan topup
	 let jsonBody=  JSON.stringify(body);
		 
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 
 async function paywithsaldo(no_trans,total,target,asal){
	
	let body={
			
				"transfer":
					{
						"origin" : asal,
						"destination" : idWalletAdmin(),
						"amount" : total,
						"invoice_number" : no_trans
					}
			
		};
		
	 let jsonBody=  JSON.stringify(body);
		 
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 
 async function withdrawl(no_trans,total,id_wallet,bank_code,account_num,account_name){
	let target="/sac-merchant/v1/payouts";
	let body={
			"account":
				{
					"id":id_wallet
				},
				"payout":
				{
					"amount": total,
					"invoice_number": no_trans
				},
				"beneficiary":
				{
					"bank_code":bank_code,
					"bank_account_number":account_num,
					"bank_account_name": account_name
				}
			
		};
		
	 let jsonBody=  JSON.stringify(body);
		 
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 async function refund(no_trans,total,tujuan){
	let target=`/sac-merchant/v1/transfers`;
	let body={
			
				"transfer":
					{
						"origin" : idWalletAdmin(), 
						"destination" : tujuan,
						"amount" : total,
						"invoice_number" : no_trans
					}
			
		};
		
	 let jsonBody=  JSON.stringify(body);
		 
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 async function createcheckout(no_trans,total,target,idwallet=""){
	
	let body={
			
				"order": {
					"invoice_number": no_trans,
					"amount": total,
					"callback_url": "https://merchant.com/return-url",
					
				},
				"payment": {
				  "payment_due_date": 10,
				  "payment_method_types": [
				  
				  "QRIS"
				 
			  ]
				},
				"additional_info": {
					"override_notification_url": url_callback+"callback/va"
				}
			
		};
		
	 body = lampirkanWallet(body, idwallet); // wallet tujuan topup
	 let jsonBody=  JSON.stringify(body);
		 
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 async function createwallet(email,nama,target){
	let no_trans=Date.parse(new Date().toISOString());
	no_trans+=email;
	 let jsonBody=  JSON.stringify({
			"account": {
			"email": email,
			"type": "STANDARD",
			"name": nama
		}
			
		});
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 
 async function buatwallet(email,nama){
         
     
        hasil= await createwallet(email,nama,"/sac-merchant/v1/accounts");
		return hasil.account.id;
    }
 
 async function createdokuwallet(no_trans,total,target,idwallet=""){
	 let body={
			
		"order": {
        "invoice_number":no_trans,
        "amount": total,
        "line_items": [
            {
                "name": "T-Shirt Red",
                "price": total,
                "quantity": 1
            },
           
        ],
        "success_url": "https://your-success-url.domain/",
        "failed_url": "https://your-failed-url.domain/",
        "notify_url": url_callback+"callback/va",
        "auto_redirect": false
		},
		"additional_info": {
			"override_notification_url": url_callback+"callback/va"
		}
				
			};
	
	 body = lampirkanWallet(body, idwallet); // wallet tujuan topup
	 let jsonBody=  JSON.stringify(body);
	  console.log(jsonBody);
	let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
		
 }
 async function createva(no_trans,total,nama,email,target,id_carabayar,idwallet=""){
	 let jb={};
	 if(id_carabayar==4){
		jb= {
					  "order": {
						"invoice_number":  no_trans,
						"amount": total
					  },
					  "virtual_account_info": {
						"expired_time": 10,
						"reusable_status": false,
						"info1": "Biaya charging",
						"info2": "",
						"info3": "",
						"merchant_unique_reference":shortid.generate()
					  },
					  "customer": {
						"name": nama,
						"email": email,
					  },
					  
					
					}
					
	 }
	 else if(id_carabayar==8){
		 jb={
				"order": {
					"invoice_number": no_trans,
					"amount": total
				},
				"virtual_account_info": {
					"expired_time": 10,
					"reusable_status": true,
					"ref_info" : [
						{
						"ref_name": "kota",
						"ref_value": "bekasi"
						},
						
					]
				},
				"customer": {
					"name": nama,
					"email": email
				},
				
			}
	 }
	 else jb= {
					  "order": {
						"invoice_number":  no_trans,
						"amount": total
					  },
					  "virtual_account_info": {
						"expired_time": 10,
						"reusable_status": false,
						"info1": "Biaya charging",
						"info2": "",
						"info3": "",
						
					  },
					  "customer": {
						"name": nama,
						"email": email,
					  },
					 
					}
					// if(idwallet!="") {
						
						// jb.  additional_info={
											  // "account": {
												   // "id": idwallet
											// }
									  // }	;
						 
					 // }
	// createva memakai variabel `jb`, bukan `body` — tiga cabang (id_carabayar
	// 4/8/lainnya) semuanya harus mendapat wallet tujuan.
	jb = lampirkanWallet(jb, idwallet);
	let jsonBody=  JSON.stringify(jb);
					
		let hasil=await	createsignature(jsonBody,no_trans,target);
	
	return hasil;
					
}	
	
	async function postreq(data,target,header) {
	  
	  const options = {
		'method': 'POST',
		  'url': url_api+target,
		  'headers': header,
		  body: data
	  };

	  // Return new promise
	  return new Promise(function(resolve, reject) {
		// Do async job
		request.post(options, function(err, resp, body) {
		  if (err) {
			reject(JSON.parse(err));
		  } else {
			resolve(JSON.parse(body));
		  }
		})
	  })
}
async function createsignatureget(no_trans,target){
	 
	 let timestamp=new Date().toISOString();
		let headerSignature = await generateSignature(
					
					no_trans,
					timestamp,
					target, // For merchant request to Jokul, use Jokul path here. For HTTP Notification, use merchant path here
					""// Set empty string for this argumentes if HTTP Method is GET/DELETE
					);	

		let header= { 
					'Client-Id': client_id, 
					'Request-Id': no_trans, 
					'Request-Timestamp': timestamp, 
					'Signature': headerSignature, 
					'Content-Type': 'application/json'
				  };
		let hasil=await getreq(target,header);	
		return hasil;		
	 
 }
async function getreq(target,header) {
	  
	  const options = {
		'method': 'GET',
		  'url': url_api+target,
		  'headers': header,
		 
	  };

	  // Return new promise
	  return new Promise(function(resolve, reject) {
		// Do async job
		request.get(options, function(err, resp, body) {
		  if (err) {
			reject(JSON.parse(err));
		  } else {
			resolve(JSON.parse(body));
		  }
		})
	  })
}


module.exports = {createva,createovo,createshopepay,createdokuwallet,createlink,buatwallet,createwallet,
saldowallet,createcheckout,paywithsaldo,refund,withdrawl};
