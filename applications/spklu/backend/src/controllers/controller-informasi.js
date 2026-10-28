const db = require('../services/database.service');
const { query, run } = db;
const { tokenUserId } = require('../services/permission');

module.exports = {

  async getberita(req, res) {
    let lat = req.body.latitude == null ? "-6.153230954435896" : req.body.latitude;
    let lng = req.body.longitude == null ? "106.7960732672668" : req.body.longitude;

    let sql = `
      SELECT id_berita, judul, to_char(tgl_terbit, 'DD-Mon-YYYY') AS tgl_terbit, berita, foto, radius, jenis_berita, url
      FROM t_berita
      WHERE status=1 AND (jangkauan='semua' OR (jangkauan='radius' AND
        -- LEAST/GREATEST: acos() melempar "input is out of range" bila argumen
        -- sedikit melebihi 1 (pembulatan floating point saat titik pencarian
        -- sama persis dengan pusat berita).
        ((6371 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1::double precision))
             * cos(radians(pusat_latitude::double precision))
             * cos(radians(pusat_longitude::double precision) - radians($2::double precision))
             + sin(radians($3::double precision)) * sin(radians(pusat_latitude::double precision)))))) < (radius * 0.621371)))
      ) AND tgl_terbit <= CURRENT_DATE
      ORDER BY id_berita DESC LIMIT 5;
    `;

    try {
      const results = await query(sql, [lat, lng, lat]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Berita ditemukan', data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[getberita]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // ===== Inbox mobile (menggantikan akses langsung Supabase dari aplikasi) =====
  // Berita untuk user yang sedang login. Urut terbaru dulu, bentuk field sama
  // dengan yang dulu dibaca klien dari tabel berita, agar model klien tidak
  // berubah.
  async getberita_user(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let dilimit = Number(req.body.limit) || 25;
    if (dilimit < 1) dilimit = 25;
    if (dilimit > 100) dilimit = 100;

    const sql = `SELECT (id)::int AS id, created_at, id_user, no_trans, judul, isi, jenis_berita,
                        COALESCE(dibaca, false) AS dibaca
                 FROM berita
                 WHERE id_user = $1
                 ORDER BY id DESC
                 LIMIT $2`;

    try {
      const results = await query(sql, [id_user, dilimit]);
      res.send({
        success: true,
        message: results.length ? 'Berita ditemukan' : 'Data tidak ada',
        data: results,
      });
    } catch (error) {
      console.error('[getberita_user]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // Tandai satu berita sudah dibaca. Hanya boleh untuk berita milik user token.
  async setberitadibaca(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const id = Number(req.body.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.send({ success: false, message: 'id tidak valid', data: null });
    }

    try {
      const result = await run(
        `UPDATE berita SET dibaca = true WHERE id = $1 AND id_user = $2`,
        [id, id_user]
      );
      if (result.rowCount === 0) {
        return res.send({ success: false, message: 'Berita tidak ditemukan', data: null });
      }
      res.send({ success: true, message: 'Berita ditandai dibaca', data: { id } });
    } catch (error) {
      console.error('[setberitadibaca]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // Hapus satu berita. Hanya boleh untuk berita milik user token.
  // DELETE, bukan soft-delete: berita adalah feed notifikasi, jadi menghapus
  // berarti pengguna tidak ingin melihatnya lagi. id_user dari token, sehingga
  // permintaan menghapus berita orang lain tidak berpengaruh (rowCount 0).
  async hapusberita(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const id = Number(req.body.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.send({ success: false, message: 'id tidak valid', data: null });
    }

    try {
      const result = await run(
        `DELETE FROM berita WHERE id = $1 AND id_user = $2`,
        [id, id_user]
      );
      if (result.rowCount === 0) {
        return res.send({ success: false, message: 'Berita tidak ditemukan', data: null });
      }
      res.send({ success: true, message: 'Berita dihapus', data: { id } });
    } catch (error) {
      console.error('[hapusberita]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // Tandai SEMUA berita milik user sebagai sudah dibaca.
  // IS DISTINCT FROM true dipakai agar baris yang sudah dibaca (atau NULL)
  // tidak ikut terhitung sebagai perubahan, sehingga rowCount bermakna
  // "jumlah yang benar-benar berubah".
  async setberitasemuadibaca(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    try {
      const result = await run(
        `UPDATE berita SET dibaca = true
         WHERE id_user = $1 AND dibaca IS DISTINCT FROM true`,
        [id_user]
      );
      res.send({
        success: true,
        message: result.rowCount > 0
          ? 'Semua berita ditandai dibaca'
          : 'Tidak ada berita yang belum dibaca',
        data: { updated: result.rowCount },
      });
    } catch (error) {
      console.error('[setberitasemuadibaca]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // Status konektor terakhir per connector_id (pengganti realtime stream
  // `konektor` di klien). Satu baris per konektor, bukan riwayat penuh.
  async getkonektor(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const chargebox_id = (req.body.chargebox_id || '').toString().trim();
    if (!chargebox_id) {
      return res.send({ success: false, message: 'chargebox_id wajib diisi', data: null });
    }

    const sql = `SELECT DISTINCT ON (connector_id)
                        (id)::int AS id, chargebox_id, connector_id, status, waktu
                 FROM konektor
                 WHERE chargebox_id = $1
                 ORDER BY connector_id, id DESC`;

    try {
      const results = await query(sql, [chargebox_id]);
      res.send({
        success: true,
        message: results.length ? 'Konektor ditemukan' : 'Data tidak ada',
        data: results,
      });
    } catch (error) {
      console.error('[getkonektor]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  // Progres charging satu transaksi (pengganti realtime stream `charging`).
  async getcharging(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    const no_trans = (req.body.no_trans || '').toString().trim();
    if (!no_trans) {
      return res.send({ success: false, message: 'no_trans wajib diisi', data: null });
    }

    // Pastikan transaksi ini milik user token (SEC: cegah membaca transaksi orang lain).
    const sql = `SELECT (c.id)::int AS id, c.created_at, c.no_trans, c.chargebox_id, c.connector_id,
                        c.tanggal, c.jenis, c.order_value, c.penggunaan, c.masuk_kwh,
                        c.ampere, c.volt, c.baterai, c.suhu
                 FROM charging c
                 JOIN t_transaction t ON t.no_trans = c.no_trans
                 WHERE c.no_trans = $1 AND t.id_user = $2
                 ORDER BY c.id ASC`;

    try {
      const results = await query(sql, [no_trans, id_user]);
      res.send({
        success: true,
        message: results.length ? 'Charging ditemukan' : 'Data tidak ada',
        data: results,
      });
    } catch (error) {
      console.error('[getcharging]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async gettransaksi(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let status_transaksi = req.body.status_transaksi || "all";
    let dilimit = Number(req.body.limit) || 50;
    if (dilimit < 1) dilimit = 50;
    let sqlstatus = status_transaksi == "all" ? "" : status_transaksi == "aktif" ? ` and status_transaksi in('order','ready','charging')` : ` and status_transaksi in('cancel','finish','expired')`;

    let sql = `SELECT t.no_trans,t.tgl_trans,(CASE WHEN tipe_charging='kwh' THEN jml_kwh_order ELSE jml_durasi_order END) AS jml,
      t.chargebox_id,t.connector_id,jml_durasi_order,jml_kwh_order,
      grand_total,nama_chargebox,tipe_charging,nama_area,a.foto AS foto_area,t.pembayaran,t.status_transaksi,t.id_carabayar
      FROM t_transaction t JOIN t_chargebox c ON t.chargebox_id=c.chargebox_id
      JOIN t_area a ON a.id_area=c.id_area
      WHERE t.id_user=$1 ${sqlstatus}
      ORDER BY tgl_trans DESC LIMIT $2`;

    try {
      const results = await query(sql, [id_user, dilimit]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Transaksi ditemukan', data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[gettransaksi]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async getinvoice(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let no_trans = req.body.no_trans;

    let sql = `SELECT t.no_trans,t.tgl_trans,(CASE WHEN tipe_charging='kwh' THEN jml_kwh_order ELSE jml_durasi_order END) AS jml,
      t.chargebox_id,t.connector_id,jml_kwh_terpakai,biaya_lain,
      grand_total,nama_chargebox,tipe_charging,t.status_transaksi,t.id_carabayar,
      a.start_timestamp,a.stop_timestamp,t.harga_satuan,t.ppn,t.pbjt,t.pju,ttl_refund
      FROM t_transaction t JOIN t_chargebox c ON t.chargebox_id=c.chargebox_id
      JOIN t_transaction_detail a ON t.no_trans=a.no_trans
      WHERE t.no_trans=$1 AND t.id_user=$2
      GROUP BY t.no_trans, t.tgl_trans, t.chargebox_id, t.connector_id, jml_kwh_order, jml_durasi_order, jml_kwh_terpakai, biaya_lain, grand_total, nama_chargebox, tipe_charging, t.status_transaksi, t.id_carabayar, a.start_timestamp, a.stop_timestamp, t.harga_satuan, t.ppn, t.pbjt, t.pju, ttl_refund`;

    try {
      const results = await query(sql, [no_trans, id_user]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Transaksi ditemukan', data: results[0] });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[getinvoice]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async historisaldo(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let sql = `SELECT tgl,jumlah,jenis,keterangan FROM t_histori_saldo WHERE id_user=$1 ORDER BY id DESC`;

    try {
      const results = await query(sql, [id_user]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Data ditemukan', data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[historisaldo]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async datatopup(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    let no_trans = req.body.no_trans;

    let sql = `SELECT no_trans,tgl_topup,jumlah AS grand_total,id_wallet,id_carabayar,status_bayar,status_topup,tgl_expired,pembayaran AS data
      FROM t_topup WHERE no_trans=$1 AND id_user=$2 ORDER BY id_topup DESC`;

    try {
      const results = await query(sql, [no_trans, id_user]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Data ditemukan', data: results[0] });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[datatopup]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async getdatatopup(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let sql = `SELECT no_trans,tgl_topup,jumlah AS grand_total,id_wallet,id_carabayar,status_bayar,status_topup,tgl_expired,pembayaran AS data
      FROM t_topup WHERE id_user=$1 ORDER BY id_topup DESC`;

    try {
      const results = await query(sql, [id_user]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Data ditemukan', data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[getdatatopup]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async getdatarefund(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });

    let sql = `SELECT no_trans,tgl_buat AS tgl_refund,tgl_done AS tgl_selesai,jumlah,status
      FROM t_refund WHERE id_user=$1 ORDER BY id DESC`;

    try {
      const results = await query(sql, [id_user]);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Data ditemukan', data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[getdatarefund]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async carabayar(req, res) {
    let sql = `SELECT id_carabayar,nama_carabayar,bank,logo FROM t_carabayar WHERE status=1`;

    try {
      const results = await query(sql, []);
      if (results.length >= 1) {
        res.send({ success: true, message: 'Data ditemukan', min_topup: 100, data: results });
      } else {
        res.send({ success: false, message: 'Data tidak ada', data: null });
      }
    } catch (error) {
      console.error('[carabayar]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  welcome(req, res) {
    let html = `<html><head>
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
          <h2 align='center' style='color:#444'>GOCAZ</h2>
          <div style='color:#444'>
          Terima kasih telah menjadi bagian dari GOCAZ.
          Dompet Gocaz anda</b> dari DOKU telah aktif.<br><br>
          </div>
          <table border=0 widht='100%' style='margin-top:20px; width:100%' cellspacing='10' >
          <p style='font-family:\\"Arial\\",sans-serif;color:#999;line-height:1.5;margin:0;padding:10px; font-size:12px; background:rgb(240, 240, 240);'>
            Keuntungan menggunakan  Dompet GOCAZ:
            <ul>
            <li>Pembayaran lebih mudah</li>
            <li>Wadah refund</li>
            <li>Bisa dicairkan ke rekening bank anda(soon).</li>
            </ul>
          </p>
          <hr style='border:2px solid #ed1b2f'>
          </div>
      </div>
      </div>
      </body></html>`;

    res.send(html);
    res.end();
  }

};
