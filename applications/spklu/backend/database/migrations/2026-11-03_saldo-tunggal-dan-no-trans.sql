-- Migrasi: pembayaran saldo tunggal + no_trans 16 digit (bigint)
--
-- Aman dijalankan berulang (idempotent). Jalankan dalam satu transaksi.
-- Format no_trans baru: YYYYMMDDHHMMNNNN (UTC) -> 16 digit, muat di bigint.
--
-- Catatan tipe: int4 (integer) TIDAK cukup (maks 2.147.483.647), sehingga
-- no_trans dan t_reservasi.transaction_id memakai bigint.
--
--   psql -v ON_ERROR_STOP=1 -f migrate-saldo-tunggal.sql

BEGIN;

-- ---------------------------------------------------------------- counter no_trans
CREATE TABLE IF NOT EXISTS t_no_trans_counter (
  tanggal date    PRIMARY KEY,
  urut    integer NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------- no_trans -> bigint
-- Nilai lama semuanya numerik (diperiksa: 0 baris non-numerik).
ALTER TABLE t_transaction
  ALTER COLUMN no_trans TYPE bigint USING NULLIF(no_trans, '')::bigint;

ALTER TABLE t_reservasi
  ALTER COLUMN transaction_id TYPE bigint USING transaction_id::bigint;

CREATE UNIQUE INDEX IF NOT EXISTS uq_transaction_no_trans
  ON t_transaction (no_trans) WHERE no_trans IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_reservasi_transaction_id
  ON t_reservasi (transaction_id);

-- ---------------------------------------------------------------- saldo
-- Satu baris saldo per user agar debit/kredit tidak ambigu.
-- Diperiksa: 1 baris, tidak ada duplikat id_user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_saldo_user ON t_saldo_user (id_user);

-- Jejak audit. t_histori_saldo sudah ada (id, id_user, tgl, jumlah,
-- keterangan, jenis); kolom berikut bersifat aditif.
ALTER TABLE t_histori_saldo ADD COLUMN IF NOT EXISTS no_trans    bigint;
ALTER TABLE t_histori_saldo ADD COLUMN IF NOT EXISTS saldo_awal  double precision;
ALTER TABLE t_histori_saldo ADD COLUMN IF NOT EXISTS saldo_akhir double precision;

CREATE INDEX IF NOT EXISTS ix_histori_saldo_user
  ON t_histori_saldo (id_user, tgl DESC);

-- Cegah refund/debit ganda untuk transaksi yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS uq_histori_saldo_jenis_trans
  ON t_histori_saldo (no_trans, jenis) WHERE no_trans IS NOT NULL;

-- ---------------------------------------------------------------- wallet_id lokal
-- wallet_id menjadi identitas penampung saldo milik kita (bukan sub-account DOKU).
-- Saldo tetap di t_saldo_user. Baris lama dengan id_wallet='' diberi identitas
-- lokal agar setiap user punya penampung yang jelas.
UPDATE t_user_mobile
   SET id_wallet = 'WLT-' || lpad(id_user::text, 6, '0'),
       wallet_status = 'local',
       wallet_updated_at = now()
 WHERE (id_wallet IS NULL OR id_wallet = '')
   AND deleted_at IS NULL;

COMMIT;
