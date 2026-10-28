'use strict';

/**
 * OpenAPI / JSON-schema definitions for admin endpoints (Swagger documentation).
 * Replaces the previous generic `{ type: 'object', additionalProperties: true }`
 * placeholder so Swagger shows the real request fields.
 *
 * Types match what the React dashboard actually sends:
 *   - teks        -> string
 *   - id/flag 0/1 -> integer (frontend sends Number)
 *   - harga/pju   -> number
 *   - fasilitas/foto -> free-form (null / string / array / jsonb object)
 */

const str = (description) => ({ type: 'string', description });
const int = (description) => ({ type: 'integer', description });
const num = (description) => ({ type: 'number', description });

// id path param (id_area / id_chargebox / id_mitra / dsb — integer)
const idParams = (description) => ({
  type: 'object',
  properties: { id: { type: 'integer', description } },
});

// --- auth ---
const loginBody = {
  type: 'object',
  additionalProperties: true,
  required: ['username', 'password'],
  properties: {
    username: str('Username admin (kolom code)'),
    password: str('Password'),
    captcha_id: str('ID captcha (dari GET /admin/captcha)'),
    captcha: str('Jawaban captcha'),
  },
};

// --- area ---
const areaBody = {
  type: 'object',
  additionalProperties: true,
  required: ['nama_area'],
  properties: {
    nama_area: str('Nama area (wajib)'),
    alamat: str('Alamat'),
    kode_pos: str('Kode pos'),
    kota: str('Kota'),
    foto: str('Nama file foto'),
    pbjt: num('Tarif PBJT-TL daerah dalam persen (UU HKPD; PPJ/PJU dilebur ke sini)'),
  },
};

// --- biaya (master biaya tambahan) ---
const biayaBody = {
  type: 'object',
  additionalProperties: true,
  required: ['kode_biaya', 'nama_biaya'],
  properties: {
    kode_biaya: str('Kode stabil: admin_platform | layanan_normal | layanan_fast | layanan_ultra_fast'),
    nama_biaya: str('Label tampilan'),
    id_mitra: int('ID mitra (0 = global, berlaku semua mitra)'),
    jenis_biaya: { type: 'string', enum: ['pertransaksi', 'perkwh', 'perjam'], description: 'Jenis biaya' },
    default_biaya: num('Nominal biaya'),
  },
};

// --- chargebox ---
const chargeboxBody = {
  type: 'object',
  additionalProperties: true,
  required: ['nama_chargebox'],
  properties: {
    chargebox_id: str('Diabaikan — dibuat otomatis oleh server (EZ + 5 digit). Tidak bisa diubah.'),
    nama_chargebox: str('Nama chargebox (wajib)'),
    deskripsi: str('Deskripsi'),
    jenis: { type: 'string', enum: ['car', 'bike'], description: "Jenis: 'car' atau 'bike'" },
    id_mitra: int('ID mitra'),
    lat: str('Latitude'),
    lng: str('Longitude'),
    id_area: int('ID area'),
    ocpp_protocol: { type: 'string', enum: ['non_ocpp', 'ocpp1.6J', 'ocpp2.0', 'ocpp2.0.1'], description: 'Protokol OCPP' },
    vendor: str('Vendor'),
    model: str('Model'),
    serial_number: str('Serial number'),
    is_ppn: int('Kena PPN (0/1)'),
    is_pbjt: int('Kena PBJT (0/1)'),
    pju: num('Nilai PJU'),
    is_public: int('Publik (0/1)'),
    is_active: int('Aktif (0/1)'),
    fasilitas: { description: 'Fasilitas (array/JSON, opsional)' },
    foto: { description: 'Foto (string/array/JSON, opsional)' },
  },
};

// --- connector ---
// Nilai angka sengaja dibiarkan `number|string` (union). Dengan `type:'number'`
// saja, AJV meng-coerce string lebih dulu sehingga "22.000" menjadi 22 dan
// "1e5" menjadi 100000 SEBELUM controller sempat menolaknya — koma/titik jadi
// diam-diam berubah nilai. Union membuat string tetap string, lalu
// `parseIntegerField()` di controller yang memvalidasi.
const intish = (description) => ({
  type: ['number', 'string'],
  description,
});

const connectorBody = {
  type: 'object',
  additionalProperties: true,
  properties: {
    connector_id: int('Nomor konektor (opsional — otomatis = berikutnya)'),
    electric_power: intish('Daya listrik dalam kW (bilangan bulat, tanpa koma/titik; mis. 7 / 30 / 60)'),
    connector_type: {
      type: 'string',
      description: "Tipe konektor: 'AC' atau 'DC'",
    },
    harga_perkwh: intish('Harga per kWh (bilangan bulat rupiah, tanpa koma/titik)'),
    harga_perjam: intish('Harga per jam (bilangan bulat rupiah, tanpa koma/titik)'),
    status: str('Status konektor'),
    kelas_layanan: {
      type: 'string',
      description: "Kelas layanan: 'normal' | 'fast' | 'ultra_fast' (menentukan biaya per sesi)",
    },
  },
};

// --- mitra ---
const mitraBody = {
  type: 'object',
  additionalProperties: true,
  required: ['name'],
  properties: {
    name: str('Nama mitra (wajib)'),
    email: str('Email'),
    no_hp: str('No HP'),
  },
};

