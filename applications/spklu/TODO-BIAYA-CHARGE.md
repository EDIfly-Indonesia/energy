# TODO — Perbaikan DB Schema & Formula Biaya Charging SPKLU

Rujukan keputusan: `KEPUTUSAN-BIAYA-CHARGE.md` (2026-10-23).
Status: belum ada perubahan DB — seluruh item di bawah adalah rencana kerja.

## 0. Prasyarat

- [x] Dokumen keputusan ditetapkan
- [x] Nilai biaya tanpa pemisah ribuan (.) — formula + seed sudah bersih

## 1. Keamanan — tutup celah charging gratis (KRITIS, kerjakan lebih dulu)

- [x] `simpanorder` (`controller-transaction.js`): `status_transaksi` ditentukan SERVER, bukan dari `grand_total == 0` yang dikirim klien
- [x] Tolak order dengan `grand_total <= 0` atau tidak cocok dengan quote server (selaras dengan item 4.3)
- [x] Uji: kirim `grand_total: 0` → harus ditolak / tidak boleh `ready`, sesi tidak boleh jalan tanpa bayar

## 2. Perubahan DB Schema (migrasi baru, ON_ERROR_STOP)

- [ ] `t_biaya` — `ADD COLUMN kode_biaya varchar(50)`, `id_mitra SET DEFAULT 0` (sentinel 0 = global), ganti constraint jadi `UNIQUE(kode_biaya, id_mitra)`
- [ ] `t_area` — `ADD COLUMN pbjt double precision NOT NULL DEFAULT 0` (PBJT-TL per daerah)
- [ ] `t_connector_detail` — `ADD COLUMN kelas_layanan varchar(20)` + `CHECK (kelas_layanan IN ('normal','fast','ultra_fast'))`
- [ ] Seed `t_biaya` (4 baris): `layanan_normal=0`, `layanan_fast=25000`, `layanan_ultra_fast=57000`, `admin_platform=1500` (jenis `pertransaksi`, `id_mitra=0`)
- [ ] Migrasi nilai PBJT: pindahkan `t_setting.pbjt` (live = 3) ke `t_area.pbjt` untuk seluruh area
- [ ] Verifikasi: `\d` ketiga tabel + `SELECT * FROM t_biaya` + `SELECT id_area, pbjt FROM t_area`

## 3. Satu sumber angka — `fn_biaya_transaksi`

- [ ] Tulis ulang membaca: `t_biaya` (kode_biaya), `t_connector_detail` (harga_perkwh, kelas_layanan), `t_area.pbjt`, `t_setting.ppn`
- [ ] Hapus PJU (`v_pju`) dan ketergantungan `t_tarif_layanan` / `t_biaya_platform`
- [ ] Buat helper satuan `backend/src/utils/units.js` (`kwhToWh`, `whToKwh`) dan pakai di semua jalur baca/tulis energi
- [ ] Terapkan basis pajak: PBJT = biaya energi setelah diskon; DPP = energi + biaya platform + biaya layanan (TANPA pbjt); PPN = 11% × DPP
- [ ] Terapkan pembulatan half-up tiap komponen rupiah + grand_total

## 4. Integrasi endpoint (kontrak mobile additive)

- [ ] `getharga` — panggil `fn_biaya_transaksi`, kembalikan quote server (harga efektif, potongan, komponen, total)
- [ ] `getharga` — baca PBJT per area via `id_area`, bukan `global.gpbjt` (hapus ketergantungan boot)
- [ ] `simpanorder` — hitung ulang di server, IGNORE angka klien (`grand_total`, `jumlah`, `total`, `ppn`, `pbjt`, `pju`, `biaya_lain`), tulis kolom snapshot (harga normal, potongan, kelas, biaya layanan/platform)
- [ ] Flutter — rilis menyesuaikan: pakai quote server, hapus hitung lokal + ganti `toInt()` (truncate) jadi half-up

## 5. Admin CRUD + UI

- [ ] CRUD `t_biaya` (+ override `t_besar_biaya`) di dashboard
- [ ] Form konektor: field `kelas_layanan` (normal / fast / ultra_fast)
- [ ] Form area: field `pbjt` (persen); retire tarif PBJT global di Setting
- [ ] (tunda) pemberdayaan jalur harga member `t_jenismember` — dorman sampai kebutuhan nyata

## 6. Pembersihan (fase lanjut, setelah kode tidak merujuk)

- [ ] Hapus field `pbjt` dari halaman **Setting** dashboard — nilainya sudah
      tidak dipakai (PBJT-TL kini per area di `t_area.pbjt`). Setting global
      hanya menyisakan `ppn`.
- [ ] Deprecate lalu drop `t_chargebox.pju` — **baru boleh** setelah rilis
      Flutter yang tidak lagi membaca `pju` terpasang di pengguna
      (lihat `applications/mobile/TODO_MOBILE_BILLING.md` §C.3). Rilis tersebut
      belum dibuat.
