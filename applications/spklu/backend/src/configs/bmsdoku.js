var crypto = require('crypto');
var request = require('request');
require('dotenv').config({ path: './.env' });
const mall_id=process.env.IS_PROD==0? process.env.MALLID_DEV : process.env.MALLID_PROD;
const sharedkey=process.env.IS_PROD==0? process.env.SHAREDKEY_DEV : process.env.SHAREDKEY_PROD;
const url_bms=process.env.IS_PROD==0? process.env.URL_BMS_DEV : process.env.URL_BMS_PROD;

function sha1(data) {
     var generator = crypto.createHash('sha1');
     generator.update(data) ; 
     return generator.digest('hex') ;
}

async function registeragent(nama,email,hp){
	
	let target="RegisterAgent";
	const pinawal="1111";
	var words=mall_id+sharedkey+email;
	
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'customerName': nama,
			'customerEmail': email,
			'customerPhone': hp,
			'WORDS': sha1(words),
			'agentLevel': 1,
			'encryptedPin': sha1(pinawal),
			'DWRegister': 0,
			'depositType': 0
		  };
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}

async function ceksaldo(idwallet){
	
	let target="CheckBalanceDeposit";
	var words=mall_id+sharedkey+idwallet;
	
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'WALLETID' : idwallet,
			'WORDS': sha1(words),
			
		  };
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}



async function updatepin(idwallet,oldpin,newpin){
	
	let target="UpdatePIN";
	var words=mall_id+sharedkey+idwallet+sha1(oldpin);
	
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'WALLETID': idwallet,
			'OLD_PIN': sha1(oldpin),
			'NEW_PIN': sha1(newpin),
			'WORDS': sha1(words)
	};
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}

async function tokenize(idwallet,pin,notrans){
	console.log(`PINNA ${pin}`);
	console.log(`idwallet ${idwallet}`);
	let target="TokenizePIN";
	var words=mall_id+sharedkey+idwallet+notrans+sha1(pin);
	
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'TRANSIDMERCHANT': notrans,
			'WALLETID': idwallet,
			'PIN': sha1(pin),
			'WORDS': sha1(words)
	};
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}

async function paywithsaldo(idwallet,jumlah,token){
	
	let target="RequestPurchaseWithPIN";
	var words=mall_id+sharedkey+idwallet;
	
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'WALLETID': idwallet,
			'AMOUNT': jumlah,
			'TOKENIZEDPIN': token,
			'WORDS': sha1(words),
			'TYPE': 'T'
  };
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}

async function topup(idwallet,jumlah,notrans){
	
	let target="TopupDepositDirect";
	var words=mall_id+sharedkey+idwallet+jumlah+notrans;
	console.log(new Date().toString());
	 let req= {
			'MALLID': mall_id,
			'CHAINMERCHANT': 0,
			'WALLETID': idwallet,
			'AMOUNT': jumlah,
			'TRANSIDMERCHANT': notrans,
			'CHANNEL': '01',
			'DATETIME':  converttanggal(Date().toString()),
			'WORDS': sha1(words)
  };
		 
	let hasil=await postreq(req,target);	
	return hasil;		
}

function converttanggal(tanggal){
	console.log(tanggal);
	 var arr = tanggal.split(" ");
	let hari=arr[0];
	let bulan=arr[1];
	let tgl=arr[2];
	let tahun=arr[3];
	let jam=arr[4];
	var waktu=hari +" "+bulan+" "+tgl+" "+jam +" WIB"+ " " + tahun;
	console.log(waktu);
	return waktu;
}



async function postreq(data,target) {
	  
	  const options = {
		'method': 'POST',
		  'url': url_bms+target,
		  'headers': {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cookie': `JSESSIONID=${process.env.BMS_DOKU_JSESSIONID || ''}`
			},
		  'form': data
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

module.exports = {registeragent,ceksaldo,updatepin,topup,tokenize,paywithsaldo};
