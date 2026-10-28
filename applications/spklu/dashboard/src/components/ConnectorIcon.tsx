import { Plug } from 'lucide-react';
import acSvg from '../assets/icons/connector-ac.svg?raw';
import dcSvg from '../assets/icons/connector-dc.svg?raw';
import genericSvg from '../assets/icons/connector-generic.svg?raw';

/**
 * Ikon tipe konektor.
 *
 * Lucide tidak menyediakan ikon konektor AC/DC yang sesuai, jadi dipakai SVG
 * sendiri di `src/assets/icons/` yang direkonstruksi dari referensi PNG di
 * `public/assets/images/{ac,dc,connector}.png`.
 *
 * Diimpor sebagai `?raw` lalu dirender INLINE, bukan lewat <img>. SVG yang
 * dimuat <img> adalah dokumen terpisah, sehingga `currentColor` di dalamnya
 * TIDAK mewarisi warna CSS dari luar — ikon akan tampil hitam di tema gelap.
 */
const RAW: Record<string, string> = {
  AC: acSvg,
  DC: dcSvg,
  // '' = placeholder "Pilih Tipe": ikon konektor generik.
  '': genericSvg,
};

export function hasConnectorIcon(value: string | null | undefined): boolean {
  return value != null && value in RAW;
}

interface Props {
  value: string | null | undefined;
  size?: number;
  className?: string;
  /** true = pakai ikon plug netral saat tipe belum dipilih. */
  fallback?: boolean;
}

export default function ConnectorIcon({ value, size = 20, className, fallback = true }: Props) {
  // '' adalah kunci sah (ikon generik untuk placeholder), jadi jangan pakai
  // cek falsy — `value ? ...` akan membuang string kosong.
  const raw = value != null ? RAW[value] : undefined;

  if (!raw) {
    if (!fallback) return null;
    return <Plug size={size} className={className} />;
  }

  return (
    <span
      className={className ? `connector-icon ${className}` : 'connector-icon'}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}
