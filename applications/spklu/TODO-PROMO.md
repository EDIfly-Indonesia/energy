# TODO — Fitur Promo EZ Charge (bertahap)

Dibuat: 2026-10-27 · Diperbarui: 2026-10-27 (sesi 2)

Status ringkas:

| Fase | Status |
|---|---|
| 0. Keputusan | ✅ selesai (5 keputusan ditutup) |
| 1. Kontrak API | ✅ selesai — `API-PROMO.md` |
| 2.1 Migrasi & fungsi | ✅ dieksekusi ke DB live + smoke test |
| 2.2 Integrasi biaya (getharga/simpanorder) | ✅ selesai + uji HTTP |
| 2.3 Klaim budget saat bayar | ✅ selesai + uji E2E |
| 2.4 CRUD & portal | ✅ selesai + uji 44/44 |
| 2.5 Test backend | ✅ suite permanen, 89 test lulus |
| 3. GUI Admin | ✅ selesai, 5 halaman + QA 25 cek |
| 4. Portal Mitra | ✅ selesai, QA 23 cek + 89 test backend |
| 5. Mobile Flutter | ✅ selesai (D.1–D.4), 135 test + 19 cek kontrak |
| 6. Rilis | ✅ selesai — v1.2.5 (code 34) live |

**FASE 0–6 SELESAI. Fitur promo live di v1.2.5.**
Tersisa opsional: D.5 (status kendaraan di profil) dan drop `t_chargebox.pju`
setelah v1.2.5 benar-benar terpasang di pengguna.

Rujukan:
- `KEPUTUSAN-BIAYA-CHARGE.md` — formula biaya
- `TODO-BIAYA-CHARGE.md` §7 — skema promo, §7.7 keputusan bisnis, §7.9 urutan migrasi
- `backend/database/migrations/2026-10-27_promo_terpadu.sql` — skema + fungsi (**sudah dieksekusi** 2026-10-27, sha256 `903de303…`)
- `applications/mobile/TODO_MOBILE_BILLING.md` §D — sisi mobile

---

## Prinsip urutan

```
Kontrak API  →  Backend  →  Admin GUI  →  Portal Mitra  →  Mobile  →  Rilis
```

Alasannya:

1. **Kontrak dulu, bukan backend dulu.** Kontrak adalah keputusan desain; kalau
   ditulis setelah backend, ia hanya mendokumentasikan apa yang terlanjur jadi.
   Kontrak yang disepakati lebih dulu membuat backend bisa diuji terhadap
   sesuatu yang objektif.
2. **Backend sebelum GUI.** Admin tidak bisa membuat promo kalau endpoint-nya
   belum ada.
3. **GUI sebelum mobile.** Tanpa GUI, satu-satunya cara membuat kode promo
   adalah INSERT manual ke DB. Mobile tidak akan punya data untuk diuji.
4. **Portal mitra sebelum mobile.** Skenario hotel/asuransi bergantung pada
   peserta yang didaftarkan mitra. Tanpa portal, skenario itu tidak bisa
   diverifikasi ujung ke ujung.
5. **Mobile terakhir.** Mobile mengonsumsi semuanya; mengerjakannya lebih awal
   berarti membangun di atas kontrak yang masih berubah.

Setiap fase harus **selesai dan terverifikasi** sebelum fase berikutnya dimulai.
Tidak ada fase yang "dikerjakan paralel" kecuali kontrak (yang memang dokumen).

---

## FASE 0 — Keputusan (SUDAH DITUTUP 2026-10-27)

- [x] **Kapan budget diklaim:** saat **pembayaran terkonfirmasi**, dan ledger
      difinalkan saat sesi charge ditutup.
      Konsekuensi: quote **bukan reservasi**. Lihat §0.A di bawah.
- [x] **Refund saat promo terpakai:** refund mengembalikan porsi energi saja.
      Potongan promo **tidak** dikembalikan ke budget mitra, kecuali sesi
      dibatalkan seluruhnya (`fn_promo_batal`).
- [x] **`kelas_layanan` NULL** = `normal` (biaya 0), konsisten dengan
      `fn_biaya_transaksi` live.
- [x] **`quote_id`:** fase awal tidak dipakai. `simpanorder` mengembalikan
      alasan bila promo berubah; klien menampilkan pesan.
- [x] **Kuota kWh vs budget rupiah:** budget rupiah **wajib**, kuota kWh
      opsional (pembatas tambahan).

### 0.A Implikasi keputusan klaim budget — WAJIB DIBACA

Karena budget baru diklaim saat pembayaran terkonfirmasi, bukan saat order
dibuat, maka:

1. **Quote bersifat saran, bukan jaminan.** Antara pengguna menekan "Bayar" dan
   pembayaran terkonfirmasi, budget mitra bisa habis dipakai transaksi lain.
2. **Nominal pembayaran sudah terlanjur berdiskon.** Payment gateway menagih
   `grand_total` yang sudah memuat potongan. Bila saat konfirmasi budget tinggal
   lebih kecil, selisihnya **ditanggung EZ Charge**, bukan ditagih ulang ke
   pengguna.

Mitigasi yang dipakai (tiga lapis, murah dan tidak melanggar keputusan):

- **Lapis 1 — cek saat `simpanorder` (baca saja, tanpa klaim).** Bila budget
  sudah habis pada saat order dibuat, tolak lebih awal dengan `BUDGET_HABIS`
  agar pengguna tidak terlanjur membayar. Ini pengecekan, bukan klaim, jadi
  tidak bertentangan dengan keputusan.
