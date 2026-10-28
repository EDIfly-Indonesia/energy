const db = require('../services/database.service');
const { pool, poolpostgre, query, run } = db;
const jwt = require('jsonwebtoken');
const lib = require("../configs/lib");
require('dotenv').config({ path: './.env' });
var nodemailer = require('nodemailer');
var bcrypt = require('bcryptjs');
const doku = require("../configs/doku");
const bmsdoku = require("../configs/bmsdoku");
const messaging = require("../configs/firebaseConfig");
const crypto = require("crypto");
const { tokenUserId } = require('../services/permission');
const walletProvision = require('../services/wallet-provision');

// In-memory OTP store for the forgot-password flow (kirimotp -> resetpassword).
const otpStore = new Map(); // email -> { otp, expires }
const OTP_TTL = 10 * 60 * 1000; // 10 menit

module.exports = {

  async login(req, res) {
    let email = req.body.email;
    let pass = req.body.password;
    let loginby = req.body.loginby;
    let apple_id = req.body.apple_id ?? '';

    let sql = `SELECT u.id_user ,u.email,u.nama,u.no_hp,m.name AS mitra,m.id_mitra, nama_member AS jenis_member,u.password,j.id_jenismember,u.id_wallet
      FROM t_user_mobile u JOIN t_mitra m
      ON u.id_mitra=m.id_mitra JOIN t_jenismember j ON u.id_jenismember=j.id_jenismember
      WHERE u.email=$1 or (u.apple_id =$2 and apple_id is not null and apple_id !='') and u.deleted_at is null;`;

    try {
      const results = await query(sql, [email, apple_id]);

      if (!Array.isArray(results) || results.length !== 1) {
        return res.send({ success: false, message: 'User tidak terdaftar', data: "" });
      }

      let cekpass = await bcrypt.compare(pass ?? '', results[0].password ?? '');

      if ((cekpass && loginby == "password") || loginby == "email") {
        let patokan = 24 * 60 * 60 * 7;
        let row = results[0];
        let key = crypto.createHmac('sha256', process.env.PENGACAK).update(results[0].email).digest('hex');
        let token = jwt.sign({ data: results[0], key }, process.env.SECRET_KEY, { expiresIn: patokan });

        delete row.password;

        return res.send({
          success: true,
          message: "Berhasil",
          data: row,
          token: token
        });
      }

      return res.send({ success: false, message: 'Password salah', data: "" });
    } catch (e) {
      return res.json({ status: false, error_trace: 3, error: e.message });
    }
  },

  async cekemail(req, res) {
    
    let email = req.body.email;

    let sql = `SELECT id_user FROM t_user_mobile WHERE email=$1;`;

    try {
      const results = await query(sql, [email]);
      if (results.length == 1) {
        res.send({ success: true, message: "Email valid" });
      } else {
        res.send({ success: false, message: 'Email tidak terdaftar' });
      }
    } catch (error) {
      console.error('[cekemail]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async tesemail(req, res) {
    let kirimemail = await lib.kirimemailotp("farid0810@gmail.com", "123");
    res.send({ success: kirimemail, message: "Email valid" });
  },

  async tesfirebase(req, res) {
    const registrationToken = 'cEkNLgZnRiS0czGAzfXu7a:APA91bFxcjZT0Fm6vqdOnhJkMCGxzs1nErhwuuUFAu7ZwaA0SAMdTwY5p6c1aANjHeh9ImC1A3cO19DF_R7kcEgZWpN3J-TArLrAKjYFbaX5vYtenyNuBHo';

    const message = {
      notification: {
        title: "Judul",
        body: "Isi"
      },
      data: {
        score: '850',
        time: '2:45'
      },
      "android": {
        "priority": "normal"
      },
      token: registrationToken
    };

    messaging.send(message)
      .then((response) => {
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
    res.send({ success: "sukses", message: "Email valid" });
  },

  async kirimotp(req, res) {
    
    let email = req.body.email;
    let nohp = req.body.nohp;
    const jenis = "email";
    const otp = Math.floor(100000 + Math.random() * 900000);
    let kirimemail = await lib.kirimemailotp(email, otp);
    if (kirimemail) {
      otpStore.set(String(email), { otp: String(otp), expires: Date.now() + OTP_TTL });
      res.send({ success: true, message: otp.toString(), jenis: jenis });
    }
    else {
      res.send({ success: false, message: 'Gagal kirim OTP' });
    }
  },

  async gantipassword(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let passlama = req.body.passlama;
    let passbaru = req.body.passbaru;

    let sql = `SELECT password FROM t_user_mobile WHERE id_user=$1;`;

    try {
      const results = await query(sql, [id_user]);
      // Anti-enumerasi akun: "akun tidak ketemu" dan "password salah" memakai pesan
      // yang sama ("Password lama salah!") supaya email terdaftar tidak bisa dipetakan.
      if (results.length !== 1) {
        return res.send({ success: false, message: "Password lama salah!" });
      }
      let cekpass = await bcrypt.compare(passlama ?? '', results[0].password);
      if (!cekpass) {
        return res.send({ success: false, message: "Password lama salah!" });
      }
      var passhash = await bcrypt.hash(passbaru, 10);
      await query(`update t_user_mobile set password=$1 where id_user=$2;`, [passhash, id_user]);
      res.send({ success: true, message: "Ubah password berhasil" });
    } catch (error) {
      console.error('[gantipassword]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async resetpassword(req, res) {
    
    let email = req.body.email;
    let otp = req.body.otp;
    let pass = req.body.passwordbaru;

    const rec = otpStore.get(String(email));
    if (!rec || String(otp) !== rec.otp || Date.now() > rec.expires) {
      return res.send({ success: false, message: 'OTP tidak valid', data: null });
    }
    otpStore.delete(String(email));

    var passhash = await bcrypt.hash(pass, 10);

    let sql = `update t_user_mobile set password=$1 where email=$2;`;

    try {
      await query(sql, [passhash, email]);
      res.send({ success: true, message: "Update password berhasil" });
    } catch (error) {
      console.error('[resetpassword]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async simpantoken(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let token = req.body.token;

    let sql = `update t_user_mobile set token=$1 where id_user=$2;`;

    try {
      const result = await run(sql, [token, id_user]);
      if (result.rowCount == 1) {
        res.send({ success: true, message: "Update token berhasil" });
      }
      else {
        res.send({ success: false, message: "Update token gagal" });
      }
    } catch (error) {
      console.error('[simpantoken]', error);
      res.send({ success: false, message: "Update token gagal" });
    }
  },

  async buatwallet(req, res) {
    const email = req.user && req.user.email;
    if (!email) return res.send({ success: false, message: 'invalid0', data: null });
    let nama = req.body.nama;

    hasil = await doku.createwallet(email, nama, "/sac-merchant/v1/accounts");

    res.send({ success: true, message: "Update password berhasil", hasil: hasil });
  },

  async topup(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let wkt_exp = 10; //in
    let jumlah = req.body.jumlah;
    let id_wallet = req.body.id_wallet;
    let id_carabayar = req.body.id_carabayar;
    let nama = req.body.nama;
    let no_hp = req.body.no_hp;
    let email = req.body.email;
    let now = new Date();
    let exp = new Date().setMinutes(new Date().getMinutes() + wkt_exp);

    let no_trans = Date.parse(new Date().toISOString());
    let no_trans_doku = `${no_trans}-${id_user}-topup-${id_wallet}`;

    let target = "";
    let hasil = "";

    switch (id_carabayar) {
      case 1:
        target = "/checkout/v2/payment";
        hasil = await doku.createcheckout(no_trans_doku, jumlah, target, id_wallet);
        break;
      case 2:
        break;
      case 3:
        target = "/bca-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 4:
        target = "/bni-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 5:
        target = "/mandiri-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 6:
        target = "/doku-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 7:
        target = "/bsm-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 8:
        target = "/permata-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 9:
        target = "/cimb-virtual-account/v2/payment-code";
        hasil = await doku.createva(no_trans_doku, jumlah, nama, email, target, id_carabayar, id_wallet);
        break;
      case 10:
        target = "/ovo-emoney/v1/payment";
        hasil = await doku.createovo(no_trans_doku, jumlah, nama, email, no_hp, target, id_wallet);
        break;
      case 11:
        target = "/shopeepay-emoney/v2/order";
        hasil = await doku.createshopepay(no_trans_doku, jumlah, target, id_wallet);
        break;
      case 12:
        target = "/dokuwallet-emoney/v1/payment";
        hasil = await doku.createdokuwallet(no_trans_doku, jumlah, target, id_wallet);
        break;
      case 13:
        target = "/linkaja-emoney/v2/ServiceRequestPayment";
        hasil = await doku.createlink(no_trans_doku, jumlah, nama, email, no_hp, target, id_wallet);
        break;
    }

    let data = {
      no_trans: no_trans,
      tgl_topup: now,
      tgl_expired: new Date(exp),
      id_wallet: id_wallet,
      id_user: id_user,
      id_carabayar: id_carabayar,
      jumlah: jumlah,
      pembayaran: JSON.stringify(hasil),
    };

    try {
      await query(
        `INSERT INTO t_topup (no_trans, tgl_topup, tgl_expired, id_wallet, id_user, id_carabayar, jumlah, pembayaran)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [data.no_trans, data.tgl_topup, data.tgl_expired, data.id_wallet, data.id_user, data.id_carabayar, data.jumlah, data.pembayaran ?? null]
      );

      var isiberita = `Menunggu Pembayaran topup ${no_trans}`;

      let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
      await poolpostgre.query(sqlpostgre, [id_user, no_trans, 'tunggubayartopup', 'Menunggu Pembayaran Topup', isiberita]).catch(e => console.error(e));

      //cek expired pembayaran
      setTimeout(async () => {
        try {
          let sqlexp = `update t_topup set status_topup=(case when tgl_expired < now() and status_bayar='unpaid' then 'expired' else status_topup end)
            where no_trans=$1;`;
          const result = await run(sqlexp, [no_trans]);
          if (result.rowCount == 1) {
            var isiberita2 = `Pembayaran topup ${no_trans} expired!`;
            let sqlpostgre2 = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
            await poolpostgre.query(sqlpostgre2, [id_user, no_trans, 'topupgagal', 'Pembayaran Topup Gagal', isiberita2]).catch(e => console.error(e));
          }
        } catch (e) {
          console.error(e);
        }
      }, ((wkt_exp * 1000 * 60) + 5000));

      const dt = new Date();
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      res.send({
        success: true,
        message: "Berhasil",
        created: dt,
        id_carabayar: id_carabayar,
        no_trans: no_trans,
        data: hasil,
      });
    } catch (error) {
      console.error('[topup]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async registrasi(req, res) {
    
    let email = req.body.email;
    let pass = req.body.password;
    let nama = req.body.nama;
    let no_hp = req.body.no_hp;
    let apple_id = req.body.apple_id ?? null;

    var passhash = await bcrypt.hash(pass, 10);

    // id_mitra & id_jenismember NOT NULL (tanpa default) — ambil default dari DB.
    const mitraRows = await query('SELECT id_mitra FROM t_mitra WHERE deleted_at IS NULL ORDER BY id_mitra LIMIT 1');
    const id_mitra = mitraRows.length ? mitraRows[0].id_mitra : 0;
    const jmRows = await query('SELECT id_jenismember FROM t_jenismember ORDER BY id_jenismember LIMIT 1');
    const id_jenismember = jmRows.length ? jmRows[0].id_jenismember : 0;

    let data = {
      email: email,
      password: passhash,
      nama: nama,
      no_hp: no_hp,
      apple_id: apple_id,
      id_mitra: id_mitra,
      id_jenismember: id_jenismember,
    };

    try {
      const results = await query(
        `INSERT INTO t_user_mobile (email, password, nama, no_hp, apple_id, id_mitra, id_jenismember)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_user`,
        [data.email, data.password, data.nama, data.no_hp, data.apple_id, data.id_mitra, data.id_jenismember]
      );

      const id_user_baru = results[0].id_user;

      // Wallet user = DOKU WaaS SUB ACCOUNT (SAC-...), dibuat lewat
      // POST /sac-merchant/v1/accounts. Ini menggantikan registeragent BMS lama
      // yang mengembalikan WALLETID format berbeda (bukan sub account).
      //
      // Kegagalan TIDAK menggagalkan registrasi: pelanggan tetap terdaftar dan
      // bisa topup, hanya belum bisa bayar pakai saldo. Statusnya dicatat di
      // wallet_status/wallet_error agar admin bisa mengulang lewat
      // `node scripts/doku-wallet.cjs create-user <id_user>`.
      const hasilWallet = await walletProvision.createUserWallet(id_user_baru);
      if (!hasilWallet.ok) {
        console.error(`[registrasi] wallet user #${id_user_baru} gagal: ${hasilWallet.alasan}`);
      }

      let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
      await poolpostgre.query(sqlpostgre, [id_user_baru, "", 'welcome', 'Pendaftaran  berhasil', 'Pendaftaran  berhasil!']).catch(e => console.error(e));

      res.send({ success: true, message: "Registrasi berhasil" });
    } catch (err) {
      // duplicate email/no_hp (unique constraint) → mirror legacy message
      res.send({ success: false, message: "Email/No.HP sudah terdaftar!", data: null });
    }
  },

  async hapususer(req, res) {
    const email = req.user && req.user.email;
    if (!email) return res.send({ success: false, message: 'invalid0', data: null });

    let sql = `update t_user_mobile set deleted_at=$1 where email=$2;`;

    try {
      await query(sql, [new Date(), email]);
      res.send({ success: true, message: "Hapus user berhasil" });
    } catch (error) {
      console.error('[hapususer]', error);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async saldowallet(req, res) {
    let id_wallet = req.body.id_wallet;
    let no_trans_doku = Date.parse(new Date().toISOString());
    target = `/sac-merchant/v1/balances/${id_wallet}`;
    hasil = await doku.saldowallet(no_trans_doku, id_wallet);
    console.log(target);
    res.send({ success: true, message: hasil });
  },

  async getsetting(req, res) {
    res.send({ success: true, message: gppn });
  },

  async transfer(req, res) {
    let id_wallet_asal = req.body.id_wallet_asal;
    let id_wallet_tujuan = req.body.id_wallet_tujuan;
    let no_trans_doku = Date.parse(new Date().toISOString());
    let jumlah = req.body.jumlah;
    target = `/sac-merchant/v1/transfers`;
    hasil = await doku.paywithsaldo(no_trans_doku, jumlah, target, id_wallet_asal);
    console.log(target);
    res.send({ success: true, message: hasil });
  },

  async withdrawl(req, res) {
    let id_wallet = req.body.id_wallet;
    let total = req.body.jumlah;
    let bank_code = req.body.kode_bank;
    let account_num = req.body.nomor_akun_bank;
    let account_name = req.body.nama_akun;
    let no_trans_doku = Date.parse(new Date().toISOString());

    hasil = await doku.withdrawl(no_trans_doku, total, id_wallet, bank_code, account_num, account_name);

    res.send({ success: true, message: hasil });
  },

};
