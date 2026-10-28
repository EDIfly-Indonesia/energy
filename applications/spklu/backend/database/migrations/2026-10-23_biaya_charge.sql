-- =============================================================================
-- Schema Biaya Charging + PBJT-TL per area + kelas layanan konektor
-- File: 2026-10-23_biaya_charge.sql
-- Rujukan: KEPUTUSAN-BIAYA-CHARGE.md (2026-10-23), TODO-BIAYA-CHARGE.md item 2.
--
-- Perubahan:
--   1. t_biaya           -> kolom kode_biaya + id_mitra default 0 (0 = global) + UNIQUE(kode_biaya, id_mitra)
--   2. t_area            -> kolom pbjt (PBJT-TL per daerah, UU HKPD)
--   3. t_connector_detail-> kolom kelas_layanan (normal/fast/ultra_fast)
--   4. Seed master biaya (id_mitra 0 = global)
--   5. Pindahkan tarif PBJT global (t_setting.pbjt) ke t_area.pbjt
--
-- Idempotent untuk langkah 1-4 (IF [NOT] EXISTS / ON CONFLICT DO NOTHING).
-- Langkah 5 hanya mengisi area yang masih 0 supaya tidak menimpa nilai area
-- yang sudah diubah admin bila migrasi dijalankan ulang.
-- =============================================================================

BEGIN;

-- 1. t_biaya: master biaya tambahan
ALTER TABLE t_biaya ADD COLUMN IF NOT EXISTS kode_biaya varchar(50);
ALTER TABLE t_biaya ALTER COLUMN id_mitra SET DEFAULT 0;             -- 0 = global (semua mitra)
ALTER TABLE t_biaya DROP CONSTRAINT IF EXISTS t_biaya_nama_unique;
ALTER TABLE t_biaya DROP CONSTRAINT IF EXISTS t_biaya_kode_unique;
ALTER TABLE t_biaya ADD CONSTRAINT t_biaya_kode_unique UNIQUE (kode_biaya, id_mitra);

-- 2. t_area: tarif PBJT-TL per daerah (pajak daerah; PPJ/PJU dilebur ke sini)
ALTER TABLE t_area ADD COLUMN IF NOT EXISTS pbjt double precision NOT NULL DEFAULT 0;

-- 3. t_connector_detail: kelas layanan
ALTER TABLE t_connector_detail ADD COLUMN IF NOT EXISTS kelas_layanan varchar(20);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 't_connector_detail_kelas_ck') THEN
    ALTER TABLE t_connector_detail
      ADD CONSTRAINT t_connector_detail_kelas_ck
      CHECK (kelas_layanan IS NULL OR kelas_layanan IN ('normal','fast','ultra_fast'));
  END IF;
END $$;

-- 4. Seed master biaya (id_mitra 0 = global)
INSERT INTO t_biaya (kode_biaya, nama_biaya, jenis_biaya, default_biaya, id_mitra) VALUES
  ('layanan_normal',     'Biaya Layanan Normal',     'pertransaksi', 0,     0),
  ('layanan_fast',       'Biaya Layanan Fast',       'pertransaksi', 25000, 0),
  ('layanan_ultra_fast', 'Biaya Layanan Ultra Fast', 'pertransaksi', 57000, 0),
  ('admin_platform',     'Biaya Platform',           'pertransaksi', 1500,  0)
ON CONFLICT (kode_biaya, id_mitra) DO NOTHING;

-- 5. Pindahkan tarif PBJT global -> t_area.pbjt (hanya area yang masih 0)
UPDATE t_area SET pbjt = COALESCE(
  (SELECT NULLIF(value_setting, '')::double precision FROM t_setting WHERE nama_setting = 'pbjt' LIMIT 1),
  0
)
WHERE pbjt = 0;

COMMIT;