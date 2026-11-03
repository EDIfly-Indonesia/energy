'use strict';

/**
 * Generator nomor transaksi SPKLU.
 *
 * Format: YYYYMMDDHHMM + NNNN  (UTC), seluruhnya angka.
 * Contoh: 2026110303270001
 *
 *   YYYYMMDD  tanggal UTC
 *   HHMM      jam & menit UTC
 *   NNNN      nomor urut 4 digit, reset setiap hari (UTC)
 *
 * Panjang selalu 16 digit. Dipakai sebagai no_trans sekaligus nomor invoice.
 *
 * TIPE DATA: 16 digit (≈2,03e15) TIDAK muat di PostgreSQL `integer`
 * (maks 2.147.483.647) tetapi muat di `bigint`. Di JavaScript nilainya masih
 * di bawah Number.MAX_SAFE_INTEGER (9.007.199.254.740.991) sehingga aman
 * sampai tahun 9007 — namun nomor ini SELALU diperlakukan sebagai STRING:
 * driver `pg` mengembalikan bigint sebagai string, dan aritmetika Number pada
 * nilai 16 digit berisiko kehilangan presisi.
 *
 * Penomoran atomik: nomor diambil lewat UPSERT ... RETURNING di dalam transaksi
 * DB yang sama dengan INSERT t_transaction, bukan COUNT(*)+1.
 */

const PANJANG = 16;
const POLA = /^\d{16}$/;

/** Bagian tanggal-jam UTC, tanpa nomor urut. 12 digit. */
function prefixWaktu(tanggal = new Date()) {
  const d = tanggal instanceof Date ? tanggal : new Date(tanggal);
  if (Number.isNaN(d.getTime())) throw new Error('tanggal tidak valid');

  const p2 = (n) => String(n).padStart(2, '0');
  return (
    String(d.getUTCFullYear()) +
    p2(d.getUTCMonth() + 1) +
    p2(d.getUTCDate()) +
    p2(d.getUTCHours()) +
    p2(d.getUTCMinutes())
  );
}

/** Kunci tanggal (UTC) untuk counter harian, format YYYY-MM-DD. */
function tanggalCounter(tanggal = new Date()) {
  const d = tanggal instanceof Date ? tanggal : new Date(tanggal);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

/** Gabungkan prefix 12 digit + nomor urut 4 digit menjadi 16 digit. */
function susun(prefix, urut) {
  if (!Number.isInteger(urut) || urut < 1 || urut > 9999) {
    throw new Error(`nomor urut di luar jangkauan 4 digit: ${urut}`);
  }
  const hasil = `${prefix}${String(urut).padStart(4, '0')}`;
  if (hasil.length !== PANJANG) {
    throw new Error(`panjang no_trans harus ${PANJANG}, dapat ${hasil.length}: ${hasil}`);
  }
  return hasil;
}

/** Validasi format (string 16 digit). */
function valid(noTrans) {
  return typeof noTrans === 'string' && POLA.test(noTrans);
}

/**
 * Ambil nomor transaksi berikutnya.
 * WAJIB dipanggil di dalam transaksi DB yang sama dengan INSERT t_transaction,
 * supaya nomor ikut ter-rollback bila INSERT gagal.
 *
 * @param {object} client  pg client yang sedang berada dalam BEGIN
 * @param {Date}   [sekarang]
 * @returns {Promise<string>} no_trans 16 digit
 */
async function ambilNomorBerikutnya(client, sekarang = new Date()) {
  const tanggal = tanggalCounter(sekarang);

  const { rows } = await client.query(
    `INSERT INTO t_no_trans_counter (tanggal, urut) VALUES ($1::date, 1)
     ON CONFLICT (tanggal) DO UPDATE SET urut = t_no_trans_counter.urut + 1
     RETURNING urut`,
    [tanggal]
  );

  return susun(prefixWaktu(sekarang), rows[0].urut);
}

module.exports = {
  PANJANG,
  prefixWaktu,
  tanggalCounter,
  susun,
  valid,
  ambilNomorBerikutnya,
};
