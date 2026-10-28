const router = require('express').Router();
const { chargebox,transaction,auth,user,info,callback,wallet,nonocpp } = require('../controllers/');


//auth
router.post('/auth/login', auth.login);
router.post('/auth/cekemail', auth.cekemail);
router.post('/auth/tesemail', auth.tesemail);
router.post('/auth/kirimotp', auth.kirimotp);
router.post('/auth/registrasi', auth.registrasi);
router.post('/auth/gantipassword', auth.gantipassword);
router.post('/auth/registrasi', auth.registrasi);
router.post('/auth/resetpassword', auth.resetpassword);
router.post('/auth/hapususer', auth.hapususer);
router.post('/auth/buatwallet', auth.buatwallet);
router.post('/auth/topup', auth.topup);
router.post('/auth/saldowallet', auth.saldowallet);
router.post('/auth/simpantoken', auth.simpantoken);
router.post('/auth/tesfirebase', auth.tesfirebase);
router.post('/auth/transfer', auth.transfer);
router.post('/auth/withdrawl', auth.withdrawl);
router.get('/auth/getsetting', auth.getsetting);
//chargebox
router.post('/chargebox/nearest', chargebox.nearest);
router.post('/chargebox/getharga', chargebox.getharga);

//info
router.post('/informasi/getberita', info.getberita);
router.post('/informasi/gettransaksi', info.gettransaksi);
router.get('/informasi/carabayar', info.carabayar);
router.get('/informasi/welcome', info.welcome);
router.post('/informasi/historisaldo', info.historisaldo);
router.post('/informasi/datatopup', info.datatopup);
router.post('/informasi/getdatatopup', info.getdatatopup);
router.post('/informasi/getdatarefund', info.getdatarefund);
router.post('/informasi/getinvoice', info.getinvoice);

//user
router.post('/user/getsaldo', user.getsaldo);
router.post('/user/getkwhuser', user.getkwhuser);
router.post('/user/ubahprofil', user.ubahprofil);

//transaction
router.post('/transaction/simpanorder', transaction.simpanorder);
router.post('/transaction/startcharging', transaction.startcharging);
router.post('/transaction/stopcharging', transaction.stopcharging);
router.post('/transaction/paywithsaldo', transaction.paywithsaldo);

//callback
router.post('/callback/va', callback.va);
router.post('/callback/tesglobalset', callback.tesglobalset);
router.get('/callback/tesglobalget', callback.tesglobalget);

//wallet
router.post('/wallet/register', wallet.registeragent);
router.post('/wallet/ceksaldo', wallet.ceksaldo);
router.post('/wallet/updatepin', wallet.updatepin);
router.post('/wallet/tokenize', wallet.tokenize);
router.post('/wallet/paywithsaldo', wallet.paywithsaldo);
router.post('/wallet/topup', wallet.topup);

//nonocpp
router.post('/nonocpp/startcharging', nonocpp.startcharging);
router.post('/nonocpp/stopcharging', nonocpp.stopcharging);



module.exports = router;