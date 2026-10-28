# Keputusan Formula & Master Biaya Charging SPKLU

Tanggal: 2026-10-23
Status: Keputusan desain (TIDAK ada perubahan schema/DB yang dieksekusi dari dokumen ini).
Rujukan: `ANALISA_BIAYA_CHARGE_2026-10-21.md` (agent Flutter), `backend/database/migrations/2026-10-21_atpm_promo.sql`, kode live `controller-chargebox.js`, `controller-transaction.js`.

## 1. Ringkasan arah

1. Seluruh penghitungan tagihan dipindah dari klien (Flutter) ke SERVER, dengan satu
   fungsi sebagai sumber angka (`fn_biaya_transaksi`) yang dipakai `getharga` (quote)
   dan `simpanorder` (pencatatan) sekaligus.
2. `t_biaya` menjadi master seluruh biaya tambahan (additive), dikelola admin.
   Pajak TIDAK masuk `t_biaya`.
3. PBJT atas Tenaga Listrik (PBJT-TL) menggantikan PPJ/PJU (UU No. 1/2022, UU HKPD).
   PJU dihapus dari model. Tarif PBJT bersifat daerah dan dipindah ke `t_area`.

## 2. Formula billing final

Urutan dan rumus terkunci (contoh memakai angka simulasi):

| # | Komponen | Rumus | Contoh |
|---|---|---|---|
| 1 | Energi (kWh) | input / terpakai (dari Wh metering ÷1000) | 50 |
| 2 | Harga normal / kWh | `t_connector_detail.harga_perkwh` (atau member `t_jenismember.biaya_perkwh` bila hidup) | 2466 |
| 3 | Potongan / kWh | promo/member; default 0 | 166 |
| 4 | Harga efektif / kWh | `(2) − (3)` | 2300 |
| 5 | Biaya energi (sub total) | `(4) × (1)` | 115000 |
| 6 | PBJT-TL | `pbjt_tl_area × (5)` — basis = biaya energi setelah diskon | 3450 |
| 7 | Biaya platform | `kode_biaya='admin_platform'` | 1500 |
| 8/9 | Biaya layanan | `kode_biaya='layanan_<kelas>'` (satu dari normal/fast/ultra_fast) | 57000 |
| 10 | Dasar Pengenaan Pajak (DPP) | `(5) + (7) + (8|9)` — TANPA pbjt | 173500 |
| 11 | PPN | `11% × (10)` | 19085 |
| 12 | Total (grand_total) | `(5) + (6) + (7) + (8|9) + (11)` | 196035 |

Catatan:
- PJU/PPJ DIHAPUS (terintegrasi ke PBJT-TL per UU HKPD). `t_chargebox.pju` dinyatakan
  usang; tidak dipakai lagi di perhitungan.
- DPP tidak memuat PBJT (PBJT menggantikan PPN atas jasa tersebut — tidak saling
  mengkonsumsi basis).

## 3. Model pajak

- PPN: nasional, 11%, di `t_setting.ppn`. Basis = DPP (energi + biaya platform +
  biaya layanan), TANPA pbjt.
- PBJT-TL: daerah, tarif per `t_area` (dipindah dari `t_setting.pbjt` global).
  Basis = biaya energi setelah diskon. "Kena PBJT" diturunkan dari `area.pbjt > 0`.
  Nama keputusan yang dipakai: tarif disimpan sebagai **persen**.
- Implikasi: `getharga`/`fn_biaya_transaksi` membaca tarif PAJAK saat request (per
  area), bukan dari variabel boot global (`global.gpbjt`).

## 4. Satuan energi

- Penyimpanan kanonik: **Wh**. Alasan: meter OCPP/non-OCPP dan `t_transaction_detail`
  mengeluarkan Wh; `jml_kwh_order` adalah `integer` (menyimpan kWh menghilangkan
  desimal).
- Penghitungan/quote: **kWh** (`double`).
- Satu helper terpusat (baru) `backend/src/utils/units.js`:
  - `kwhToWh(kwh) = Math.round(kwh * 1000)`
  - `whToKwh(wh) = wh / 1000`