- [ ] Hapus tabel mati: `t_access`, `t_user_access`, `t_fasilitas`, `t_besar_pajak`, `t_detail_biaya`, `t_transaction2`, `t_transaction_detail2`, `t_log`, `t_log_ebike`, `t_member`
- [ ] Putuskan duplikasi `t_berita` vs `berita`

## Sub-keputusan terbuka (tidak menghalangi, putuskan saat eksekusi)

- [ ] Nama kolom energi: pertahankan `*_kwh` berisi Wh + helper (default), atau rename ke `*_wh`
- [ ] Plafon tarif PBJT-TL mengikuti Perda setempat (validasi pada form area)
- [ ] Jadwal drop kolom `t_chargebox.pju` dan tabel mati (§6)
---

## 7. Promo mitra (ATPM / Hotel / Asuransi) — barter, tanpa settlement

> **Rencana kerja bertahap (kontrak API → backend → admin GUI → portal mitra →
> mobile) ada di `TODO-PROMO.md`.** Dokumen ini menyimpan keputusan skema dan
> alasan desainnya; `TODO-PROMO.md` menyimpan urutan eksekusi dan status.

Rujukan skema: `backend/database/migrations/2026-10-27_promo_terpadu.sql`
(belum dieksekusi; sudah diuji fungsional dalam BEGIN … ROLLBACK).
File lama `2026-10-21_atpm_promo.sql` SUPERSEDED, jangan dijalankan.

Model: mitra menanggung budget promosi, EZ Charge menampilkan iklan di aplikasi
mobile/website. Tidak ada aliran uang ke EZ Charge, jadi tidak ada tabel
settlement/invoice mitra.

### 7.1 Skema (sudah ditulis, menunggu eksekusi)

- [ ] Terapkan `2026-10-27_promo_terpadu.sql` (butuh `2026-10-23_biaya_charge.sql` sudah jalan — SUDAH)
- [ ] Tabel baru: `t_promo_mitra`, `t_portal_user`, `t_promo`, `t_promo_iklan`,
      `t_promo_iklan_tayang`, `t_user_kendaraan`, `t_promo_peserta`, `t_promo_pemakaian`
- [ ] Kolom snapshot promo di `t_transaction`: `id_promo`, `kode_promo`,
      `id_peserta_promo`, `potongan_perkwh`, `potongan_rupiah`, `harga_normal_satuan`,
      `biaya_admin`, `biaya_layanan`, `kelas_layanan`, `pbjt_persen`, `dpp`
- [ ] Fungsi: `fn_promo_validasi`, `fn_promo_pakai`, `fn_promo_batal`,
      `fn_biaya_transaksi` v2 (parameter `p_kode_promo` opsional)
- [ ] View: `v_promo_ringkas`, `v_promo_iklan_tayang_hari_ini`

### 7.2 Hubungan dengan item 3 (fn_biaya_transaksi)

`fn_biaya_transaksi` v2 di migrasi promo SUDAH memuat seluruh keputusan §2
(PBJT per area, DPP, PPN, tanpa PJU) **plus** promo. Bila item 3 dikerjakan
terpisah, jangan tulis dua fungsi berbeda: pakai v2 dan biarkan
`p_kode_promo` bernilai NULL untuk transaksi tanpa promo.

- [ ] Putuskan: item 3 dikerjakan dari migrasi promo (disarankan) atau paralel
- [ ] Bila paralel, pastikan signature akhir tetap 6 argumen (p_kode_promo terakhir)

### 7.3 Backend

- [ ] `getharga` — terima `kode_promo` (opsional), panggil `fn_biaya_transaksi`
      dengan kode tersebut, kembalikan komponen promo + `promo_alasan`
- [ ] `simpanorder` — hitung ulang dengan promo, tolak bila `grand_total` klien
      tidak cocok; tulis snapshot promo ke `t_transaction`
- [ ] Klaim budget HANYA saat order tersimpan (`fn_promo_pakai`), bukan saat quote.
      Quote berulang tidak boleh menggerus budget.
- [ ] Batalkan klaim saat order kedaluwarsa/gagal bayar/refund (`fn_promo_batal`)
- [ ] Endpoint iklan: daftar iklan layak tayang + pencatat impresi
      (`v_promo_iklan_tayang_hari_ini`, `t_promo_iklan_tayang`)
- [ ] Endpoint portal mitra (login + daftar peserta) — auth terpisah dari admin
- [ ] Registrasi kendaraan pengguna (dibutuhkan cek ATPM); saat ini
      `t_user_mobile` tidak menyimpan data kendaraan

### 7.4 Dashboard admin

- [ ] CRUD `t_promo_mitra` (jenis: atpm/hotel/asuransi/lainnya, alamat, koordinat)
- [ ] CRUD `t_promo` (kode, periode, budget rupiah, tipe potongan, batas per user,
      butuh_peserta, cek_kendaraan)
