-- =============================================================================
-- Kendaraan pengguna: izinkan lebih dari satu unit per merek
-- File: 2026-10-28_kendaraan_multi_unit.sql
--
-- MASALAH
-- Migrasi promo membuat index unik:
--   t_user_kendaraan_user_mitra_unique UNIQUE (id_user, id_mitra_promo)
--   WHERE id_mitra_promo IS NOT NULL
--
-- Index itu dibuat supaya endpoint ATPM (fn_kendaraan_daftar) idempoten:
-- satu pengguna = satu klaim merek. Tetapi setelah fitur "Daftar Kendaraan"
-- ditambahkan di profil, pengguna yang punya dua mobil merek sama (mis. dua
-- BYD) tidak bisa mendaftarkan keduanya — INSERT kedua ditolak unique
-- violation, dan pesan errornya membingungkan karena bukan soal VIN.
--
-- PERBAIKAN
-- Batasi keunikan HANYA untuk baris yang dibuat endpoint ATPM. Kendaraan yang
-- diinput sendiri pengguna (sumber = 'app') boleh lebih dari satu per merek.
--
-- Idempotensi endpoint ATPM tetap terjaga dua lapis:
--   1. fn_kendaraan_daftar memakai IF NOT EXISTS sebelum INSERT
--   2. index unik parsial di bawah ini menangkap balapan (race) antar request
--
-- Index VIN unik TIDAK diubah: satu VIN tetap tidak boleh terdaftar dua kali
-- oleh pengguna yang sama, apa pun sumbernya.
-- =============================================================================

BEGIN;

DROP INDEX IF EXISTS t_user_kendaraan_user_mitra_unique;

CREATE UNIQUE INDEX IF NOT EXISTS t_user_kendaraan_atpm_unique
  ON t_user_kendaraan (id_user, id_mitra_promo)
  WHERE id_mitra_promo IS NOT NULL AND sumber = 'atpm_endpoint';

-- Pencarian daftar kendaraan milik satu pengguna (dipakai GET /user/kendaraan).
CREATE INDEX IF NOT EXISTS idx_user_kendaraan_user_aktif
  ON t_user_kendaraan (id_user, aktif);

COMMIT;
