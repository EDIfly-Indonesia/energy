-- =============================================================================
-- fn_promo_pakai v2 — IDEMPOTEN terhadap pengiriman ulang (retry) callback
-- File: 2026-10-28_promo_klaim_idempoten.sql
--
-- MASALAH YANG DIPERBAIKI
-- Versi sebelumnya melakukan UPDATE budget lebih dulu, lalu INSERT ledger.
-- Bila dipanggil dua kali dengan no_trans yang sama (gateway pembayaran
-- mengirim callback berulang — perilaku normal DOKU), INSERT melanggar
-- UNIQUE(no_trans) dan fungsi MELEMPAR exception.
--
-- Dampak yang terukur (diuji di DB live, mode autocommit):
--   - budget_terpakai TIDAK dobel (12000, bukan 24000) karena PL/pgSQL
--     membungkus satu pemanggilan fungsi dalam satu transaksi implisit;
--   - tetapi pemanggilan kedua GAGAL dengan exception, sehingga callback
--     mengembalikan error dan gateway akan terus mencoba ulang.
--
-- PERBAIKAN
-- Urutan dibalik: INSERT ledger lebih dulu dengan ON CONFLICT DO NOTHING.
--   - baris sudah ada  -> anggap sudah diklaim, kembalikan TRUE (idempoten)
--   - baris baru dibuat -> baru UPDATE budget secara atomik
--   - budget tidak cukup -> hapus baris ledger, kembalikan FALSE
-- Dengan urutan ini, retry selalu aman dan tidak pernah melempar exception.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION fn_promo_pakai(
  p_id_promo        integer,
  p_id_peserta      integer,
  p_id_user         integer,
  p_no_trans        varchar,
  p_kwh             double precision,
  p_harga_normal    double precision,
  p_potongan_rupiah double precision,
  p_potongan_perkwh double precision,
  p_harga_efektif   double precision
)
RETURNS boolean
LANGUAGE plpgsql AS $fn$
DECLARE
  v_id bigint;
  v_ok boolean := false;
BEGIN
  -- 1. Catat ledger lebih dulu. ON CONFLICT membuat pemanggilan ulang dengan
  --    no_trans yang sama tidak melakukan apa pun dan tidak melempar error.
  INSERT INTO t_promo_pemakaian (
    id_promo, id_peserta, id_user, no_trans, kwh, harga_normal,
    potongan_perkwh, harga_efektif, potongan_rupiah, status
  ) VALUES (
    p_id_promo, p_id_peserta, p_id_user, p_no_trans,
    GREATEST(p_kwh, 0), p_harga_normal,
    p_potongan_perkwh, p_harga_efektif, GREATEST(p_potongan_rupiah, 0), 'aktif'
  )
  ON CONFLICT (no_trans) DO NOTHING
  RETURNING id INTO v_id;

  -- Sudah pernah diklaim: idempoten, laporkan sukses tanpa mengubah budget.
  IF v_id IS NULL THEN
    RETURN true;
  END IF;

  -- 2. Klaim budget secara atomik. Satu UPDATE dengan syarat, sehingga dua
  --    pembayaran bersamaan tidak bisa melampaui budget.
  UPDATE t_promo
     SET budget_terpakai = budget_terpakai + GREATEST(p_potongan_rupiah, 0),
         kuota_kwh_terpakai = kuota_kwh_terpakai + GREATEST(p_kwh, 0),
         updated_at = now()
   WHERE id_promo = p_id_promo
     AND budget_terpakai + GREATEST(p_potongan_rupiah, 0) <= budget_rupiah
     AND (kuota_kwh IS NULL
          OR kuota_kwh_terpakai + GREATEST(p_kwh, 0) <= kuota_kwh)
  RETURNING true INTO v_ok;

  -- 3. Budget tidak cukup: batalkan baris ledger supaya no_trans bisa dipakai
  --    ulang oleh pencatatan 'gagal_klaim' (fn_promo_klaim_gagal).
  IF NOT COALESCE(v_ok, false) THEN
    DELETE FROM t_promo_pemakaian WHERE id = v_id;
    RETURN false;
  END IF;

  RETURN true;
END;
$fn$;

COMMENT ON FUNCTION fn_promo_pakai(integer, integer, integer, varchar, double precision, double precision, double precision, double precision, double precision) IS
  'Klaim budget promo. Idempoten: pemanggilan ulang dengan no_trans sama mengembalikan true tanpa mengubah budget.';

COMMIT;
