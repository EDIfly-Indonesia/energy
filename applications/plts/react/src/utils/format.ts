// src/utils/format.ts
// Utilitas pemformatan angka dengan locale Indonesia (id-ID):
// - Pemisah ribuan: titik (contoh: 1.234.567)
// - Pemisah desimal: koma (contoh: 12.345,6)

/**
 * Format angka ke format Indonesia.
 *
 * @param value Nilai numerik atau string numerik (string non-numerik → '—')
 * @param maxFractionDigits Jumlah digit desimal maksimal (default: 1)
 */
export const formatNumberID = (
  value: number | string | null | undefined,
  maxFractionDigits = 1
): string => {
  if (value === undefined || value === null || value === '') return '—';

  const num = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (Number.isNaN(num)) return '—';

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(num);
};
