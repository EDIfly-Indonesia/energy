'use strict';

/**
 * Konvensi satuan energi (KEPUTUSAN-BIAYA-CHARGE.md §4):
 *   - Penyimpanan DB: Wh (jml_kwh_order integer Wh, jml_kwh_terpakai double Wh.
 *     Meter OCPP/non-OCPP juga Wh).
 *   - Penghitungan/quote: kWh (double).
 * Semua konversi WAJIB lewat helper ini — jangan inline `*1000` / `/1000` di
 * tempat lain, supaya kelas bug "terbaca sebagai kWh, salah 1000×" tidak muncul.
 */
const WH_PER_KWH = 1000;

/** kWh (double) -> Wh bulat (integer). */
function kwhToWh(kwh) {
  const n = Number(kwh);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * WH_PER_KWH);
}

/** Wh (double) -> kWh (double). */
function whToKwh(wh) {
  const n = Number(wh);
  if (!Number.isFinite(n)) return 0;
  return n / WH_PER_KWH;
}

module.exports = { WH_PER_KWH, kwhToWh, whToKwh };