- Semua jalur baca/tulis energi WAJIB lewat helper ini (menutup kelas bug "terbaca
  sebagai kWh, salah 1000×").
- Billing energi dihitung dari Wh asli: `terpakaiWh / 1000 × harga_efektif`, baru
  dibulatkan rupiah (bukan membulatkan kWh dulu).

## 5. Aturan pembulatan

- Hitung penuh (double) di server.
- Setiap komponen rupiah (biaya energi, pbjt, biaya platform, biaya layanan, ppn)
  dibulatkan ke rupiah terdekat (half-up) SEBELUM dijumlah.
- `grand_total` = penjumlahan (sudah bulat). Dilarang truncate (`toInt()` di Flutter
  memotong, harus diganti half-up).

## 6. Master biaya (`t_biaya`)

Ketepatan terkunci:

1. `id_mitra` dipertahankan. **Sentinel 0 = global** (berlaku semua mitra). Override
   ada di `t_besar_biaya`.
2. Tambah kolom `kode_biaya` (di samping `nama_biaya`) untuk resolusi kelas layanan.
3. `jenis_biaya` tetap mendukung `pertransaksi`, `perkwh`, `perjam`.
4. Pajak (ppn, pbjt-tl) TIDAK masuk `t_biaya`. PJU sudah dihapus.
5. Kosakata kelas layanan final: `normal` / `fast` / `ultra_fast`.

Seed master (acuan, bukan eksekusi):

| kode_biaya | nama_biaya | jenis_biaya | default_biaya | id_mitra |
|---|---|---|---|---|
| layanan_normal | Biaya Layanan Normal | pertransaksi | 0 | 0 |
| layanan_fast | Biaya Layanan Fast | pertransaksi | 25000 | 0 |
| layanan_ultra_fast | Biaya Layanan Ultra Fast | pertransaksi | 57000 | 0 |
| admin_platform | Biaya Platform | pertransaksi | 1500 | 0 |

`biaya_layanan` disimpan di `t_biaya` (lookup per `kode_biaya`), `t_connector_detail`
hanya menyimpan `kelas_layanan`; resolusi: `kelas_layanan='fast'` → `kode_biaya=
'layanan_fast'`. Override per scope tetap di `t_besar_biaya`.

## 7. Rancangan DDL (belum dieksekusi)

```sql
-- master biaya
ALTER TABLE t_biaya
  ADD COLUMN IF NOT EXISTS kode_biaya varchar(50),
  ALTER COLUMN id_mitra SET DEFAULT 0;               -- 0 = global
-- (id_mitra tetap NOT NULL; UNIQUE(kode_biaya, id_mitra) menggantikan UNIQUE(nama_biaya, id_mitra))

-- PBJT-TL per area
ALTER TABLE t_area ADD COLUMN IF NOT EXISTS pbjt double precision NOT NULL DEFAULT 0;

-- kelas layanan konektor
ALTER TABLE t_connector_detail ADD COLUMN IF NOT EXISTS kelas_layanan varchar(20);
ALTER TABLE t_connector_detail ADD CONSTRAINT t_connector_detail_kelas_ck
  CHECK (kelas_layanan IS NULL OR kelas_layanan IN ('normal','fast','ultra_fast'));
```

Catatan: `t_chargebox.pju` dijadwalkan DEPRECATED (bukan dihapus di sini). Pembersihan
kolom/tabel mati terpisah (lihat §10).

## 8. Perubahan kode yang dibutuhkan

1. `fn_biaya_transaksi` — ditulis ulang membaca: `t_biaya` (kode_biaya) +
   `t_connector_detail` (harga, kelas_layanan) + `t_area.pbjt` + `t_setting.ppn`.
   Hapus PJU; hapus ketergantungan `t_tarif_layanan`/`t_biaya_platform`.
2. `getharga` — panggil `fn_biaya_transaksi`, kembalikan quote server (harga efektif,
   potongan, komponen, total). Menambah field = additive (kontrak mobile tetap,
   rilis Flutter diperlukan).
3. `simpanorder` — hitung ulang di server dari quote; IGNORE angka klien
   (`grand_total`, `jumlah`, `total`, `ppn`, `pbjt`, `pju`, `biaya_lain`). Tulis
   kolom snapshot (harga normal, potongan, kelas, biaya layanan/platform).
4. `simpanorder` — server menentukan `status_transaksi` (bukan `grand_total==0` dari
   klien). Menutup celah "charging gratis".
5. Admin CRUD `t_biaya` (+ override `t_besar_biaya`) + form `kelas_layanan` pada
   konektor.

## 9. Tata kelola pajak (batas vs biaya)

- `t_biaya` = biaya tambahan flat/unit (additive) saja.
- PPN / PBJT-TL di luar `t_biaya` (persen dari basis tertentu).
- Jalur harga member (`t_jenismember.biaya_perkwh`) saat ini dorman (`t_member=0`,
  `t_jenismember=1`). Dibuka kembali hanya bila kebutuhan nyata; harga energi member
  tetap BUKAN bagian `t_biaya`.

## 10. Pembersihan (fase terpisah, bukan di dokumen ini)

Tabel yang TERVERIFIKASI tidak dirujuk kode aplikasi aktif (backend/src + dashboard/src = 0 hit):
`t_transaction2`, `t_transaction_detail2`, `t_detail_biaya`, `t_besar_pajak`,
`t_fasilitas`, `t_access`, `t_user_access`, `t_member`.
View `menu` (ACL legacy PHP) bergantung pada `t_access`/`t_user_access` dan harus
dihapus lebih dulu.

**KOREKSI analisa awal:** `t_log` dan `t_log_ebike` TIDAK mati — keduanya masih
ditulis runtime (`non_ocpp.js` `simpanlog()` → `INSERT INTO t_log`;
`ocpp/handle.js:48` → `INSERT INTO t_log_ebike`). JANGAN dihapus.

Duplikasi `t_berita` vs `berita`: keduanya dipakai untuk tujuan berbeda
(`t_berita` = artikel, `berita` = feed notifikasi mobile) — bukan duplikat, jangan digabung.

## 11. Sub-keputusan masih terbuka (tidak menghalangi)

1. Nama kolom energi: (a) pertahankan `*_kwh` berisi Wh + dokumentasi + helper
   (default), atau (b) rename ke `*_wh` (cleanup terpisah).
2. Batas atas tarif PBJT-TL mengikuti Perda setempat (UU HKPD memuat plafon) —
   tambah validasi saat form area.
3. Timing DROP kolom `t_chargebox.pju` dan tabel mati (§10) — jadwalkan di fase
   pembersihan setelah kode tidak lagi merujuknya.

## 12. Urutan eksekusi

1. Tutup celah `grand_total==0` (server menentukan status; grand_total dari quote).
2. Terapkan keputusan schema (§7) + seed `t_biaya`.
3. Bangun `fn_biaya_transaksi` sebagai satu sumber angka.
4. `getharga` → quote server; `simpanorder` → rekonsiliasi terhadap quote.
5. Bersihkan tabel mati + putuskan duplikat.
