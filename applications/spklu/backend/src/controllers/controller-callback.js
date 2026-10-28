const db = require('../services/database.service');
const { pool, poolpostgre, query } = db;
const lib = require("../configs/lib");
const bmsdoku = require("../configs/bmsdoku");
const promoService = require('../services/promo.service');

module.exports = {
  // Callback pembayaran VA / e-wallet
  async va(req, res) {
    let idtrans = req.body.order.invoice_number;
    var arr = idtrans.split("-");
    let no_trans = arr[0];
    let id_user = arr[1];
    let jenis_trans = arr[2];
    let idwallet = "";
    console.log(req.body);

    try {
      if (jenis_trans == "trans") {
        let sql = `update t_transaction set status_transaksi='ready',status_bayar='paid',tgl_bayar=$1 where no_trans=$2;`;
        await pool.query(sql, [new Date(), no_trans]).catch(e => console.error(e));

        // Klaim budget promo SETELAH pembayaran terkonfirmasi (keputusan
        // TODO-PROMO.md §0.B). Aman di-retry: klaimPromo idempoten.
        // Tidak boleh menggagalkan callback — uang sudah diterima.
        try {
          const hasilPromo = await promoService.klaimPromo(no_trans);
          if (hasilPromo.status !== 'tidak_ada_promo') {
            console.log(`[callback.va] promo no_trans=${no_trans} -> ${hasilPromo.status}${hasilPromo.alasan ? '/' + hasilPromo.alasan : ''}`);
          }
        } catch (e) {
          console.error('[callback.va.promo]', e.message);
        }

        var isiberita = `Pembayaran transaksi ${no_trans} berhasil!`;
        var jenisberita = "pembayaran";
        var judulberita = "Pembayaran Sukses";
      }
      else if (jenis_trans == "topup") {
        idwallet = arr[3];
        let jumlahtopup = req.body.order.amount;
        let sql = `update t_topup set status_topup='finish',status_bayar='paid',tgl_bayar=$1 where no_trans=$2;`;
        await pool.query(sql, [new Date(), no_trans]).catch(e => console.error(e));

        var isiberita = `Pembayaran topup ${no_trans} berhasil!`;
        var jenisberita = "topup";
        var judulberita = "Pembayaran Topup Sukses";

        await bmsdoku.topup(idwallet, jumlahtopup, no_trans);
      }

      let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
      await poolpostgre.query(sqlpostgre, [id_user, no_trans, jenisberita, judulberita, isiberita]).catch(e => console.error(e));

      let sql = `select token from t_user_mobile where id_user=$1;`;
      const results = await query(sql, [id_user]);
      let token = results[0]?.token;
      try {
        if (token) lib.kirimnotif(token, no_trans, 'Pembayaran Sukses', isiberita, "pembayaran");
      } catch (e) {
        console.error('[callback.kirimnotif]', e.message);
      }

      res.send({
        success: true,
        message: "Berhasil",
      });
    } catch (error) {
      console.error('[callback.va]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

};
