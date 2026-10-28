-- =============================================================================
-- Pembersihan tabel mati (TODO-BIAYA-CHARGE.md item 6)
-- File: 2026-10-23_cleanup_dead_tables.sql
--
-- ⚠️  DESTRUKTIF — TIDAK DIJALANKAN OTOMATIS. Butuh persetujuan eksplisit.
--     Jalankan HANYA setelah backup: pg_dump -t <tabel> ...
--
-- Verifikasi ulang rujukan kode (2026-10-23):
--   grep di backend/src + dashboard/src -> 0 rujukan untuk tabel di bawah.
--
-- DIKELUARKAN dari daftar (TERBUKTI MASIH DIPAKAI — jangan dihapus):
--   * t_log        -> non_ocpp.js simpanlog(): INSERT INTO t_log
--   * t_log_ebike  -> ocpp/handle.js:48: INSERT INTO t_log_ebike
--   (Analisa awal menyebut keduanya mati; itu KELIRU.)
--
-- t_member: masih punya trigger trg_tmember_ai/au/ad yang menyinkronkan
--   t_user_mobile. Trigger ikut terhapus bersama tabel. Saat ini 0 baris dan
--   t_jenismember hanya 1 baris -> jalur member praktis dorman.
-- =============================================================================

BEGIN;

DROP VIEW IF EXISTS menu;                    -- ACL legacy PHP; bergantung pada t_access/t_user_access
DROP TABLE IF EXISTS t_transaction_detail2;  -- duplikat t_transaction_detail
DROP TABLE IF EXISTS t_transaction2;         -- duplikat t_transaction
DROP TABLE IF EXISTS t_detail_biaya;         -- 0 baris, tak pernah ditulis
DROP TABLE IF EXISTS t_besar_pajak;          -- 0 baris; pajak kini di t_setting + t_area.pbjt
DROP TABLE IF EXISTS t_fasilitas;            -- 3 baris; fasilitas chargebox pakai kolom jsonb
DROP TABLE IF EXISTS t_access;               -- 29 baris; ACL legacy dashboard PHP
DROP TABLE IF EXISTS t_user_access;          -- 29 baris; ACL legacy dashboard PHP
DROP TABLE IF EXISTS t_member;               -- 0 baris; trigger sync ikut terhapus

COMMIT;

-- Setelah dijalankan: hapus juga entri MITRA_REFERENCES di
-- backend/src/controllers/controller-admin-extra.js untuk 't_transaction2'
-- dan 't_member', kalau tidak deleteMitra akan error "relation does not exist".