- **Lapis 2 — klaim atomik saat konfirmasi.** `fn_promo_pakai` memakai satu
  `UPDATE ... WHERE budget_terpakai + x <= budget_rupiah`, jadi dua pembayaran
  bersamaan tidak bisa melampaui budget. Bila gagal, potongan dianggap 0 dan
  transaksi tercatat **tanpa promo**, tetapi nominal yang sudah dibayar tetap.
  Selisih dicatat sebagai beban EZ Charge.
- **Lapis 3 — laporan eksposur.** Tambah laporan "potongan gagal diklaim"
  (transaksi yang dibayar dengan diskon tetapi budget tidak cukup) supaya
  besarnya bisa dipantau, bukan tersembunyi.

**Yang perlu diputuskan nanti (bukan sekarang):** bila eksposur ini ternyata
signifikan, opsi berikutnya adalah reservasi lunak berbatas waktu (klaim
sementara saat order, dilepas bila tidak dibayar dalam N menit). Itu melanggar
keputusan saat ini, jadi hanya dipertimbangkan bila data lapis 3 menunjukkan
kebutuhan.

### 0.B Siklus hidup klaim budget

```
quote        -> cek budget (fn_promo_validasi, read-only, tanpa klaim)
simpanorder  -> cek ulang (read-only) + simpan snapshot promo di t_transaction
                (kolom id_promo, kode_promo, potongan_rupiah, dst.)
bayar        -> KLAIM: fn_promo_pakai(no_trans, potongan_rupiah, kwh)
                gagal -> transaksi tanpa promo, selisih = beban EZ Charge
sesi tutup   -> finalisasi ledger; TIDAK ada penyesuaian kWh karena
                diskon dihitung dari kWh pesanan dan refund mengikuti §2.2
batal penuh  -> fn_promo_batal(no_trans): budget kembali
refund       -> hanya porsi energi; budget TIDAK kembali
```

Catatan: tidak perlu penyesuaian kWh saat sesi tutup. Diskon dihitung dari
`jml_kwh_order`, dan charging berhenti pada jumlah yang dipesan. Bila kurang,
refund mengikuti kebijakan §2.2 sehingga klaim budget tetap pada kWh pesanan.

---

## FASE 1 — Kontrak API ✅ SELESAI (2026-10-27)

Output: **`API-PROMO.md`** (dokumen terpisah, 21 KB). Ditulis sebelum kode
backend, sesuai keputusan.

Isi: konvensi umum, 3 jenis auth + guard portal, katalog 12 `promo_alasan`
(termasuk `KLAIM_GAGAL` baru), endpoint admin (mitra/promo/iklan/peserta/
pemakaian/eksposur), portal mitra, ATPM, mobile (quote/order/iklan), alur
lengkap 3 skenario, dan daftar perubahan skema yang dibutuhkan.

Dua hal ditemukan saat menulis kontrak yang **harus masuk migrasi yang sama**
sebelum dieksekusi:

- `t_promo_pemakaian.status` perlu nilai `gagal_klaim` + kolom `alasan`
- `t_promo_mitra` perlu `api_key_hash` untuk endpoint ATPM
- `controller-upload.js` perlu folder `promo` di `FOLDERS`

**Menunggu persetujuan** sebelum Fase 2 dimulai (checklist §14 di `API-PROMO.md`).

### 1.1 Aturan umum — rincian di `API-PROMO.md` §1
- [x] Semua endpoint admin memakai `Authorization: Bearer <token admin>` (pola
      yang sudah ada di `api.ts` dashboard: `spklu_token`).
- [x] Endpoint portal memakai token terpisah (bukan token admin), dengan scope
      terbatas pada `id_mitra_promo` milik akun itu.
- [x] Endpoint mobile memakai token mobile yang sudah ada.
- [x] Format respons mengikuti kebiasaan backend sekarang:
      `{ success, message, data }`.
- [x] Semua nominal rupiah = integer rupiah penuh (sudah dibulatkan server).
- [x] Semua persen dikirim sebagai angka desimal (`3`, `11`, `2.5`), bukan string.
- [x] Waktu: `date` untuk periode (`YYYY-MM-DD`), `timestamp` ISO untuk audit.

### 1.2 Endpoint admin — mitra promo
- [x] `GET /admin/promo-mitra` — daftar, filter `jenis_mitra`, `aktif`
- [x] `POST /admin/promo-mitra` — buat
- [x] `PUT /admin/promo-mitra/:id` — ubah
- [x] `DELETE /admin/promo-mitra/:id` — nonaktifkan (bukan hard delete bila
      sudah dipakai promo)
- [x] Field: `jenis_mitra`, `kode`, `nama`, `alamat`, `latitude`, `longitude`,
      `kontak_*`, `aktif`

### 1.3 Endpoint admin — promo
- [x] `GET /admin/promo` — daftar + ringkasan (`v_promo_ringkas`)
- [x] `GET /admin/promo/:id` — detail
- [x] `POST /admin/promo` — buat
- [x] `PUT /admin/promo/:id` — ubah (batasi: budget tidak boleh < terpakai)
- [x] `DELETE /admin/promo/:id` — nonaktifkan
- [x] Field inti: `kode_promo`, `id_mitra_promo`, `nama`, `deskripsi`,
      `tipe_potongan`, `nilai_potongan`, `maks_potongan`, `min_kwh`, `maks_kwh`,
      `budget_rupiah`, `kuota_kwh`, `tanggal_mulai`, `tanggal_selesai`,
      `maks_pemakaian_per_user`, `butuh_peserta`, `cek_kendaraan`,
      `kebijakan_sisa`, `id_promo_lanjutan`, `prioritas`, `aktif`
