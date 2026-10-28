const db = require('../services/database.service');
const { pool, query } = db;
const bmsdoku = require("../configs/bmsdoku");
const { tokenUserId } = require('../services/permission');

// Verify that `idwallet` belongs to the authenticated user (SEC-03 IDOR via wallet id).
async function ownWallet(req, idwallet) {
  const id_user = tokenUserId(req);
  if (id_user === null) return false;
  const rows = await query('SELECT id_wallet FROM t_user_mobile WHERE id_user=$1', [id_user]);
  return rows.length === 1 && !!rows[0].id_wallet && rows[0].id_wallet === idwallet;
}

module.exports = {
    // Ambil data semua barang
   async registeragent(req, res) {
         const email = req.user && req.user.email;
         if (!email) return res.send({ success: false, message: 'invalid0', data: null });
         const nama = (req.user && req.user.nama) || req.body.nama;
         const hp = (req.user && req.user.no_hp) || req.body.no_hp;

         const hasil = await bmsdoku.registeragent(nama, email, hp);
         if (hasil && (hasil.status == "0000" || hasil.status == "0010") && hasil.data && hasil.data.WALLETID) {
            await query('UPDATE t_user_mobile SET id_wallet=$1 WHERE email=$2', [hasil.data.WALLETID, email]).catch(e => console.error(e));
         }
         console.log(hasil);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil
         });
   },

   async ceksaldo(req, res) {
         const idwallet = req.body.idwallet;
         if (!(await ownWallet(req, idwallet))) return res.send({ success: false, message: 'invalid0', data: null });

         const hasil = await bmsdoku.ceksaldo(idwallet);
         console.log(hasil);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil
         });
   },

   async updatepin(req, res) {
         const idwallet = req.body.idwallet;
         if (!(await ownWallet(req, idwallet))) return res.send({ success: false, message: 'invalid0', data: null });
         let pinlama = req.body.pinlama;
         let pinbaru = req.body.pinbaru;

         const hasil = await bmsdoku.updatepin(idwallet, pinlama, pinbaru);
         console.log(hasil);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil
         });
   },

   async tokenize(req, res) {
         const idwallet = req.body.idwallet;
         if (!(await ownWallet(req, idwallet))) return res.send({ success: false, message: 'invalid0', data: null });
         let no_trans = Date.parse(new Date().toISOString());
         let pin = req.body.pin;

         const hasil = await bmsdoku.tokenize(idwallet, pin, no_trans);
         console.log(hasil);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil.data.TOKENID
         });
   },

   async paywithsaldo(req, res) {
         const idwallet = req.body.idwallet;
         if (!(await ownWallet(req, idwallet))) return res.send({ success: false, message: 'invalid0', data: null });
         let no_trans = Date.parse(new Date().toISOString());
         var jumlah = req.body.jumlah;
         var tokenid = "";
         var pin = "1111";

         const tokenidresponse = await bmsdoku.tokenize(idwallet, pin, no_trans);
         tokenid = tokenidresponse.data.TOKENID;
         console.log(`tokenid ${tokenid}`);
         const hasil = await bmsdoku.paywithsaldo(idwallet, jumlah, tokenid);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil
         });
   },

   async topup(req, res) {
         const idwallet = req.body.idwallet;
         if (!(await ownWallet(req, idwallet))) return res.send({ success: false, message: 'invalid0', data: null });
         let no_trans = Date.parse(new Date().toISOString());
         var jumlah = req.body.jumlah;

         const hasil = await bmsdoku.topup(idwallet, jumlah, no_trans);

         res.send({
            success: true,
            message: "Berhasil",
            data: hasil
         });
   },

}
