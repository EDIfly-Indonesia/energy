-- Migration: rate_peak_off_peak
-- Date: 2026-09-29
-- Scope: Aktifkan skenario rate kedua — Peak/Off-Peak (Time-of-Use satu jendela).
--         Tidak ada kolom baru; hanya:
--         1. Koreksi default peak_start_hour 18 -> 17 (WBP 17:00-22:00).
--         2. Tambah CHECK constraint rate_type agar hanya FIXED / PEAK_OFF_PEAK.

ALTER TABLE tbl_rates
  ALTER COLUMN peak_start_hour SET DEFAULT 17;

-- Bersihkan nilai yang mungkin tersimpan (saat ini 0 baris).
UPDATE tbl_rates SET peak_start_hour = 17 WHERE peak_start_hour = 18;

ALTER TABLE tbl_rates
  ADD CONSTRAINT chk_tbl_rates_rate_type
  CHECK (rate_type IN ('FIXED', 'PEAK_OFF_PEAK'));
