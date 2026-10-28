const db = require('../services/database.service');
const { query } = db;
const doku = require("../configs/doku");
const bmsdoku = require("../configs/bmsdoku");
const { tokenUserId } = require('../services/permission');

module.exports = {

  async getsaldo(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let id_wallet = req.body.id_wallet;
    const wrows = await query('SELECT id_wallet FROM t_user_mobile WHERE id_user=$1', [id_user]);
    if (wrows.length !== 1 || !wrows[0].id_wallet || wrows[0].id_wallet !== id_wallet) {
      return res.send({ success: false, message: 'invalid0', data: null });
    }

    let hasil = await bmsdoku.ceksaldo(id_wallet);
    console.log(hasil);
    if (hasil.status == "0000") {
      res.send({
        success: true,
        message: "Berhasil",
        data: hasil.data.LAST_BALANCE.substring(0, hasil.data.LAST_BALANCE.length - 3)
      });
    }
    else
      res.send({
        success: false,
        message: "gagal",
      });
  },

  async getkwhuser(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const sql = `
      SELECT round((0.001 * bln_ini)::numeric, 2)::float8 AS bln_ini,
             round((0.001 * ttl)::numeric, 2)::float8 AS total
      FROM t_kwh_user WHERE id_user = $1;
    `;

    try {
      const results = await query(sql, [id_user]);
      if (results.length == 1) {
        var row = results[0];
        res.send({
          success: true,
          message: "Berhasil",
          data: row
        });
      } else {
        res.send({
          success: false,
          message: "Data tidak ditemukan",
          data: null
        });
      }
    } catch (error) {
      console.error('[getkwhuser]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async ubahprofil(req, res) {
    const email = req.user && req.user.email;
    if (!email) return res.send({ success: false, message: 'invalid0', data: null });
    let nama = req.body.nama;

    const sql = `update t_user_mobile set nama=$1 where email=$2;`;

    try {
      await query(sql, [nama, email]);
      res.send({
        success: true,
        message: "Update profil berhasil",
      });
    } catch (error) {
      console.error('[ubahprofil]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

};