- [x] Validasi server (bukan hanya klien): kode unik & uppercase, periode valid,
      `nilai_potongan > 0`, `budget_rupiah > 0`
- [x] Endpoint khusus: `POST /admin/promo/:id/tutup-periode` →
      `fn_promo_tutup_periode` (hangus/rollover)

### 1.4 Endpoint admin — iklan promo
- [x] `GET /admin/promo/:id/iklan`
- [x] `POST /admin/promo/:id/iklan` — upload foto + `maks_tayang_per_hari`
- [x] `PUT /admin/promo-iklan/:id`, `DELETE /admin/promo-iklan/:id`
- [x] Upload memakai mekanisme `UploadField` yang sudah ada (folder baru
      `berita/promo` atau `promo`)

### 1.5 Endpoint admin — peserta promo
- [x] `GET /admin/promo/:id/peserta` — daftar + status
- [x] `POST /admin/promo/:id/peserta` — tambah manual (email/no_hp/id_user)
- [x] `DELETE /admin/promo-peserta/:id`
- [x] `GET /admin/promo/:id/pemakaian` — ledger pemakaian (audit)

### 1.6 Endpoint portal mitra (hotel / asuransi)
- [x] `POST /portal/login` — email + password → token portal
- [x] `GET /portal/promo` — daftar promo milik mitra ini
- [x] `GET /portal/promo/:id/peserta` — daftar peserta
- [x] `POST /portal/promo/:id/peserta` — daftar email/no_hp pelanggan
- [x] `DELETE /portal/peserta/:id`
- [x] **Guard wajib:** portal hanya bisa menyentuh data milik
      `id_mitra_promo`-nya. Ini titik keamanan paling rawan; harus ada test.

### 1.7 Endpoint ATPM (machine-to-machine)
- [x] `POST /atpm/kendaraan` — body `{ email, kode_promo }` →
      `fn_kendaraan_daftar`
- [x] Autentikasi: API key per ATPM (bukan token user). Perlu tabel/kolom baru
      atau pakai `t_portal_user` dengan role khusus.
- [x] **Keputusan:** apakah endpoint ini memakai API key statis per mitra atau
      kredensial portal yang sama. Rekomendasi: API key per mitra, disimpan
      sebagai hash.

### 1.8 Endpoint mobile — quote & order (perubahan)
- [x] `POST /chargebox/getharga` — tambah `kode_promo` (opsional) di body.
      Respons `quote` ditambah: `id_promo`, `kode_promo`, `nama_promo`,
      `potongan_rupiah`, `potongan_dibatasi`, `promo_alasan`
- [x] `POST /transaction/simpanorder` — tambah `kode_promo` (opsional)
- [x] Katalog `promo_alasan` (sudah ada di skema): `KODE_KOSONG`,
      `KODE_TIDAK_DITEMUKAN`, `PROMO_NONAKTIF`, `BELUM_MULAI`, `KEDALUWARSA`,
      `BUKAN_PESERTA`, `KENDARAAN_TIDAK_COCOK`, `MIN_KWH_TIDAK_TERPENUHI`,
      `BATAS_PEMAKAIAN`, `BUDGET_HABIS`, `NILAI_POTONGAN_NOL`
- [x] Aturan: `promo_alasan` **selalu** diisi bila potongan 0 padahal kode
      dikirim. Klien tidak boleh menebak.

### 1.9 Endpoint mobile — iklan
- [x] `GET /promo/iklan` — daftar iklan layak tayang untuk pengguna ini
      (`fn_promo_iklan_untuk_user`)