- [ ] Upload iklan + `maks_tayang_per_hari` per materi
- [ ] Monitoring: sisa budget, persen terpakai, jumlah peserta, jumlah transaksi
- [ ] CRUD peserta promo (manual oleh admin, di samping portal mitra)

### 7.5 Portal mitra (hotel/asuransi)

- [ ] Login `t_portal_user` (email + password, role operator/admin_mitra)
- [ ] Input email/no_hp tamu/pelanggan → `t_promo_peserta`
- [ ] Daftar peserta + status pemakaian (read-only)
- [ ] Guard: portal hanya bisa menyentuh peserta milik mitranya sendiri

### 7.6 Mobile (Flutter) — lihat `applications/mobile/TODO_MOBILE_BILLING.md`

Rincian teknis, lokasi file/baris, dan gate deploy ada di TODO mobile.
Ringkas:

- [ ] Field kode promo pada layar pembelian energi + tombol terapkan/hapus
- [ ] Tampilkan potongan, `potongan_dibatasi`, dan `promo_alasan` dalam bahasa pengguna
- [ ] Slot iklan promo di homepage (dari endpoint iklan, catat impresi per pengguna)
- [ ] Pakai quote server (`quote.total`) + half-up, bukan hitungan lokal
- [ ] Status kendaraan terdaftar di profil (opsional; ATPM daftar via endpoint)

**GATE:** mobile tidak boleh di-build/deploy sebelum billing server + alur promo
selesai bersamaan. Lihat §E di TODO mobile.

### 7.7 Keputusan bisnis (SUDAH DITETAPKAN 2026-10-27)

Semua sudah diterapkan di `2026-10-27_promo_terpadu.sql`:

- [x] **#1 Budget tidak cukup** -> potong sebagian sampai sisa budget, transaksi
      tetap sah. `fn_promo_validasi` mengembalikan `potongan_dibatasi = true`.
      Hanya `BUDGET_HABIS` (sisa 0) yang menolak.
- [x] **#2 ATPM** -> wajib DUA syarat sekaligus: peserta terdaftar DAN merek
      kendaraan cocok. Merek diwakili `t_promo_mitra.id_mitra_promo`
      (jenis `atpm`), bukan kolom merek terpisah.
- [x] **#3 Data kendaraan** -> diisi ATPM lewat `fn_kendaraan_daftar(email,
      kode_promo)`. Satu panggilan mencatat merek + keanggotaan promo.
      Idempoten; `sumber = 'atpm_endpoint'`.
- [x] **#4 Batas tayang iklan** -> per pengguna (`fn_promo_iklan_untuk_user`).
      `v_promo_iklan_tayang_hari_ini` tetap GLOBAL untuk monitoring admin.
- [x] **#5 Satu kode promo per transaksi** -> ditegakkan
      `t_promo_pemakaian.no_trans UNIQUE`. Rincian alasan ada di §13 file migrasi.
- [x] **#6 Sisa budget** -> `t_promo.kebijakan_sisa` = `hangus` | `rollover`.
      Rollover butuh `id_promo_lanjutan`; pemindahan lewat
      `fn_promo_tutup_periode`, dicatat di `t_promo_rollover`.

### 7.8 Temuan saat menyiapkan migrasi (WAJIB DIBACA saat eksekusi)

- [x] `fn_biaya_transaksi` SUDAH ADA di DB live (4 argumen) dan sudah dipakai
      `controller-chargebox.js` + `controller-transaction.js`.
      Migrasi promo men-DROP versi lama lalu membuat versi 7 argumen yang
      **kompatibel mundur** (4 parameter & 14 kolom hasil pertama identik).
      Tanpa DROP, PostgreSQL menyimpan dua overload dan pemanggilan 4 argumen
      akan memilih yang lama sehingga promo tidak pernah dihitung.
- [ ] Saat eksekusi: pastikan `getharga`/`simpanorder` memakai 7 argumen
      (`..., p_id_user, p_tanggal, p_kode_promo`) agar promo ikut dihitung.
- [ ] Backend belum mengirim `kode_promo`; perlu perubahan kode (item 7.3).

### 7.9 Urutan eksekusi migrasi (PENTING)

Urutan wajib:

  1. `2026-10-23_biaya_charge.sql`   (sudah dijalankan)
  2. `2026-10-23_fn_biaya_transaksi.sql` (sudah dijalankan; versi 4 argumen)
  3. `2026-10-23_cleanup_dead_tables.sql` (bila dijalankan)
  4. `2026-10-27_promo_terpadu.sql`  (TERAKHIR; men-DROP versi 4 argumen)

Bila langkah 2 dijalankan ulang SETELAH langkah 4, akan ada dua overload
`fn_biaya_transaksi` dan pemanggilan 4 argumen gagal dengan
"function ... is not unique" -> getharga/simpanorder error.

Pemulihan: jalankan ulang `2026-10-27_promo_terpadu.sql`. File itu idempoten;
DROP FUNCTION di awal menghapus overload lama. Sudah diuji (skenario C gagal,
skenario D pulih).
