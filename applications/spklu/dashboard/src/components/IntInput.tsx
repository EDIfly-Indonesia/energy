import type { ChangeEvent } from 'react';

/**
 * Input bilangan bulat (integer) tanpa pemisah ribuan/desimal.
 *
 * `type="number"` TIDAK cukup: pada beberapa locale browser menerima koma
 * sebagai pemisah desimal ("22000,5"), dan `Number("22000,5")` menghasilkan
 * NaN yang lalu diam-diam menjadi 0 saat disimpan. Di sini semua karakter
 * selain digit dibuang, sehingga koma, titik, minus, dan notasi eksponen
 * tidak pernah masuk ke state.
 */
interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Jumlah digit maksimum (mis. 4 untuk daya maks 1000 kW). */
  maxDigits?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function digitsOnly(raw: string, maxDigits?: number): string {
  const digits = raw.replace(/\D/g, '');
  if (maxDigits == null) return digits;
  return digits.slice(0, maxDigits);
}

export default function IntInput({
  value,
  onChange,
  placeholder,
  maxDigits,
  disabled,
  id,
  className,
}: Props) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    onChange(digitsOnly(e.target.value, maxDigits));
  }

  return (
    <input
      id={id}
      // type="text" + inputMode numeric: keyboard angka di mobile, tapi tidak
      // ada parsing locale yang bisa menyelipkan koma/desimal.
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={value}
      onChange={handle}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
