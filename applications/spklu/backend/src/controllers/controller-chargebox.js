const db = require('../services/database.service');
const { query } = db;
const { tokenUserId } = require('../services/permission');

module.exports = {
  async nearest(req, res) {
    const lat = req.body.latitude == null ? "-6.153230954435896" : req.body.latitude;
    const lng = req.body.longitude == null ? "106.7960732672668" : req.body.longitude;

    // `limit` WAJIB integer (kontrak: 10, bukan "10" — schema sudah menolak
    // string, ini lapisan kedua bila handler dipanggil tanpa lewat schema).
    // Default 50, dijepit 1..100.
    const rawLimit = req.body.limit;
    if (rawLimit != null && !Number.isInteger(rawLimit)) {
      return res.send({
        success: false,
        message: 'limit harus berupa bilangan bulat (integer), bukan string atau desimal',
        data: null,
      });
    }
    let lim = rawLimit == null ? 50 : rawLimit;
    if (lim < 1) lim = 50;
    if (lim > 100) lim = 100;

    let sql = `SELECT c.chargebox_id,deskripsi,c.nama_chargebox,jenis,c.id_mitra,ocpp_protocol,lat,lng,is_ppn,is_pbjt,pju,fasilitas,c.foto,nama_area,alamat,a.kota,a.foto AS foto_area,
          c.is_public,c.is_active,
          count(d.id)::int as jml_konektor,
          jsonb_agg(
            jsonb_build_object('connector_id', d.connector_id,
                               'electric_power', d.electric_power,
                               'status', COALESCE(NULLIF(k.status,''), NULLIF(d.status,'')),
                               'connector_type', d.connector_type)
            ORDER BY d.connector_id
          ) AS connector,
          -- LEAST/GREATEST: acos() PostgreSQL melempar "input is out of range"
          -- bila argumennya sedikit melebihi 1 akibat pembulatan floating
          -- point. Itu terjadi justru saat titik pencarian SAMA dengan
          -- koordinat chargebox (cos^2+sin^2 bisa jadi 1.0000000000000002) —
          -- kasus paling wajar bagi pengguna yang berdiri di lokasi charger.
          -- Tanpa clamp, SELURUH endpoint gagal dan pengguna tidak menerima
          -- daftar apa pun, bukan hanya satu baris yang bermasalah.
          round((6371 * acos(LEAST(1, GREATEST(-1,
               cos(radians($1::double precision)) * cos(radians(c.lat::double precision))
               * cos(radians(c.lng::double precision) - radians($2::double precision))
               + sin(radians($3::double precision)) * sin(radians(c.lat::double precision))))))::numeric, 2)::double precision AS jarak
        FROM t_chargebox c JOIN t_area a ON c.id_area=a.id_area
        JOIN t_connector_detail d ON d.chargebox_id=c.chargebox_id
        -- Status LIVE konektor ada di tabel konektor (ditulis ocpp/handle.js dan
        -- non_ocpp.js), bukan di t_connector_detail.status yang hanya atribut statis.
        -- UNIQUE(chargebox_id,connector_id) menjamin join ini tidak menggandakan baris.
        LEFT JOIN konektor k ON k.chargebox_id=d.chargebox_id AND k.connector_id=d.connector_id
        WHERE c.is_public=1
        GROUP BY c.chargebox_id, deskripsi, c.nama_chargebox, jenis, c.id_mitra, ocpp_protocol, lat, lng, is_ppn, is_pbjt, pju, fasilitas, c.foto, nama_area, alamat, a.kota, a.foto, c.is_public, c.is_active
        ORDER BY jarak ASC
        LIMIT $4`;

    try {
      const results = await query(sql, [lat, lng, lat, lim]);
      if (results.length >= 1) {
        res.send({
          success: true,
          message: 'Data ditemukan',
          data: results
        });
      } else {
        res.send({
          success: false,
          message: 'Data tidak ada',
          data: null
        });
      }
    } catch (error) {
      console.error('[nearest]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

  async getharga(req, res) {
    const id_user = tokenUserId(req);
    if (id_user === null) return res.send({ success: false, message: 'invalid0', data: null });
    const chargebox_id = req.body.chargebox_id;
    const connector_id = req.body.connector_id;
    // kWh opsional: bila dikirim, quote dihitung untuk jumlah itu; bila tidak,
    // quote per 1 kWh (harga satuan) — kontrak mobile lama tetap jalan.
    const kwhOrder = Number(req.body.jml_kwh_order) > 0 ? Number(req.body.jml_kwh_order) : 1;
    // Kode promo opsional. Bila kosong, perilaku identik dengan sebelumnya.
    const kodePromo = (req.body.kode_promo ?? '').toString().trim() || null;

    try {
      // SATU sumber angka: fn_biaya_transaksi (KEPUTUSAN-BIAYA-CHARGE.md §2).
      // 7 argumen: 4 pertama kompatibel dengan pemanggil lama, 3 terakhir
      // membawa konteks promo (user, tanggal, kode).
      const q = await query(
        `SELECT * FROM fn_biaya_transaksi($1, $2, $3, 0, $4, CURRENT_DATE, $5)`,
        [chargebox_id, connector_id, kwhOrder, id_user, kodePromo]
      );

      if (q.length === 0) {
        return res.send({ success: false, message: 'Data tidak ada', data: null });
      }

      const f = q[0];

      const rows2 = await query(`
        SELECT t_chargebox.*, t_area.nama_area, t_area.kota, t_area.pbjt,
               t_connector_detail.connector_type, t_connector_detail.electric_power,
               t_connector_detail.status, t_connector_detail.harga_perjam,
               t_connector_detail.kelas_layanan
        FROM t_chargebox
        INNER JOIN t_area ON t_chargebox.id_area=t_area.id_area
        INNER JOIN t_connector_detail ON t_chargebox.chargebox_id=t_connector_detail.chargebox_id
        WHERE t_chargebox.chargebox_id = $1 AND t_connector_detail.connector_id = $2
      `, [chargebox_id, connector_id]);

      const cb = rows2[0] || {};

      // Label biaya diambil dari master t_biaya (nama_biaya), nominal dari quote.
      const kodeLayanan = `layanan_${f.kelas_layanan ?? 'normal'}`;
      const feeRows = await query(
        `SELECT kode_biaya, nama_biaya, jenis_biaya FROM t_biaya
          WHERE id_mitra = 0 AND kode_biaya IN ('admin_platform', $1)`,
        [kodeLayanan]
      );
      const label = (kode, fallback) => {
        const row = feeRows.find((x) => x.kode_biaya === kode);
        return { nama_biaya: row ? row.nama_biaya : fallback, jenis_biaya: row ? row.jenis_biaya : 'pertransaksi' };
      };
      const lblPlatform = label('admin_platform', 'Biaya Platform');
      const lblLayanan = label(kodeLayanan, 'Biaya Layanan');

      // Nama mitra promo, untuk ditampilkan di mobile. Satu query kecil,
      // hanya dijalankan bila ada promo yang sah.
      let namaMitra = null;
      if (f.id_promo != null) {
        const m = await query(
          `SELECT m.nama
             FROM t_promo p
             JOIN t_promo_mitra m ON m.id_mitra_promo = p.id_mitra_promo
            WHERE p.id_promo = $1`,
          [f.id_promo]
        );
        namaMitra = m[0] ? m[0].nama : null;
      }

      // Field lama dipertahankan (kontrak mobile beku) + quote server (aditif).
      const kirim = {
        price_per_kwh: Number(f.harga_efektif),
        price_per_duration: Number(cb.harga_perjam ?? 0),
        ppn: Number(f.ppn_persen),
        pbjt: Number(f.pbjt_persen),
        listFeeBeforePpn: [
          { kode_biaya: 'admin_platform', nama_biaya: lblPlatform.nama_biaya, besar_biaya: Number(f.biaya_platform), jenis_biaya: lblPlatform.jenis_biaya },
          { kode_biaya: kodeLayanan, nama_biaya: lblLayanan.nama_biaya, besar_biaya: Number(f.biaya_layanan), jenis_biaya: lblLayanan.jenis_biaya },
        ].filter((x) => x.besar_biaya > 0),
        quote: {
          kwh: Number(f.kwh),
          harga_normal: Number(f.harga_normal),
          potongan_perkwh: Number(f.potongan_perkwh),
          harga_efektif: Number(f.harga_efektif),
          biaya_energi: Number(f.biaya_energi),
          pbjt_persen: Number(f.pbjt_persen),
          pbjt: Number(f.pbjt),
          biaya_platform: Number(f.biaya_platform),
          biaya_layanan: Number(f.biaya_layanan),
          kelas_layanan: f.kelas_layanan,
          dpp: Number(f.dpp),
          ppn_persen: Number(f.ppn_persen),
          ppn: Number(f.ppn),
          total: Number(f.total),

          // Field promo (API-PROMO.md §10.1). SELALU ada, null/0 bila tidak
          // ada promo, supaya klien tidak perlu menebak keberadaan field.
          id_promo: f.id_promo ?? null,
          kode_promo: f.kode_promo ?? null,
          nama_promo: f.nama_promo ?? null,
          nama_mitra: namaMitra,
          potongan_rupiah: Number(f.potongan_rupiah ?? 0),
          potongan_dibatasi: f.potongan_dibatasi === true,
          id_peserta: f.id_peserta ?? null,
          promo_alasan: f.promo_alasan ?? null,
        },
        chargebox: cb,
      };

      res.send({ success: true, message: 'Berhasill', data: kirim });
    } catch (error) {
      console.error('[getharga]', error);
      res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },

};
