const chargebox = require('./controller-chargebox');
const transaction = require('./controller-transaction');
const auth = require('./controller-auth');
const user = require('./controller-user');
const info = require('./controller-informasi');
const callback = require('./controller-callback');
const wallet = require('./controller-wallet');
const nonocpp = require('./controller-nonocpp');
module.exports ={
	chargebox,transaction,auth,user,info,callback,wallet,nonocpp
};