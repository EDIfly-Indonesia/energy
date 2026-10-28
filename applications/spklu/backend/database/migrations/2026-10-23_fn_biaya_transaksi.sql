-- ###########################################################################
-- PERHATIAN URUTAN EKSEKUSI
-- File ini membuat fn_biaya_transaksi versi 4 argumen.
-- 2026-10-27_promo_terpadu.sql men-DROP versi itu dan menggantinya dengan
-- versi 7 argumen (kompatibel mundur, plus p_kode_promo).
--
-- JANGAN DIJALANKAN ULANG SETELAH 2026-10-27_promo_terpadu.sql.
-- Bila dijalankan, PostgreSQL menyimpan DUA overload dan pemanggilan
-- `fn_biaya_transaksi($1,$2,$3,0)` gagal: "function ... is not unique",
-- sehingga getharga dan simpanorder error.
--
-- Pemulihan: jalankan ulang 2026-10-27_promo_terpadu.sql (idempoten; DROP di
-- awal file menghapus overload lama).
-- ###########################################################################

-- =============================================================================
-- fn_biaya_transaksi — SATU sumber angka untuk quote (getharga) & pencatatan
-- (simpanorder). Rujukan: KEPUTUSAN-BIAYA-CHARGE.md (2026-10-23), TODO item 3.
--
-- Menggantikan penghitungan klien. Membaca:
--   - t_connector_detail (harga_perkwh, kelas_layanan)
--   - t_chargebox        (id_area via join)
--   - t_area             (pbjt = PBJT-TL per daerah, UU HKPD)
--   - t_biaya            (kode_biaya 'layanan_<kelas>' & 'admin_platform', id_mitra 0=global)
--   - t_setting          (ppn)
--
-- PJU/PPJ DIHAPUS. Kelas layanan: normal / fast / ultra_fast.
-- Basis pajak: PBJT = biaya energi setelah diskon; DPP = energi + platform +
-- layanan (TANPA pbjt); PPN = ppn% × DPP.
-- Pembulatan: half-up per komponen rupiah SEBELUM dijumlah; total = penjumlahan.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_biaya_transaksi(
  p_chargebox_id      varchar,
  p_connector_id      integer,
  p_kwh               double precision,
  p_potongan_perkwh   double precision DEFAULT 0
)
RETURNS TABLE (
  harga_normal     double precision,
  potongan_perkwh  double precision,
  harga_efektif    double precision,
  kwh              double precision,
  biaya_energi     double precision,
  pbjt_persen      double precision,
  pbjt             double precision,
  biaya_platform   double precision,
  biaya_layanan    double precision,
  kelas_layanan    varchar(20),
  dpp              double precision,
  ppn_persen       double precision,
  ppn              double precision,
  total            double precision
)
LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_harga    double precision;
  v_kelas    varchar(20);
  v_id_area  integer;
  v_ppn_pct  double precision;
  v_pbjt_pct double precision;
  v_potongan double precision;
  v_platform double precision;
  v_layanan  double precision;
BEGIN
  -- harga, kelas layanan, dan area asal konektor
  SELECT d.harga_perkwh, d.kelas_layanan, c.id_area
    INTO v_harga, v_kelas, v_id_area
    FROM t_connector_detail d
    JOIN t_chargebox c ON c.chargebox_id = d.chargebox_id
   WHERE d.chargebox_id = p_chargebox_id
     AND d.connector_id = p_connector_id;

  IF v_harga IS NULL THEN
    RETURN; -- konektor tidak ditemukan -> hasil kosong
  END IF;

  -- potongan (promo/member) dijepit ke [0, harga]
  v_potongan := LEAST(GREATEST(COALESCE(p_potongan_perkwh, 0), 0), v_harga);

  -- PPN global (t_setting); PBJT-TL per area (t_area)
  SELECT COALESCE(MAX(CASE WHEN nama_setting = 'ppn' THEN NULLIF(value_setting, '')::double precision END), 11)
    INTO v_ppn_pct
    FROM t_setting WHERE nama_setting = 'ppn';

  SELECT COALESCE(a.pbjt, 0) INTO v_pbjt_pct
    FROM t_area a WHERE a.id_area = v_id_area;

  -- biaya platform & layanan dari t_biaya (id_mitra 0 = global)
  SELECT COALESCE(b.default_biaya, 0) INTO v_platform
    FROM t_biaya b
   WHERE b.kode_biaya = 'admin_platform' AND b.id_mitra = 0
   LIMIT 1;

  SELECT COALESCE(b.default_biaya, 0) INTO v_layanan
    FROM t_biaya b
   WHERE b.kode_biaya = 'layanan_' || v_kelas AND b.id_mitra = 0
   LIMIT 1;

  harga_normal    := v_harga;
  potongan_perkwh := v_potongan;
  harga_efektif   := v_harga - v_potongan;
  kwh             := COALESCE(p_kwh, 0);
  kelas_layanan   := v_kelas;
  pbjt_persen     := v_pbjt_pct;
  ppn_persen      := v_ppn_pct;

  -- komponen rupiah dibulatkan half-up SEBELUM dijumlah (layar = tagihan)
  biaya_energi   := round((harga_efektif * kwh)::numeric)::double precision;
  pbjt           := round((biaya_energi * COALESCE(v_pbjt_pct, 0) / 100.0)::numeric)::double precision;
  biaya_platform := round(COALESCE(v_platform, 0)::numeric)::double precision;
  biaya_layanan  := round(COALESCE(v_layanan, 0)::numeric)::double precision;

  -- DPP tanpa PBJT; PPJT/PPN tidak saling mengkonsumsi basis
  dpp  := biaya_energi + biaya_platform + biaya_layanan;
  ppn  := round((dpp * COALESCE(v_ppn_pct, 0) / 100.0)::numeric)::double precision;
  total := biaya_energi + pbjt + biaya_platform + biaya_layanan + ppn;

  RETURN NEXT;
END;
$fn$;