- [x] `POST /promo/iklan/:id/tayang` — catat satu impresi
- [x] Batas tayang dihitung **per pengguna** (keputusan #4)

**Selesai bila:** `API-PROMO.md` selesai, contoh request/response untuk setiap
endpoint ada, dan katalog error lengkap. Disetujui sebelum Fase 2 mulai.

---

## FASE 2 — Backend

### 2.1 Migrasi & fungsi
- [x] Revisi migrasi dengan 3 perubahan skema dari kontrak (API key,
      `gagal_klaim`, view eksposur) — sudah diuji `BEGIN…ROLLBACK`, EXIT=0
- [x] Verifikasi revisi: key duplikat ditolak, klaim gagal tercatat tanpa
      mengubah budget, `fn_promo_batal` tidak menyentuh baris `gagal_klaim`,
      test lama (26 kasus) tetap lulus
- [x] **Eksekusi** `2026-10-27_promo_terpadu.sql` ke DB live — **SELESAI
      2026-10-27**, `ON_ERROR_STOP=1`, EXIT=0, COMMIT. Backup skema:
      `/tmp/spklu_schema_before_promo.sql` (49 KB)
- [x] Verifikasi pasca-eksekusi: 7 tabel `t_promo*` ada, 6 fungsi `fn_promo*`,
      3 view, `fn_biaya_transaksi` **1 versi** (7 argumen), 4 kolom snapshot
      di `t_transaction`, `api_key_hash`/`api_key_last_used` ada,
      CHECK status memuat `gagal_klaim`
- [x] Smoke test live (`BEGIN…ROLLBACK`): quote tanpa promo tetap **57.890**,
      dengan promo jadi **44.210**, klaim budget mengurangi sisa ke 988.000,
      view ringkas & eksposur benar
- [x] Kompatibilitas API: `getharga` 4 argumen tetap jalan (total 57.890,
      tanpa field promo). `kode_promo` di body diabaikan sampai controller
      diubah (2.2)
- [ ] Pastikan `2026-10-23_fn_biaya_transaksi.sql` tidak dijalankan ulang
      (lihat `TODO-BIAYA-CHARGE.md` §7.9)
- [ ] `controller-upload.js` — tambah `'promo'` ke `FOLDERS`

### 2.2 Integrasi biaya ✅ SELESAI (2026-10-27)

- [x] `getharga` → `fn_biaya_transaksi($1,$2,$3,0,$4,CURRENT_DATE,$5)` dengan
      `id_user` + `kode_promo` (dari `req.body.kode_promo`, trim, null bila kosong)
- [x] `getharga` mengembalikan blok `quote` diperluas: `id_promo`, `kode_promo`,
      `nama_promo`, `nama_mitra`, `potongan_rupiah`, `potongan_dibatasi`,
      `id_peserta`, `promo_alasan` — **selalu ada**, null/0 bila tanpa promo
- [x] `simpanorder` → 7 argumen, tetap tolak bila `total <= 0`
- [x] `simpanorder` menulis 11 kolom snapshot promo ke `t_transaction`
- [x] `simpanorder` mengembalikan `promo_dipakai` + `promo_alasan`, dan
      `message` berbahasa manusia bila promo berubah ("Order dibuat tanpa promo: …")
- [x] `controller-upload.js` — `'promo'` ditambahkan ke `FOLDERS`

**Bukti uji lewat HTTP di VM (bukan asumsi):**

| Kasus | Hasil |
|---|---|
| `getharga` tanpa kode promo | total 57.890, semua field promo null/0 |
| `getharga` kode `NGAWUR` | total 57.890, `promo_alasan=KODE_TIDAK_DITEMUKAN` |
| `getharga` kode `BYD2026` | total **44.210**, potongan 12.000, `nama_mitra` terisi |
| `simpanorder` dengan promo | `promo_dipakai=true`, grand_total 44.210 |
| snapshot `t_transaction` | 11 kolom terisi benar (harga_normal 2.466, potongan 12.000, dpp 38.820) |
| budget setelah order | **belum terpakai** (1.000.000) — sesuai keputusan klaim saat bayar |
| `simpanorder` saat budget habis | order tetap dibuat, total 57.890, `promo_dipakai=false`, `BUDGET_HABIS` |

Data uji sudah dibersihkan: 0 mitra, 0 promo, 0 transaksi, 10 berita aktif.

### 2.3 Klaim & pelepasan budget ✅ SELESAI (2026-10-28)

**BUG DITEMUKAN & DIPERBAIKI SEBELUM PASANG**

`fn_promo_pakai` versi awal melakukan UPDATE budget dulu, baru INSERT ledger.
Pada retry callback (perilaku normal gateway), INSERT melanggar
`UNIQUE(no_trans)` dan fungsi **melempar exception**. Diuji di DB live:

- dalam transaksi: seluruh proses batal
- autocommit: budget TIDAK dobel (12.000, bukan 24.000) karena PL/pgSQL
  membungkus satu pemanggilan fungsi dalam transaksi implisit — tetapi
  callback gagal dan gateway akan retry terus

Perbaikan: `2026-10-28_promo_klaim_idempoten.sql` (sudah dieksekusi).
Urutan dibalik → `INSERT ... ON CONFLICT (no_trans) DO NOTHING` lebih dulu,
baru UPDATE budget. Bila budget tidak cukup, baris ledger dihapus sehingga
`no_trans` bisa dipakai `fn_promo_klaim_gagal`.

- [x] Migrasi perbaikan dieksekusi (sha256 `84312f4b…`), `CREATE OR REPLACE`
      saja, tanpa perubahan tabel
- [x] Verifikasi live: klaim 2× pada `no_trans` sama → `true` keduanya,
      budget tetap 12.000, ledger 1 baris
- [x] `src/services/promo.service.js` — `klaimPromo`, `lepasPromo`, `punyaPromo`
- [x] Klaim dipasang di **konfirmasi pembayaran**:
      - `controller-callback.js` → `callback.va` (VA/e-wallet)
      - `controller-transaction.js` → `paywithsaldo`
- [x] Klaim TIDAK PERNAH melempar error ke pemanggil (uang sudah diterima);
      semua kegagalan masuk log + `fn_promo_klaim_gagal`
- [x] `refund` — pembatalan PENUH melepas klaim; refund sebagian **tidak**
      menyentuh budget (keputusan §2.2), dengan log penjelas
- [x] `simpanorder` tetap tidak mengklaim (diverifikasi ulang di E2E)

**Bukti uji — service (14/14 lulus):**
belum dibayar tidak diklaim · klaim pertama · budget 12.000 · retry idempoten ·
budget tidak dobel · transaksi tak dikenal · klaim gagal saat budget habis ·
tercatat di `v_promo_eksposur` · budget tidak bertambah saat gagal ·
lepas klaim · budget berkurang 12.000 setelah lepas · lepas ulang idempoten ·
`punyaPromo` true/false

**Bukti uji — end-to-end lewat HTTP (10/10 lulus):**
order → `grand_total` 44.210, `promo_dipakai=true`, **budget masih 0** →
callback VA → **budget 12.000**, ledger aktif → callback RETRY →
tidak error, budget tetap 12.000, ledger tetap 1 baris

Sisa yang belum: job pembersih klaim menggantung (tidak mendesak — karena
klaim baru terjadi setelah bayar, tidak ada budget menggantung).

### 2.4 CRUD & portal ✅ SELESAI (2026-10-28)

Berkas baru di `backend/src/`:

| Berkas | Isi |
|---|---|
| `controllers/controller-admin-promo.js` | 21 handler: mitra, API key, promo, iklan, peserta, pemakaian, eksposur, tutup-periode |
| `controllers/controller-portal.js` | login portal, daftar promo, peserta (tunggal + massal), hapus |
| `controllers/controller-atpm.js` | middleware `X-Api-Key` + `POST /atpm/kendaraan` |
| `controllers/controller-mobile-promo.js` | daftar iklan + catat impresi |
| `middleware/portal-auth.js` | JWT scope `portal` + `signPortal` |
| `routes/portal.routes.js`, `atpm.routes.js`, `promo-mobile.routes.js` | registrasi |
| `server.js` | 3 route baru didaftarkan |

Keputusan implementasi yang perlu diketahui:

- **Token portal terpisah** (scope `portal`). `decodeAdmin` mensyaratkan scope
  `admin`, jadi token portal otomatis ditolak di endpoint admin — terverifikasi.
- **Guard portal** selalu memfilter `id_mitra_promo` dari TOKEN, tidak pernah
  dari body/query. Promo mitra lain → **404**, bukan 403, agar keberadaannya
  tidak bocor.
- **API key ATPM**: sha256, satu key per mitra, plaintext hanya di respons
  pembuatan. ATPM tidak bisa memakai kode promo mitra lain (403).
- **Validasi di server**, bukan hanya di form: kode unik & uppercase, periode,
  `cek_kendaraan` hanya untuk ATPM, budget tidak boleh < terpakai, kode & mitra
  terkunci setelah ada pemakaian.
- **Error validasi selalu HTTP 400**. Sempat salah: semua kegagalan validasi
  mengembalikan 200 karena `reply.send` dipanggil tanpa kode. Diperbaiki dengan
  helper `gagalValidasi`.
- **Batas tayang iklan dihitung per pengguna**, dan endpoint impresi menolak
  pencatatan ke-3 saat batas 2/hari — klien yang memanggil berulang tidak bisa
  menggembungkan angka.

**Bukti uji — 44/44 lulus lewat HTTP di VM:**

admin: buat mitra · duplikat 409 · jenis invalid 400 · list · buat promo ·
uppercase otomatis · kode pendek 400 · cek_kendaraan non-ATPM 400 ·
periode terbalik 400 · list + `sisa_budget` integer · detail · budget<terpakai 409 ·
tambah iklan · iklan tanpa foto 400 · list iklan · tambah peserta (id_user
otomatis) · peserta duplikat 409 · list peserta · buat API key · API key non-ATPM 400

ATPM: daftar kendaraan · retry idempoten · tanpa key 401 · kode mitra lain 403 ·
`t_user_kendaraan.sumber = atpm_endpoint`

portal: login salah 401 · login sukses · lihat promo sendiri · promo mitra lain 404 ·
input massal (2 berhasil, 2 gagal) · lihat peserta · hapus peserta mitra lain 404 ·
hapus peserta sendiri · token portal ditolak di admin 401

mobile: lihat iklan · `foto_url` dibentuk server · impresi 1, 2 · impresi ke-3
ditolak · iklan hilang dari daftar setelah batas

lain: tutup periode HANGUS · endpoint eksposur · endpoint pemakaian

Data uji dibersihkan: 0 mitra/promo/peserta/iklan/portal/kendaraan.
Produksi utuh: 10 berita, 2 chargebox, 1 user. Harga normal 57.890.

### 2.5 Test backend ✅ SELESAI (2026-10-28)

Skrip sekali pakai dari sesi sebelumnya diubah menjadi **suite permanen** di
`backend/test/`, memakai test runner bawaan Node (`node:test`) — tidak perlu
install dependensi apa pun.

```
backend/test/
  helpers.js            token admin/mobile, client HTTP, fixture, cleanup
  promo.db.test.js      24 test — fungsi SQL
  promo.api.test.js     42 test — endpoint HTTP
  promo.e2e.test.js     23 test — 3 skenario bisnis + callback asli
  run.js                runner (all | db | api | e2e)
  README.md             cara jalan + aturan keselamatan data
```

Perintah: `npm test` · `npm run test:db` · `npm run test:api` · `npm run test:e2e`

**Hasil: 89 test lulus, 0 gagal.**

| Suite | Cakupan |
|---|---|
| db (24) | `fn_promo_validasi` (10 kasus termasuk potong sebagian), idempotensi `fn_promo_pakai` (retry tidak dobel, ledger batal saat gagal), `fn_promo_klaim_gagal` + view eksposur, `fn_promo_batal` (aktif vs gagal_klaim), tutup periode (hangus/rollover/tanpa lanjutan/belum berakhir/tutup dua kali), iklan per pengguna, constraint (kode lowercase, api_key duplikat) |
| api (42) | Admin CRUD mitra/promo/iklan/peserta + validasi (duplikat 409, kode pendek 400, periode terbalik 400, budget<terpakai 409, cek_kendaraan non-ATPM 400), API key ATPM, ATPM daftar kendaraan (401/403/idempoten), portal (login, guard mitra 404, input massal, hapus), iklan mobile + batas impresi, tutup periode, eksposur, pemakaian |
| e2e (23) | **3 skenario lengkap** lewat HTTP: ATPM (admin→ATPM→iklan→quote→order→callback→budget), Hotel (portal daftar tamu→quote→bayar), Asuransi (potongan persen→bayar). Termasuk: budget belum terpakai setelah order, callback retry tidak dobel, snapshot transaksi, laporan sisa budget, non-peserta ditolak, kebijakan refund |

Aturan keselamatan data yang diterapkan:

- Semua data uji berprefix `TEST_` (promo) dan `TM_` (mitra)
- `cleanup()` hanya menghapus baris berprefix tersebut
- Test terakhir memverifikasi tidak ada sisa data uji
- Runner memaksa `--test-concurrency=1` (berbagi DB & prefix)
- `DB_HOST_POSTGRE=127.0.0.1` di-set runner, karena pm2 memakai nilai itu
  sementara `.env` berisi nama container yang tidak resolve dari host

Temuan yang dicatat di README agar tidak terulang:

- Jangan pakai `BEGIN…ROLLBACK` untuk test HTTP — server punya pool sendiri
- `DELETE` tanpa body tidak boleh memasang `Content-Type: application/json`
- Saat menambah tabel promo, tambahkan pembersihannya di `cleanup()` (urutan FK)

## FASE 3 — GUI Admin (dashboard React) ✅ SELESAI (2026-10-28)

5 halaman baru di `dashboard/src/pages/`, mengikuti pola yang sudah ada
(Modal + DataTable + UploadField + IntInput):

| Halaman | Route | Isi |
|---|---|---|
| `MitraPromo.tsx` | `/promo-mitra` | CRUD mitra, kelola API key ATPM (buat/reset/cabut), indikator pemakaian key |
| `Promo.tsx` | `/promo` | CRUD promo, progress bar budget berwarna (hijau→kuning→merah), tutup periode, kunci kode/mitra setelah ada pemakaian |
| `PromoIklan.tsx` | `/promo-iklan` | Pilih promo, upload/preview foto, batas tayang per hari, jumlah tayang hari ini |
| `PromoPeserta.tsx` | `/promo-peserta` | Pilih promo, daftar peserta + asal pendaftaran (admin/portal/ATPM), tambah manual, hapus |
| `PromoEksposur.tsx` | `/promo-eksposur` | Transaksi yang dibayar berdiskon tapi klaim budget gagal + total ditanggung EZ Charge |

Plus: 5 item menu di `Layout.tsx` (role `[1,2]`), 5 route di `App.tsx`.

### Keputusan UI yang penting

- **Budget ditampilkan sebagai progress bar**, bukan angka saja. Admin langsung
  melihat promo mana yang hampir habis tanpa menghitung.
- **Kode & mitra terkunci** (disabled + ikon gembok) saat promo sudah punya
  pemakaian, dengan penjelasan alasannya di form.
- **Cek merek kendaraan otomatis dinonaktifkan** bila mitra bukan ATPM, plus
  catatan kenapa.
- **API key ditampilkan sekali** dalam panel khusus setelah dibuat, dengan
  peringatan eksplisit agar disalin sekarang.
- **Eksposur dipisah jadi halaman sendiri** supaya angka yang ditanggung
  EZ Charge tidak tersembunyi di dalam laporan lain.

### Bug lama yang ditemukan & diperbaiki (ikut Fase 3)

`/berita` — halaman yang sudah ada sebelum pekerjaan promo — juga mengalami
**overflow horizontal di layar sempit**. Penyebabnya bukan halaman itu, tapi CSS
bersama: `.content` adalah flex item tanpa `min-width: 0`, sehingga tabel lebar
(DataTable dengan banyak kolom) melebarkan SELURUH halaman dan mendorong sidebar.

Perbaikan di `index.css`:
- `.content { min-width: 0 }` — flex item boleh menyusut
- `.datatable { overflow-x: auto }` — tabel lebar digulir di dalam kartu
- `@media (max-width: 720px)` — sidebar jadi bar horizontal di atas, konten
  memakai lebar penuh (sebelumnya sidebar 224px menyisakan ~376px)

Dampak: semua halaman (termasuk yang lama) kini `scrollWidth == clientWidth`
di 600px.

### Hasil uji

Build: `tsc && vite build` sukses (1946 modul). Publik: CSS baru terpasang
(`index-B-cte04g.css`), HTTP 200.

| Suite QA | Hasil |
|---|---|
| `qa/promo-qa.cjs` — buka 5 halaman baru, modal, menu sidebar, regresi 3 halaman lama | **9/9 lulus**, 0 error konsol |
| `qa/promo-qa2.cjs` — modal panjang bisa digulir sampai Simpan, semua field ada, responsif 600px | **4/4 lulus** |
| `qa/promo-qa3.cjs` — buat mitra & promo **lewat form**, verifikasi tersimpan di DB, muncul di halaman Iklan/Peserta | **5/5 lulus** |
| `qa/qa-run.cjs` — 7 halaman lama (chargebox, area, mitra, pengguna, transaksi, wallet, laporan) | **7/7 PASS** |
| Backend `npm test` (regresi) | **89/89 lulus** |

Catatan operasional yang ditemukan saat QA:

- `DELETE` di API promo adalah **soft delete** (`aktif=false`), jadi baris uji
  tetap ada setelah QA. Skrip QA memakai prefix `TM_` / `TEST_` agar bisa
  dibersihkan oleh `npm run test:db` di backend.
- `DELETE` tanpa body **tidak boleh** memasang `Content-Type: application/json`
  — Fastify menolaknya dan pembersihan gagal diam-diam. Ini sempat membuat
  data uji tertinggal dan sudah diperbaiki di skrip QA.

## FASE 4 — Portal Mitra (hotel / asuransi) ✅ SELESAI (2026-10-28)

**Keputusan: codebase sama, route terpisah.** Alasan: satu build, satu deploy,
nginx yang ada sudah melayani `/spklu/`. Tidak perlu infrastruktur baru.
Pemisahan dilakukan di tiga lapis:

1. **Route** `/portal/*` berada DI LUAR blok `RequireAuth` admin.
2. **Token** disimpan di key berbeda (`portal_token`, bukan `spklu_token`).
   Ini bukan kosmetik: bila memakai key yang sama, token portal akan terkirim
   ke endpoint admin, handler 401 admin menghapus sesi, dan front office
   ter-logout sendiri.
3. **Klien API terpisah** (`src/portal/portal-api.ts`) dengan redirect 401 ke
   `/portal/login`, bukan login admin.

Berkas baru di `dashboard/src/portal/`:

| Berkas | Isi |
|---|---|
| `portal-api.ts` | klien HTTP portal, key token sendiri, logout |
| `PortalLogin.tsx` | login email+password, tanpa captcha (rate limit 20/menit) |
| `PortalLayout.tsx` | sidebar sempit (hanya "Promo Saya"), nama + jenis mitra, logout |
| `PortalPromo.tsx` | daftar promo milik mitra + status periode (berjalan/belum/berakhir/nonaktif) |
| `PortalPeserta.tsx` | kelola peserta: input massal, daftar peserta, hapus |

### Fitur inti: input peserta massal

Front office hotel mendaftarkan banyak tamu saat check-in, jadi form-nya
berbasis **tempel daftar**, bukan satu form per tamu:

- satu baris = satu peserta; baris berisi `@` dibaca sebagai email, selain itu
  sebagai no. HP
- **pratinjau real-time**: jumlah baris, berapa email, berapa no. HP
- **peringatan baris ambigu**: baris seperti `abc def` tidak dikenali sebagai
  email maupun no. HP wajar, dan diberi tahu SEBELUM dikirim (backend akan
  tetap menyimpannya sebagai no_hp, jadi ini mencegah data sampah)
- hasil **per baris**: berapa berhasil, berapa ditolak + alasannya
  (`SUDAH_TERDAFTAR`, `EMAIL_ATAU_HP_KOSONG`, `GAGAL_SIMPAN`)
- daftar yang berhasil bisa dibuka (collapse) untuk verifikasi
- catatan opsional berlaku untuk semua baris (mis. "Check-in 28 Okt / Kamar 204")

### Bug yang ditemukan & diperbaiki saat QA

**Login salah password menampilkan "Gagal terhubung ke server".** Penyebab:
endpoint login mengembalikan 401, dan handler 401 di klien menganggapnya sesi
habis → redirect + throw, sehingga pesan aslinya hilang. Diperbaiki dengan
mengecualikan path `/portal/login` dari penanganan 401.

### Hasil uji

| Suite QA | Hasil |
|---|---|
| `qa/portal-qa.cjs` — login (salah & benar), isolasi mitra, input massal, validasi promo, akses lintas mitra via URL, token portal di endpoint admin, logout | **18/18 lulus** |
| `qa/portal-qa2.cjs` — responsif 600px (promo & peserta), sidebar jadi bar atas, regresi dashboard admin, sesi admin tidak tercemar token portal | **5/5 lulus** |
| `qa/qa-run.cjs` — 7 halaman lama | **7/7 PASS** |
| Backend `npm test` | **89/89 lulus** |

Bukti isolasi antar mitra (yang paling penting untuk keamanan):

- mitra A hanya melihat promonya; promo mitra B **tidak tampil**
- akses langsung ke `/portal/promo/<id milik mitra B>` → **"Promo Tidak Ditemukan"**
- token portal → endpoint admin = **401**
- token portal dihapus saat logout

Bukti alur bisnis: peserta yang didaftarkan front office lewat portal langsung
lolos `fn_promo_validasi` (`valid=true`, `alasan=null`) — artinya tamu hotel
bisa memakai kode promo di aplikasi mobile tanpa bantuan admin.

Catatan operasional: akun portal (`t_portal_user`) belum punya UI admin.
Pembuatannya masih lewat SQL (`INSERT` dengan `password_hash` sha256). Ini
perlu ditambahkan sebelum go-live, kalau tidak admin harus menyentuh DB setiap
kali ada hotel/asuransi baru.

## FASE 5 — Mobile Flutter ✅ SELESAI (2026-10-28)

Detail per berkas ada di `applications/mobile/TODO_MOBILE_BILLING.md` §D.

- [x] `Quote` menerima 8 field promo + `promoDipakai` / `promoDitolak`
- [x] `promo_alasan.dart` — 12 pesan bahasa pengguna, katalog dijaga test
- [x] `charging_flow_state.kodePromo`
- [x] `getHarga()` **dan** `_buildOrderData()` mengirim `kode_promo`
- [x] `terapkanPromo()` / `hapusPromo()` — kode baru menggantikan yang lama
- [x] Kartu kode promo di layar pembelian (input/Terapkan atau kode/Hapus)
- [x] Baris Harga normal + Potongan (nama promo), catatan `potonganDibatasi`,
      pesan penolakan berbahasa pengguna
- [x] Slot iklan di beranda + pencatatan impresi saat iklan terlihat
- [ ] D.5 status kendaraan di profil (opsional, belum)

**Hasil uji:** `flutter test` **135 lulus**, `dart analyze` 0 error,
`qa/mobile-contract-check.cjs` di VM **19 lulus** (bentuk respons server vs
parser klien).

**Bug layout ditemukan & diperbaiki:** `_buildInfoRow` overflow horizontal di
layar ~400px karena label panjang tidak fleksibel. Sekarang `Expanded` +
`Flexible`.

## FASE 6 — Rilis ✅ SELESAI (2026-10-28)

- [x] `versionCode` 33 → **34**, `versionName` 1.2.4 → **1.2.5**
- [x] `flutter build apk --release` — 84.827.409 byte
- [x] `publish-apk.sh` — sertifikat cocok, rilis lama dicadangkan ke
      `apk/backup/20261028-141518`
- [x] Entri `berita` untuk pengguna: "Versi 1.2.5 sudah tersedia"
- [x] Verifikasi publik: `version.json` 1.2.5/code 34, APK HTTP 200
      (84.827.409 byte), berita tampil di `/informasi/getberita_user`
- [ ] **Drop `t_chargebox.pju`** — TUNGGU v1.2.5 benar-benar terpasang di
      pengguna. Rilis baru diunggah hari ini; pengguna masih bisa memakai versi
      lama yang mungkin membaca kolom itu.

### Blocker yang ditutup sebelum rilis

Definition of done menuntut ketiga skenario bisa dijalankan **tanpa intervensi
SQL**. Kenyataannya akun portal (`t_portal_user`) belum punya UI admin —
membuatnya harus `INSERT` manual dengan hash sha256. Itu membuat skenario hotel
dan asuransi tidak bisa dijalankan admin biasa.

Ditambahkan sebelum rilis:

- `controller-admin-promo.js`: `listPortalUser`, `createPortalUser`,
  `updatePortalUser`, `deletePortalUser`. Password di-hash sha256 (sama dengan
  yang diverifikasi `controller-portal.js`), minimal 8 karakter, dan
  `password_hash` **tidak pernah** dikirim ke klien.
- `admin.routes.js`: 4 route `/admin/promo-mitra/:id/portal-user` dan
  `/admin/portal-user/:id`.
- `MitraPromo.tsx`: panel "Akun Portal" per mitra — buat akun, ganti password,
  aktif/nonaktifkan, hapus.

Bukti: `qa/portal-account-qa.cjs` **16/16 lulus** (termasuk akun nonaktif tidak
bisa login, password lama mati setelah diganti, riwayat peserta tetap ada
setelah akun dihapus), dan `qa/portal-ui-qa.cjs` **6/6 lulus** (akun dibuat
lewat form benar-benar bisa login ke portal).

### Temuan saat rilis: inbox pengguna penuh notifikasi uji

Ada **56 berita notifikasi** ("Pembayaran Sukses", "Menunggu Pembayaran
Charging") sisa transaksi uji sepanjang sesi. Transaksinya sudah dihapus, tetapi
notifikasinya tertinggal — pengguna akan melihat riwayat pembayaran yang tidak
pernah mereka lakukan. Dibersihkan sebelum rilis; inbox kini berisi 1 berita
rilis.

Catatan untuk ke depan: skrip QA yang membuat transaksi lewat API **wajib** ikut
menghapus baris `berita` dengan `no_trans` terkait, bukan hanya `t_transaction`.

### Verifikasi akhir

| Item | Hasil |
|---|---|
| `version.json` publik | 1.2.5, code 34, sha256 `ce9f435c…` |
| APK diunduh | HTTP 200, 84.827.409 byte, `application/vnd.android.package-archive` |
| Checksum lokal vs VM | **cocok** |
| Backend test | 89/89 lulus |
| Berita lewat endpoint aplikasi | tampil, `dibaca=false` |
| Data promo | 0 mitra/promo/peserta/iklan/portal/transaksi |
| Data produksi | 10 artikel, 2 chargebox, 1 user, 1 inbox |
| Harga normal | 57.890 (tidak berubah) |

---

## Dependensi & risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Quote bukan reservasi: budget habis antara order dan bayar | EZ Charge menanggung selisih diskon | Cek di `simpanorder` (lapis 1) + klaim atomik (lapis 2) + laporan eksposur (lapis 3), §0.A |
| `fn_biaya_transaksi` dobel overload | `getharga` error "not unique" | Jangan jalankan `2026-10-23_fn_biaya_transaksi.sql` setelah migrasi promo; guard sudah ada di migrasi |
| Portal mitra bocor data antar mitra | Kebocoran data pelanggan | Guard `id_mitra_promo` + test khusus (Fase 1.6, 2.5, 4) |
| Refund tidak konsisten dengan promo | Selisih uang | Keputusan §2.2 sudah final: refund energi saja, budget tidak kembali kecuali batal penuh |
| Mobile dirilis tanpa promo | Janji ke mitra tidak jalan, iklan tayang tanpa kode bisa dipakai | Gate rilis: mobile hanya deploy setelah Fase 2–4 selesai |
| Admin salah isi budget/nilai potongan | Potongan melebihi budget | Validasi server + peringatan UI (Fase 2.4, 3.2) |
| Migrasi jalan lalu butuh tambahan kolom | Migrasi kedua, risiko downtime | Tuntaskan `status = gagal_klaim` di migrasi yang sama sebelum eksekusi (§2.3) |

---

## Definition of done keseluruhan

Fitur promo dianggap selesai bila **ketiga skenario** bisa dilakukan ujung ke
ujung tanpa intervensi SQL:

1. **ATPM** — admin buat promo + iklan → ATPM kirim `{email, kode_promo}` →
   pengguna lihat iklan → masukkan kode → potongan muncul → bayar → budget
   berkurang → laporan sisa budget benar.
2. **Hotel** — admin buat promo → front office daftarkan tamu via portal →
   tamu masukkan kode → potongan → bayar.
3. **Asuransi** — sama dengan hotel, mitra mendaftarkan pelanggannya sendiri.

Plus: rollover/hangus berjalan di akhir periode, dan tidak ada budget
menggantung.
