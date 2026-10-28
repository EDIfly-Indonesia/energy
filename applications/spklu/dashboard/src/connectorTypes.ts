// Tipe konektor charger EV yang didukung.
//
// Nilai `value` disimpan apa adanya ke t_connector_detail.connector_type dan
// ikut dikirim ke aplikasi mobile (endpoint /chargebox/nearest).
//
// KONTRAK (dikonfirmasi tim developer): connector_type HANYA berisi "AC" atau
// "DC" — bukan nama konektor fisik seperti "Type 2" / "CCS2". Detail fisik
// (Mennekes/CCS2/CHAdeMO) tidak disimpan di kolom ini.
export interface ConnectorType {
  value: string;
  arus: 'AC' | 'DC';
  /** Label pendek untuk sub-baris di dropdown — jangan mengulang `value`. */
  ringkas: string;
  keterangan: string;
}

export const CONNECTOR_TYPES: ConnectorType[] = [
  {
    value: 'AC',
    arus: 'AC',
    ringkas: 'Bolak-balik · 7–22 kW',
    keterangan:
      'Arus bolak-balik (Alternating Current). Pengisian lambat–sedang, umumnya 7–22 kW. Contoh konektor: Type 2 (Mennekes).',
  },
  {
    value: 'DC',
    arus: 'DC',
    ringkas: 'Searah · 30 kW ke atas',
    keterangan:
      'Arus searah (Direct Current). Pengisian cepat–ultra cepat, umumnya 30 kW ke atas. Contoh konektor: CCS2, CHAdeMO.',
  },
];

export function connectorTypeInfo(value: string | null | undefined): ConnectorType | undefined {
  if (!value) return undefined;
  return CONNECTOR_TYPES.find((t) => t.value === value);
}
