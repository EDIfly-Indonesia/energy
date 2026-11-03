const db = require('../services/database.service');
const { pool, poolpostgre, query } = db;
const { RPCClient } = require('ocpp-rpc');
const doku = require("../configs/doku");
const bmsdoku = require("../configs/bmsdoku");
const crypto = require("crypto");
const state = require('../services/chargingState').state;
const { tokenUserId } = require('../services/permission');
const { kwhToWh } = require('../utils/units');
const promoService = require('../services/promo.service');
const saldoService = require('../services/saldo.service');
const noTransUtil = require('../utils/no-trans');

// Pesan singkat untuk promo_alasan dari fn_promo_validasi, dipakai pada
// respons simpanorder ketika promo berubah antara quote dan order.
// Mobile tetap punya terjemahannya sendiri (API-PROMO.md §3); ini hanya agar
// klien lama yang menampilkan `message` mentah tidak melihat kode mentah.
const PESAN_ALASAN_PROMO = {
  KODE_KOSONG: 'kode promo kosong',
  KODE_TIDAK_DITEMUKAN: 'kode promo tidak dikenali',
  PROMO_NONAKTIF: 'promo sedang tidak aktif',
  BELUM_MULAI: 'promo belum berlaku',
  KEDALUWARSA: 'promo sudah berakhir',
  BUKAN_PESERTA: 'akun belum terdaftar pada promo',
  KENDARAAN_TIDAK_COCOK: 'kendaraan tidak terdaftar pada promo',
  MIN_KWH_TIDAK_TERPENUHI: 'jumlah kWh belum memenuhi syarat promo',
  BATAS_PEMAKAIAN: 'batas pemakaian promo sudah tercapai',
  BUDGET_HABIS: 'kuota promo sudah habis',
  NILAI_POTONGAN_NOL: 'promo tidak menghasilkan potongan',
  KLAIM_GAGAL: 'kuota promo habis saat pembayaran',
};

function pesanAlasanPromo(alasan) {
  return PESAN_ALASAN_PROMO[alasan] || 'promo tidak dapat dipakai';
}

