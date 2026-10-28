'use strict';

/**
 * OpenAPI / JSON-schema definitions for MOBILE endpoints (Swagger documentation).
 * These 45 endpoints are FROZEN — the schemas here are documentation-only and
 * deliberately permissive (`additionalProperties: true`, no `required`, union
 * `number|string` for id/amount fields) so the mobile app is never rejected.
 */

const str = (d) => ({ type: 'string', description: d });
const num = (d) => ({ type: ['number', 'string'], description: d });
// Bilangan bulat saja. JSON "10" (string) DITOLAK — lihat chargeboxNearest.limit.
const int = (d) => ({ type: 'integer', description: d });
const obj = (d, props) => ({ type: 'object', description: d, properties: props });

function body(props) {
  return { type: 'object', additionalProperties: true, properties: props };
}

module.exports = {
  // ===== auth =====
  authLogin: body({ email: str('Email'), password: str('Password'), loginby: str("Metode: 'password' / 'email'"), apple_id: str('Apple ID (opsional)') }),
  authCekemail: body({ email: str('Email') }),
  authTesemail: body({}),
  authKirimotp: body({ email: str('Email tujuan OTP'), nohp: str('No HP') }),
  authRegistrasi: body({ email: str('Email'), password: str('Password'), nama: str('Nama lengkap'), no_hp: str('No HP'), apple_id: str('Apple ID (opsional)') }),
  authGantipassword: body({ email: str('Email'), passlama: str('Password lama'), passbaru: str('Password baru') }),
  authResetpassword: body({ email: str('Email'), passwordbaru: str('Password baru') }),
  authHapususer: body({ email: str('Email user yang dihapus') }),
  authBuatwallet: body({ email: str('Email'), nama: str('Nama') }),
  authTopup: body({ jumlah: num('Jumlah topup'), id_user: num('ID user'), id_wallet: str('ID wallet DOKU'), id_carabayar: num('ID metode bayar'), nama: str('Nama'), no_hp: str('No HP'), email: str('Email') }),
  authSaldowallet: body({ id_wallet: str('ID wallet DOKU') }),
  authSimpantoken: body({ id_user: num('ID user'), token: str('FCM token perangkat') }),
  authTesfirebase: body({}),
  authTransfer: body({ id_wallet_asal: str('ID wallet asal'), id_wallet_tujuan: str('ID wallet tujuan'), jumlah: num('Jumlah transfer') }),
  authWithdrawl: body({ id_wallet: str('ID wallet'), jumlah: num('Jumlah tarik'), kode_bank: str('Kode bank'), nomor_akun_bank: str('Nomor rekening'), nama_akun: str('Nama pemilik rekening') }),

  // ===== user =====
  userGetsaldo: body({ id_user: num('ID user'), id_wallet: str('ID wallet DOKU') }),
  userGetkwhuser: body({ id_user: num('ID user') }),
  userUbahprofil: body({ email: str('Email'), nama: str('Nama baru') }),

  // ===== chargebox =====
  chargeboxNearest: body({
    latitude: num('Latitude (opsional)'),
    longitude: num('Longitude (opsional)'),
    // WAJIB integer — kirim 10, bukan "10". String ditolak 400.
    limit: int('Jumlah maksimum hasil (opsional, integer 1-100, default 50)'),
  }),
  chargeboxGetharga: body({ id_user: num('ID user'), chargebox_id: str('ID chargebox'), connector_id: num('ID konektor') }),

  // ===== informasi =====
  infoGetberita: body({ latitude: num('Latitude (opsional)'), longitude: num('Longitude (opsional)') }),
  infoGettransaksi: body({ id_user: num('ID user'), status_transaksi: str("'all' / 'aktif' / 'selesai'"), limit: num('Batas jumlah (0 = semua)') }),
  infoHistorisaldo: body({ id_user: num('ID user') }),
  infoDatatopup: body({ no_trans: str('No transaksi topup') }),
  infoGetdatatopup: body({ id_user: num('ID user') }),
  infoGetdatarefund: body({ id_user: num('ID user') }),
  infoGetinvoice: body({ no_trans: str('No transaksi') }),

  // ===== inbox mobile (via API, bukan Supabase) =====
  infoGetberitaUser: body({ limit: int('Jumlah maksimum berita (opsional, 1-100, default 25)') }),
  infoSetberitadibaca: body({ id: int('ID berita') }),
  infoGetkonektor: body({ chargebox_id: str('ID chargebox') }),
  infoGetcharging: body({ no_trans: str('No transaksi charging') }),
  infoHapusberita: body({ id: int('ID berita yang dihapus') }),
  infoSetberitasemuadibaca: body({}),

  // ===== transaction =====
  trxSimpanorder: body({
    id_carabayar: num('ID metode bayar'),
    jenis_kendaraan: str("'car' / 'bike'"),
    id_wallet: str('ID wallet DOKU'),
    grand_total: num('Total bayar — DIABAIKAN, server menghitung ulang dari quote'),
    chargebox_id: str('ID chargebox'),
    connector_id: num('ID konektor'),
    id_user: num('ID user'),
    id_mitra: num('ID mitra'),
    tipe_charging: str("'kwh'"),
    harga_satuan: num('Harga satuan'),
    jml_kwh_order: num('Jumlah kWh dipesan'),
    jml_durasi_order: num('Jumlah durasi dipesan'),
    biaya_lain: num('Biaya lain'),
    biaya_lain_detail: obj('Detail biaya lain (JSON)', {}),
    jumlah: num('Jumlah'),
    total: num('Total'),
    ppn: num('PPN'),
    pbjt: num('PBJT'),
    pju: num('PJU'),
    reservasi: num('1 = pakai reservasi'),
    date_reservasi: str('Tanggal reservasi (ISO)'),
    nama: str('Nama'),
    email: str('Email'),
    no_hp: str('No HP'),
  }),
  trxStartcharging: body({
    id_user: num('ID user'),
    token_fcm: str('FCM token'),
    chargebox_id: str('ID chargebox'),
    transaction_number: num('No transaksi'),
    connector_id: num('ID konektor'),
    jumlah: num('Jumlah (kWh/durasi)'),
    id_tag: str('ID tag (RFID)'),
    jenischarging: str("'kwh' / 'duration'"),
  }),
  trxStopcharging: body({
    transaction_number: num('No transaksi'),
    chargebox_id: str('ID chargebox'),
    connector_id: num('ID konektor'),
  }),
  trxPaywithsaldo: body({
    id_wallet: str('ID wallet DOKU'),
    id_user: num('ID user'),
    no_trans: str('No transaksi'),
    jumlah: num('Jumlah bayar'),
  }),

  // ===== wallet =====
  walletRegister: body({ email: str('Email'), nama: str('Nama'), no_hp: str('No HP') }),
  walletCeksaldo: body({ idwallet: str('ID wallet BMS') }),
  walletUpdatepin: body({ idwallet: str('ID wallet BMS'), pinlama: str('PIN lama'), pinbaru: str('PIN baru') }),
  walletTokenize: body({ idwallet: str('ID wallet BMS'), pin: str('PIN') }),
  walletPaywithsaldo: body({ idwallet: str('ID wallet BMS'), jumlah: num('Jumlah bayar') }),
  walletTopup: body({ idwallet: str('ID wallet BMS'), jumlah: num('Jumlah topup') }),

  // ===== callback =====
  callbackVa: body({ order: obj('Payload DOKU callback', { invoice_number: str('Format: no_trans-id_user-trans|topup'), amount: num('Jumlah bayar') }) }),
  callbackTesglobalset: body({ set: str('Nilai set (dev)') }),

  // ===== nonocpp =====
  nonocppStart: body({
    id_user: num('ID user'),
    token_fcm: str('FCM token'),
    chargebox_id: str('ID chargebox'),
    connector_id: num('ID konektor'),
    jumlah: num('Jumlah (kWh/durasi)'),
    jenischarging: str("'kwh' / 'duration'"),
    transaction_number: num('No transaksi'),
  }),
  nonocppStop: body({
    chargebox_id: str('ID chargebox'),
    transaction_number: num('No transaksi'),
    connector_id: num('ID konektor'),
  }),
};