// --- setting ---
const settingBody = {
  type: 'object',
  additionalProperties: true,
  properties: {
    ppn: num('Persen PPN'),
    pbjt: num('Persen PBJT'),
    admin_wallet: num('Admin fee wallet'),
    admin_wallet_sandbox: num('Admin fee wallet (sandbox)'),
    smtp_host: str('SMTP host'),
    smtp_port: num('SMTP port'),
    smtp_secure: str('SMTP secure (true/false)'),
    smtp_user: str('SMTP username (email)'),
    smtp_pass: str('SMTP password (write-only; kosongkan untuk tetap)'),
    smtp_from: str('SMTP from (mis. "Admin GoCaz" <email>)'),
  },
};

// --- admin user (create vs update have different required sets) ---
const adminUserCreateBody = {
  type: 'object',
  additionalProperties: true,
  required: ['code', 'name', 'email', 'password'],
  properties: {
    code: str('Kode login unik (wajib)'),
    name: str('Nama (wajib)'),
    email: str('Email (wajib)'),
    password: str('Password (wajib, di-hash bcrypt)'),
    type_id: int('ID tipe/role'),
    id_role: int('ID role'),
  },
};

const adminUserUpdateBody = {
  type: 'object',
  additionalProperties: true,
  properties: {
    name: str('Nama'),
    email: str('Email'),
    type_id: int('ID tipe/role'),
    id_role: int('ID role'),
  },
};

// --- pelanggan (mobile app users) ---
const pelangganCreateBody = {
  type: 'object',
  additionalProperties: true,
  required: ['nama', 'email', 'password'],
  properties: {
    nama: str('Nama pelanggan (wajib)'),
    email: str('Email login (wajib, unik)'),
    password: str('Password (wajib, di-hash bcrypt)'),
    no_hp: str('Nomor HP'),
    id_mitra: int('ID mitra (wajib)'),
    id_jenismember: int('ID jenis member'),
    id_wallet: str('ID wallet DOKU'),
  },
};

const pelangganUpdateBody = {
  type: 'object',
  additionalProperties: true,
  properties: {
    nama: str('Nama pelanggan'),
    email: str('Email login'),
    password: str('Password baru (kosongkan bila tidak diubah)'),
    no_hp: str('Nomor HP'),
    id_mitra: int('ID mitra'),
    id_jenismember: int('ID jenis member'),
    id_wallet: str('ID wallet DOKU'),
  },
};

// --- berita / artikel (t_berita) ---
// `radius_km` dalam KM; kolom `radius` di DB dalam MIL (lihat controller).
const beritaBody = {
  type: 'object',
  additionalProperties: true,
  required: ['judul', 'berita', 'tgl_terbit'],
  properties: {
    judul: str('Judul artikel (wajib, maks 255)'),
    berita: str('Isi artikel (wajib)'),
    tgl_terbit: { type: 'string', description: 'Tanggal terbit YYYY-MM-DD (wajib)' },
    jangkauan: { type: 'string', enum: ['semua', 'radius'], description: "Jangkauan: 'semua' atau 'radius'" },
    radius_km: num('Radius dalam km (wajib bila jangkauan radius)'),
    pusat_latitude: num('Latitude pusat radius'),
    pusat_longitude: num('Longitude pusat radius'),
    jenis_berita: { type: 'string', enum: ['app', 'web'], description: "Jenis: 'app' atau 'web'" },
    status: int('1 = tampil, 0 = draft'),
    foto: str('Nama file foto hasil upload (folder berita/foto)'),
    url: str('URL tujuan (opsional, http/https)'),
  },
};

// --- upload ---
const uploadQuery = {
  type: 'object',
  properties: {
    folder: {
      type: 'string',
      enum: ['chargebox', 'area', 'berita/foto', 'berita/video', 'fasilitas'],
      description: 'Subfolder tujuan upload',
    },
  },
};

// --- media library ---
const mediaQuery = {
  type: 'object',
  properties: {
    folder: {
      type: 'string',
      enum: ['chargebox', 'area', 'berita/foto', 'berita/video', 'fasilitas'],
      description: 'Filter satu folder (opsional; tanpa param daftar semua folder)',
    },
  },
};

const mediaDeleteBody = {
  type: 'object',
  additionalProperties: true,
  required: ['folder', 'filename'],
  properties: {
    folder: {
      type: 'string',
      enum: ['chargebox', 'area', 'berita/foto', 'berita/video', 'fasilitas'],
      description: 'Subfolder tempat file berada',
    },
    filename: str('Nama file yang akan dihapus'),
  },
};

// --- report / laporan (querystring) ---
const reportQuery = {
  type: 'object',
  additionalProperties: true,
  properties: {
    from: { type: 'string', description: 'Tanggal awal (YYYY-MM-DD), default awal bulan' },
    to: { type: 'string', description: 'Tanggal akhir (YYYY-MM-DD), default hari ini' },
    id_mitra: { type: 'string', description: 'Filter ID mitra (opsional)' },
    group: { type: 'string', enum: ['day', 'month'], description: 'Grup periode transaksi' },
  },
};

module.exports = {
  loginBody,
  idParams,
  areaBody,
  biayaBody,
  chargeboxBody,
  connectorBody,
  mitraBody,
  settingBody,
  adminUserCreateBody,
  adminUserUpdateBody,
  pelangganCreateBody,
  pelangganUpdateBody,
  beritaBody,
  uploadQuery,
  mediaQuery,
  mediaDeleteBody,
  reportQuery,
};