module.exports = {

  async simpanorder(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    if (req.body.tipe_charging !== "kwh") {
      return res.send({
        success: false,
        message: "Layanan tipe charging duration sudah tidak tersedia. Silakan pilih tipe charging kwh.",
        data: null
      });
    }

    // SEC + keputusan §2: SELURUH angka tagihan dihitung SERVER lewat
    // fn_biaya_transaksi. Angka kiriman klien (grand_total, jumlah, total, ppn,
    // pbjt, pju, biaya_lain) TIDAK dipakai lagi — hanya kWh pesanan yang dipakai
    // sebagai input, karena itu memang pilihan pengguna.
    const kwhOrder = Number(req.body.jml_kwh_order);
    if (!Number.isFinite(kwhOrder) || kwhOrder <= 0) {
      return res.send({ success: false, message: 'Jumlah kWh pesanan tidak valid', data: null });
    }

    // Kode promo opsional (API-PROMO.md §10.2).
    //
    // PENTING (keputusan Fase 0): simpanorder TIDAK mengklaim budget. Ia hanya
    // memvalidasi dan menyimpan snapshot. Klaim dilakukan saat pembayaran
    // terkonfirmasi, supaya budget tidak terpakai oleh order yang tak dibayar.
    const kodePromo = (req.body.kode_promo ?? '').toString().trim() || null;

    let quote;
    try {
      const q = await query(
        `SELECT * FROM fn_biaya_transaksi($1, $2, $3, 0, $4, CURRENT_DATE, $5)`,
        [req.body.chargebox_id, req.body.connector_id, kwhOrder, id_user, kodePromo]
      );
      if (q.length === 0) {
        return res.send({ success: false, message: 'Data tidak ada', data: null });
      }
      quote = q[0];
    } catch (e) {
      console.error('[simpanorder.quote]', e);
      return res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }

    // Semua komponen rupiah sudah dibulatkan half-up oleh fungsi (layar = tagihan).
    const hargaSatuan = Number(quote.harga_efektif);
    const biayaEnergi = Number(quote.biaya_energi);
    const biayaPlatform = Number(quote.biaya_platform);
    const biayaLayanan = Number(quote.biaya_layanan);
    const biayaLain = biayaPlatform + biayaLayanan;
    const jumlah = biayaEnergi;
    const total = biayaEnergi + biayaLain;
    const ppn = Number(quote.ppn);
    const pbjt = Number(quote.pbjt);
    const grandTotal = Number(quote.total);

    // Promo dianggap terpakai bila server benar-benar memotong. Bila kode
    // dikirim tetapi potongannya 0, order tetap dibuat tanpa promo dan
    // alasannya diteruskan ke klien (keputusan §2.4: tanpa quote_id).
    const promoDipakai = quote.id_promo != null && Number(quote.potongan_rupiah ?? 0) > 0;

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      return res.send({ success: false, message: 'Total tagihan tidak valid', data: null });
    }

    let wkt_exp = 15; //in minutes
    // no_trans 16 digit (YYYYMMDDHHMM+NNNN UTC), sekaligus nomor invoice.
    // Diambil atomik lewat UPSERT pada t_no_trans_counter. Nomor diambil
    // SEBELUM insert supaya tetap tersimpan walau pembayaran gagal.
    let no_trans = await noTransUtil.ambilNomorBerikutnya(pool);
    // Pembelian energi HANYA lewat saldo (id_carabayar = 2). Nilai dari klien
    // diabaikan agar tidak ada jalur yang masih membuat tagihan DOKU untuk
    // pembelian energi (DOKU hanya untuk top up).
    let id_carabayar = 2;
    let jenis_kendaraan = req.body.jenis_kendaraan ?? "car";
    console.log(`jenis_kendaraan ${jenis_kendaraan}`);
    let now = new Date();
    let exp = new Date().setMinutes(new Date().getMinutes() + wkt_exp);
    let id_wallet = req.body.id_wallet;
    let no_transbike = "";

    let target = "";
    let hasil = {};

    let data = {
      status_transaksi: "order", // 'ready' hanya setelah pembayaran terkonfirmasi (callback/paywithsaldo)
      tgl_trans: now,
      tgl_expired: new Date(exp),
      chargebox_id: req.body.chargebox_id,
      connector_id: req.body.connector_id,
      id_user: id_user,
      id_mitra: req.body.id_mitra,
      id_carabayar: id_carabayar,
      tipe_charging: req.body.tipe_charging == "kwh" ? req.body.tipe_charging : "duration",
      harga_satuan: hargaSatuan,
      // kWh (input klien) -> Wh (penyimpanan kanonik, helper terpusat)
      jml_kwh_order: kwhToWh(kwhOrder),
      jml_durasi_order: 0,
      biaya_lain: biayaLain,
      biaya_lain_detail: JSON.stringify([
        { kode_biaya: 'admin_platform', nama_biaya: 'Biaya Platform', besar_biaya: biayaPlatform },
        { kode_biaya: `layanan_${quote.kelas_layanan ?? 'normal'}`, nama_biaya: `Biaya Layanan ${quote.kelas_layanan ?? 'normal'}`, besar_biaya: biayaLayanan },
      ].filter((x) => x.besar_biaya > 0)),
      jumlah: jumlah,
      total: total,
      ppn: ppn,
      pbjt: pbjt,
      pju: 0, // PJU/PPJ dilebur ke PBJT-TL (UU HKPD) — kolom dipertahankan, selalu 0
      grand_total: grandTotal,

      // Snapshot promo (API-PROMO.md §10.2). Disimpan apa adanya supaya
      // tagihan bisa direkonstruksi walau promo diubah kemudian.
      id_promo: quote.id_promo ?? null,
      kode_promo: quote.kode_promo ?? null,
      id_peserta_promo: quote.id_peserta ?? null,
      harga_normal_satuan: Number(quote.harga_normal),
      potongan_perkwh: Number(quote.potongan_perkwh ?? 0),
      potongan_rupiah: Number(quote.potongan_rupiah ?? 0),
      biaya_admin: biayaPlatform,
      biaya_layanan: biayaLayanan,
      kelas_layanan: quote.kelas_layanan ?? null,
      pbjt_persen: Number(quote.pbjt_persen ?? 0),
      dpp: Number(quote.dpp ?? 0),
    };

    try {
      // cek reservasi aktif
      const sqlCekReservasiAktif = `
        SELECT 1
        FROM t_reservasi
        WHERE chargebox_id = $1
          AND connector_id = $2
          AND now() > date
          AND now() < date_expired
        LIMIT 1;
      `;
      const rows = await query(sqlCekReservasiAktif, [req.body.chargebox_id, req.body.connector_id]);

      if (rows && rows.length > 0) {
        return res.send({
          success: false,
          message: "Connector sudah direservasi",
          data: null
        });
      }

      // simpan transaksi
      const results = await query(
        `INSERT INTO t_transaction
         (status_transaksi, tgl_trans, tgl_expired, chargebox_id, connector_id, id_user, id_mitra, id_carabayar,
          tipe_charging, harga_satuan, jml_kwh_order, jml_durasi_order, biaya_lain, biaya_lain_detail,
          jumlah, total, ppn, pbjt, pju, grand_total,
          id_promo, kode_promo, id_peserta_promo, harga_normal_satuan,
          potongan_perkwh, potongan_rupiah, biaya_admin, biaya_layanan,
          kelas_layanan, pbjt_persen, dpp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,
                 $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
         RETURNING id`,
        [
          data.status_transaksi, data.tgl_trans, data.tgl_expired, data.chargebox_id, data.connector_id,
          data.id_user, data.id_mitra, data.id_carabayar, data.tipe_charging, data.harga_satuan,
          data.jml_kwh_order, data.jml_durasi_order, data.biaya_lain, data.biaya_lain_detail ?? null,
          data.jumlah, data.total, data.ppn, data.pbjt, data.pju, data.grand_total,
          data.id_promo, data.kode_promo, data.id_peserta_promo, data.harga_normal_satuan,
          data.potongan_perkwh, data.potongan_rupiah, data.biaya_admin, data.biaya_layanan,
          data.kelas_layanan, data.pbjt_persen, data.dpp,
        ]
      );
      // no_trans sudah dibuat sebelum INSERT (lihat atas), jadi cukup
      // ditempelkan ke baris yang baru dibuat.
      await query(
        `UPDATE t_transaction SET no_trans=$1::bigint WHERE id=$2`,
        [no_trans, results[0].id]
      );

      if (req.body.reservasi == 1) {
        const dateReservasi = new Date(req.body.date_reservasi);
        const dateExpired = new Date(dateReservasi.getTime() + (15 * 60 * 1000));

        const dataReservasi = {
          user_id: id_user,
          chargebox_id: req.body.chargebox_id,
          connector_id: req.body.connector_id,
          date: dateReservasi,
          date_expired: dateExpired,
          transaction_id: no_trans
        };

        console.log(dataReservasi);
        await query(
          `INSERT INTO t_reservasi (user_id, chargebox_id, connector_id, date, date_expired, transaction_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [dataReservasi.user_id, dataReservasi.chargebox_id, dataReservasi.connector_id, dataReservasi.date, dataReservasi.date_expired, dataReservasi.transaction_id]
        ).catch(e => console.error('Gagal reservasi:', e));
      }

      let dokuGagal = null;

      // Pembayaran energi hanya lewat SALDO (id_carabayar = 2). Tagihan DOKU
      // TIDAK dibuat lagi untuk pembelian energi — DOKU hanya dipakai top up.
      // Tanpa pengecualian ini, order saldo tetap memanggil gateway dan gagal
      // saat WaaS bermasalah.
      if (grandTotal > 0 && Number(id_carabayar) !== 2) {
        let no_trans_doku = `${no_trans}-${id_user}-trans`;
        // doku
        //
        // Kegagalan membuat tagihan di gateway TIDAK boleh membatalkan order.
        // no_trans sudah tersimpan di atas, jadi transaksi tetap bisa dilacak
        // dan pengguna bisa mencoba metode pembayaran lain. Sebelumnya error
        // gateway (mis. DOKU membalas HTML) lolos ke catch luar dan seluruh
        // permintaan dibalas "Terjadi kesalahan".
        try {
          switch (id_carabayar) {
            case 0:
              target = "/checkout/v2/payment";
              hasil = null;
              break;
            case 1:
              target = "/checkout/v2/payment";
              hasil = await doku.createcheckout(no_trans_doku, grandTotal, target);
              break;
            case 2:
              target = "/sac-merchant/v1/transfers";
              hasil = null;
              break;
            case 3:
              target = "/bca-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 4:
              target = "/bni-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 5:
              target = "/mandiri-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 6:
              target = "/doku-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 7:
              target = "/bsm-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 8:
              target = "/permata-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 9:
              target = "/cimb-virtual-account/v2/payment-code";
              hasil = await doku.createva(no_trans_doku, grandTotal, req.body.nama, req.body.email, target, id_carabayar);
              break;
            case 10:
              target = "/ovo-emoney/v1/payment";
              hasil = await doku.createovo(no_trans_doku, grandTotal, req.body.nama, req.body.email, req.body.no_hp, target);
              break;
            case 11:
              target = "/shopeepay-emoney/v2/order";
              hasil = await doku.createshopepay(no_trans_doku, grandTotal, target);
              break;
            case 12:
              target = "/dokuwallet-emoney/v1/payment";
              hasil = await doku.createdokuwallet(no_trans_doku, grandTotal, target);
              break;
            case 13:
              target = "/linkaja-emoney/v2/ServiceRequestPayment";
              hasil = await doku.createlink(no_trans_doku, grandTotal, req.body.nama, req.body.email, req.body.no_hp, target);
              break;
          }
        } catch (e) {
          dokuGagal = e;
          hasil = null;
          console.error('[simpanorder.doku]', e.message);
        }
        // akhir doku

        // Berita "menunggu pembayaran" dan timer expired hanya relevan bila
        // tagihan benar-benar terbentuk.
        if (!dokuGagal) {
          var isiberita = `Menunggu Pembayaran Charging ${no_trans}`;
          let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
          await poolpostgre.query(sqlpostgre, [id_user, no_trans, 'ordercharging', 'Menunggu Pembayaran Charging', isiberita]).catch(e => console.error(e));

          // cek expired pembayaran
          setTimeout(async () => {
            try {
              let sqlexp = `update t_transaction set status_transaksi=(case when tgl_expired < now() and status_bayar='unpaid' then 'expired' else status_transaksi end)
              where no_trans=$1;`;
              const result = await pool.query(sqlexp, [no_trans]);
              if (result.rowCount === 1) {
                var isiberita2 = `Pembayaran transaksi ${no_trans} expired!`;
                let sqlpostgre2 = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
                await poolpostgre.query(sqlpostgre2, [id_user, no_trans, 'pembayarangagal', 'Pembayaran Gagal', isiberita2]).catch(e => console.error(e));
              }
            } catch (e) {
              console.error(e);
            }
          }, ((wkt_exp * 1000 * 60) + 5000));
        }
      }

      // no_trans sudah disimpan sebelum pembayaran dibuat, jadi di sini hanya
      // payload pembayaran yang diperbarui.
      if (hasil != null) {
        await pool.query(
          `UPDATE t_transaction SET pembayaran=$1::jsonb WHERE id=$2`,
          [JSON.stringify(hasil), no_trans]
        ).catch(e => console.error('[simpanorder.pembayaran]', e.message));
      }

      state.gnotrans_id[no_transbike] = no_trans;

      const dt = new Date();
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      res.send({
        success: true,
        message: dokuGagal
          // Order dan ID transaksi sudah tersimpan; hanya tagihan pembayaran
          // yang gagal dibuat, jadi pengguna bisa memilih metode lain.
          ? "Order tersimpan, gagal membuat tagihan pembayaran. Silakan coba metode pembayaran lain."
          : (promoDipakai
              ? "Berhasil"
              : (kodePromo && quote.promo_alasan
                  ? `Order dibuat tanpa promo: ${pesanAlasanPromo(quote.promo_alasan)}`
                  : "Berhasil")),
        created: dt,
        grandtotal: grandTotal,
        id_carabayar: id_carabayar,
        no_trans: no_trans,
        data: hasil,
        // True bila gateway pembayaran gagal membuat tagihan. Klien memakai
        // ini untuk membedakan "order gagal" dari "tagihan gagal dibuat".
        pembayaran_gagal: Boolean(dokuGagal),
        // Status promo (API-PROMO.md §10.2). Klien memakai ini untuk memberi
        // tahu pengguna bila promo berubah antara quote dan order.
        promo_dipakai: promoDipakai,
        promo_alasan: promoDipakai ? null : (quote.promo_alasan ?? null),
      });
    } catch (err) {
      console.error('[simpanorder]', err);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  async startcharging(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let token_fcm = req.body.token_fcm;
    let chargebox_id = req.body.chargebox_id;
    let transnumber = req.body.transaction_number;
    let connector_id = req.body.connector_id;
    let jumlah = req.body.jumlah;
    let vidtag = req.body.id_tag;
    let jenischarging = req.body.jenischarging == "kwh" ? req.body.jenischarging : "duration";
    let responsestart = "";
    let durasicharging = 0;
    let jumlahkwh = 0;

    if (jenischarging == "duration") durasicharging = jumlah * 1000;
    else jumlahkwh = jumlah * 1000;

    let ordervalue = jenischarging == "duration" ? durasicharging : jumlahkwh;
    const cli = state.allClients.get(chargebox_id);
    const trans_id = parseInt(transnumber);

    try {
      responsestart = await cli.call('RemoteStartTransaction', {
        connectorId: connector_id,
        idTag: trans_id.toString(),
      });
      console.log('responsestart is:', responsestart);
      let sqlpostgre = `INSERT INTO charging( no_trans,chargebox_id,connector_id,tanggal,jenis,order_value) values($1,$2,$3,$4,$5,$6);`;
      await poolpostgre.query(sqlpostgre, [transnumber, chargebox_id, connector_id, new Date(), jenischarging, ordervalue]).catch(e => console.error(e));

      state.gtrans_id[transnumber] = trans_id;
      state.gtrans_id2[chargebox_id][connector_id] = trans_id;
      state.gid_user[transnumber] = id_user;
      state.gtoken_fcm[transnumber] = token_fcm;
      state.gjenis_charging[transnumber] = jenischarging;
      state.glama_durasi[transnumber] = 0;

      if (jenischarging == "duration") {
        state.gjumlah_durasi[transnumber] = durasicharging;
      }
      else {
        state.gjumlah_kwh[transnumber] = jumlahkwh;
      }
    }
    catch (err) {
      res.send({
        success: false,
        message: "Error,pastikan gun charger terpasang!",
        data: null
      });
      return;
    }

    res.send({
      success: true,
      message: `${trans_id}`,
      data: null
    });
  },

  async stopcharging(req, res) {
    

    let transaction_number = req.body.transaction_number;
    let chargebox_id = req.body.chargebox_id;
    let connector_id = req.body.connector_id;
    const cli = state.allClients.get(chargebox_id);
    let responsestop = "";

    try {
      responsestop = await cli.call('RemoteStopTransaction', {
        transactionId: parseInt(transaction_number)
      });
      state.clearIntervalById(parseInt(transaction_number));
    }
    catch (err) {
      res.send({
        success: false,
        message: "Error!",
        data: null
      });
      return;
    }

    res.send({
      success: true,
      message: "ok",
      data: responsestop
    });
  },

  async paywithsaldo(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let id_wallet = req.body.id_wallet;

    // SEC-03: kepemilikan ditentukan oleh id_user di token, BUKAN id_wallet dari
    // body. Klien boleh mengirim id_wallet kosong (sesi lama yang tersimpan
    // sebelum wallet lokal dibuat); bila dikirim, nilainya wajib cocok.
    try {
      const own = await query('SELECT id_wallet FROM t_user_mobile WHERE id_user=$1', [id_user]);
      if (own.length !== 1 || !own[0].id_wallet) {
        return res.send({ success: false, message: 'invalid0', data: null });
      }
      const walletBody = String(id_wallet ?? '').trim();
      if (walletBody !== '' && walletBody !== own[0].id_wallet) {
        return res.send({ success: false, message: 'invalid0', data: null });
      }
    } catch (e) {
      console.error('[paywithsaldo.ownWallet]', e);
      return res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }

    const no_trans = req.body.no_trans;
    const tgl_trans = new Date();

    if (!no_trans) {
      return res.send({ success: false, message: 'no_trans wajib diisi', data: null, no_trans: null });
    }

    // Pembayaran energi TIDAK lagi lewat DOKU (keputusan 2026-11-03: WaaS rusak).
    // Saldo didebit lokal dari t_saldo_user, dan tagihan diambil dari server
    // (grand_total), bukan dari angka kiriman klien.
    try {
      const trx = await query(
        `SELECT grand_total FROM t_transaction WHERE no_trans = $1::bigint AND id_user = $2`,
        [no_trans, id_user]
      );
      if (trx.length === 0) {
        return res.send({ success: false, message: 'Transaksi tidak ditemukan', data: null, no_trans });
      }

      const jumlah = Number(trx[0].grand_total);
      const hasil = await saldoService.debitPembelian({
        idUser: id_user,
        noTrans: no_trans,
        jumlah,
      });

      if (!hasil.ok) {
        const pesan =
          hasil.alasan === 'SALDO_KURANG'
            ? `Saldo tidak mencukupi. Saldo Anda Rp ${Number(hasil.saldo_awal || 0).toLocaleString('id-ID')}, tagihan Rp ${jumlah.toLocaleString('id-ID')}. Silakan top up.`
            : hasil.alasan === 'SUDAH_DIBAYAR'
              ? 'Transaksi ini sudah dibayar'
              : 'Transaksi tidak dapat dibayar';
        return res.send({
          success: false,
          message: pesan,
          alasan: hasil.alasan,
          saldo: hasil.saldo_awal ?? null,
          tagihan: jumlah,
          data: null,
          no_trans,
        });
      }

      // Klaim budget promo setelah pembayaran sukses (TODO-PROMO.md §0.B).
      // Idempoten dan tidak boleh menggagalkan pembayaran.
      try {
        const hasilPromo = await promoService.klaimPromo(no_trans);
        if (hasilPromo.status !== 'tidak_ada_promo') {
          console.log(`[paywithsaldo] promo no_trans=${no_trans} -> ${hasilPromo.status}${hasilPromo.alasan ? '/' + hasilPromo.alasan : ''}`);
        }
      } catch (e) {
        console.error('[paywithsaldo.promo]', e.message);
      }

      var isiberita = `Pembayaran transaksi ${no_trans} telah berhasil!`;
      var jenisberita = "pembayaran";
      var judulberita = "Pembayaran Sukses";

      let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
      await poolpostgre.query(sqlpostgre, [id_user, String(no_trans), jenisberita, judulberita, isiberita]).catch(e => console.error(e));

      return res.send({
        success: true,
        message: "Pembayaran sukses",
        no_trans: no_trans,
        created: tgl_trans,
        saldo_akhir: hasil.saldo_akhir,
        id_carabayar: 2
      });
    } catch (e) {
      console.error('[paywithsaldo]', e);
      return res.send({ success: false, message: 'Terjadi kesalahan', data: null, no_trans });
    }
  },

  /**
   * Batalkan reservasi / order yang belum berjalan.
   *
   * Keputusan produk 2026-11-03:
   *   - status yang boleh dibatalkan: `order` dan `ready`
   *   - TIDAK ada refund
   *   - konektor dilepas agar bisa dipesan pengguna lain
   *
   * Kontrak klien (JANGAN diubah tanpa menyelaraskan mobile):
   *   request  { no_trans }
   *   sukses   { success: true,  message }
   *   ditolak  { success: false, message }   <-- HTTP tetap 200
   *   HTTP 404 hanya untuk route yang tidak ada.
   *
   * Semua langkah DB berjalan dalam satu transaksi: status transaksi,
   * status reservasi, pelepasan konektor, dan notifikasi.
   */
  async cancelreservasi(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const no_trans = String(req.body.no_trans ?? '').trim();
    if (!no_trans) {
      return res.send({ success: false, message: 'no_trans wajib diisi', data: null });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Kunci baris transaksi + verifikasi kepemilikan lewat id_user token.
      const trx = await client.query(
        `SELECT id, no_trans, id_user, status_transaksi, status_bayar,
                chargebox_id, connector_id, jml_kwh_terpakai
           FROM t_transaction
          WHERE no_trans = $1::bigint AND id_user = $2
          FOR UPDATE`,
        [no_trans, id_user]
      );

      if (trx.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.send({
          success: false,
          message: 'Transaksi tidak ditemukan',
          data: null,
        });
      }

      const t = trx.rows[0];

      // Idempoten: sudah dibatalkan / tidak bisa dibatalkan lagi.
      if (t.status_transaksi === 'cancel') {
        await client.query('ROLLBACK');
        return res.send({
          success: false,
          message: 'Reservasi ini sudah dibatalkan',
          data: null,
        });
      }

      if (!['order', 'ready'].includes(t.status_transaksi)) {
        await client.query('ROLLBACK');
        return res.send({
          success: false,
          message: `Transaksi berstatus ${t.status_transaksi} tidak dapat dibatalkan`,
          data: null,
        });
      }

      // Jangan izinkan pembatalan sesi yang sudah mengalirkan energi: itu
      // domain stopcharging + refund, bukan pembatalan reservasi.
      const detail = await client.query(
        `SELECT start_timestamp FROM t_transaction_detail
          WHERE no_trans = $1::text LIMIT 1`,
        [no_trans]
      );
      const sudahMulai =
        (detail.rows.length > 0 && detail.rows[0].start_timestamp != null) ||
        Number(t.jml_kwh_terpakai || 0) > 0;

      if (sudahMulai) {
        await client.query('ROLLBACK');
        return res.send({
          success: false,
          message:
            'Pengisian sudah dimulai. Gunakan Hentikan Pengisian, bukan pembatalan reservasi.',
          data: null,
        });
      }

      // 1) batalkan transaksi
      await client.query(
        `UPDATE t_transaction
            SET status_transaksi = 'cancel', update_at = now()
          WHERE id = $1`,
        [t.id]
      );

      // 2) batalkan reservasinya (bila ada)
      const reservasi = await client.query(
        `UPDATE t_reservasi
            SET status = 'cancel'
          WHERE transaction_id = $1::bigint
          RETURNING id`,
        [no_trans]
      );

      // 3) lepas konektor HANYA bila tidak ada reservasi aktif lain dan
      //    tidak ada sesi charging yang masih berjalan di konektor itu.
      //    Tanpa cek ulang, dua pengguna bisa memesan konektor yang sama.
      const reservasiLain = await client.query(
        `SELECT 1 FROM t_reservasi
          WHERE chargebox_id = $1 AND connector_id = $2
            AND status IN ('unpaid', 'ready')
            AND now() < date_expired
          LIMIT 1`,
        [t.chargebox_id, t.connector_id]
      );
      const chargingLain = await client.query(
        `SELECT 1 FROM t_transaction
          WHERE chargebox_id = $1 AND connector_id = $2
            AND status_transaksi = 'charging'
          LIMIT 1`,
        [t.chargebox_id, t.connector_id]
      );

      let konektorDilepas = false;
      if (reservasiLain.rows.length === 0 && chargingLain.rows.length === 0) {
        await client.query(
          `UPDATE t_connector_detail
              SET status = 'Available', last_update = now(), updated_by = 'cancelreservasi'
            WHERE chargebox_id = $1 AND connector_id = $2`,
          [t.chargebox_id, t.connector_id]
        );
        konektorDilepas = true;
      }

      // 4) notifikasi in-app
      const isi = `Reservasi transaksi ${no_trans} telah dibatalkan.`;
      await client.query(
        `INSERT INTO berita (id_user, no_trans, jenis_berita, judul, isi)
         VALUES ($1, $2, 'reservasibatal', 'Reservasi dibatalkan', $3)`,
        [id_user, no_trans, isi]
      );

      await client.query('COMMIT');

      // 5) lepas klaim budget promo (di luar transaksi: idempoten, tidak boleh
      //    menggagalkan pembatalan).
      try {
        const hasilLepas = await promoService.lepasPromo(no_trans);
        if (hasilLepas.status !== 'tidak_ada_klaim') {
          console.log(`[cancelreservasi] promo no_trans=${no_trans} -> ${hasilLepas.status}`);
        }
      } catch (e) {
        console.error('[cancelreservasi.promo]', e.message);
      }

      return res.send({
        success: true,
        message: 'Reservasi berhasil dibatalkan',
        no_trans: no_trans,
        konektor_dilepas: konektorDilepas,
        reservasi_dibatalkan: reservasi.rowCount,
        data: null,
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[cancelreservasi]', err);
      return res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    } finally {
      client.release();
    }
  },

  async refund(notrans, update_ttl_refund = false) {
    let sql = `select t.id_user,id_wallet, grand_total,harga_satuan,jml_durasi_order,jml_kwh_order,jml_kwh_terpakai,durasi_terpakai,tipe_charging
      from t_transaction t join t_user_mobile u on t.id_user=u.id_user where no_trans=$1;`;

    try {
      const results = await query(sql, [notrans]);
      if (results.length === 0) return;
      console.log(`notrans refund ${notrans}`);
      console.log(`notrans refund ${results[0].jml_kwh_terpakai}`);
      let id_wallet = results[0].id_wallet;
      let id_user = results[0].id_user;
      let jenis_charging = results[0].tipe_charging;
      let jml_harga = results[0].grand_total;
      let jml_order = jenis_charging == "kwh" ? results[0].jml_kwh_order : results[0].jml_durasi_order;
      let terpakai = jenis_charging == "kwh" ? results[0].jml_kwh_terpakai : results[0].durasi_terpakai;
      let harga_satuan = results[0].harga_satuan;

      let sisa = ((jml_order - terpakai) / jml_order);
      let jml_refund = sisa.toFixed(2) * jml_harga;

      // KEPUTUSAN §2.2: refund sebagian TIDAK mengembalikan budget promo.
      // Hanya pembatalan SELURUH sesi (tidak ada kWh terpakai) yang melepas
      // klaim, sehingga budget mitra kembali.
      const batalPenuh = Number(terpakai) === 0;
      if (batalPenuh) {
        try {
          const hasilLepas = await promoService.lepasPromo(notrans);
          if (hasilLepas.status !== 'tidak_ada_klaim') {
            console.log(`[refund] promo no_trans=${notrans} -> ${hasilLepas.status}`);
          }
        } catch (e) {
          console.error('[refund.promo]', e.message);
        }
      } else {
        console.log(`[refund] no_trans=${notrans} refund sebagian (terpakai=${terpakai}) -> budget promo TIDAK dikembalikan`);
      }

      let no_trans_doku = Date.parse(new Date().toISOString());
      console.log(results);
      console.log(`jml_harga ${jml_harga}`);
      console.log(`jml_order ${jml_order}`);
      console.log(`terpakai ${terpakai}`);
      console.log(`sisa ${sisa}`);
      console.log(`jml_refund ${jml_refund}`);

      if (jml_harga == 0) return;

      // Refund TIDAK lewat DOKU (keputusan 2026-11-03). Dana dikembalikan ke
      // saldo lokal t_saldo_user; trigger t_histori_saldo yang menambah saldo.
      const hasilRefund = await saldoService.kredit({
        idUser: id_user,
        noTrans: notrans,
        jenis: saldoService.JENIS.KREDIT_REFUND,
        jumlah: Number(jml_refund),
        keterangan: `refund transaksi ${notrans}`,
      });
      console.log(`[refund] no_trans=${notrans} ->`, JSON.stringify(hasilRefund));
      if (hasilRefund.ok) {
        console.log("refund berhasil (saldo lokal)");
        let sqlrefund = `INSERT INTO t_refund( id_user,no_trans,jml_transaksi,jumlah,status,tgl_buat,tgl_done) values($1,$2,$3,$4,$5,$6,$7);`;
        await pool.query(sqlrefund, [id_user, notrans, jml_harga, jml_refund, 'done', new Date(), new Date()]).catch(e => console.error(e));

        var isiberita = `Refund Rp.${jml_refund.toLocaleString()} transaksi ${notrans} telah berhasil!`;
        let sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
        await poolpostgre.query(sqlpostgre, [id_user, notrans, "refundsukses", "Refund sukses", isiberita]).catch(e => console.error(e));

        if (update_ttl_refund) {
          let sqlupdatestatus = `UPDATE t_transaction SET ttl_refund = $1 WHERE no_trans = $2`;
          await pool.query(sqlupdatestatus, [jml_refund, notrans]).catch(e => console.error(e));
        }
      }
      else {
        console.log("refund pending");
        let sqlrefund = `INSERT INTO t_refund( id_user,no_trans,jumlah,status,tgl_buat) values($1,$2,$3,$4,$5);`;
        await pool.query(sqlrefund, [id_user, notrans, jml_refund, 'pending', new Date()]).catch(e => console.error(e));

        var isiberita2 = `Refund ${jml_refund.toLocaleString()} transaksi ${notrans} ,diproses max 3x24 jam!`;
        let sqlpostgre2 = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
        await poolpostgre.query(sqlpostgre2, [id_user, notrans, "refundpending", "Refund pending", isiberita2]).catch(e => console.error(e));
      }
    } catch (err) {
      console.error('[refund]', err);
    }
  },

  async withdrawl(req, res) {
    let notrans = req.body.no_trans;
    let jumlah = req.body.jumlah;

    hasil = await doku.withdrawl(no_trans, total, id_wallet, bank_code, account_num, account_name);
  },

};
