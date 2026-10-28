# API Contract — Fitur Promo EZ Charge

Versi: 1.0 · Tanggal: 2026-10-27 · Status: **draf untuk disetujui**
Fase: 1 dari `TODO-PROMO.md`

Dokumen ini adalah **acuan tunggal** untuk backend, admin GUI, portal mitra, dan
mobile. Backend mengimplementasikan dokumen ini; bila implementasi perlu
menyimpang, dokumen ini yang direvisi lebih dulu, bukan kode.

Rujukan keputusan: `TODO-PROMO.md` Fase 0 (§0.A siklus klaim budget, §0.B).

---

## 1. Konvensi umum

### 1.1 Bentuk respons
Mengikuti `src/utils/response.js` yang sudah dipakai:

```json
{ "success": true,  "message": "Berhasil", "data": { } }
{ "success": false, "message": "Alasan gagal", "data": null }
```

Daftar memakai `paginated()` bila ada paging:

```json
{ "success": true, "message": "Berhasil", "data": [ ],
  "pagination": { "page": 1, "limit": 25, "total": 40, "totalPages": 2 } }
```

### 1.2 Tipe data
| Jenis | Aturan | Contoh |
|---|---|---|
| Rupiah | **integer**, rupiah penuh, sudah dibulatkan server | `57890` |
| Persen | number desimal, bukan string | `3`, `11`, `2.5` |
| Periode | `date` `YYYY-MM-DD` | `"2026-11-01"` |
| Waktu audit | ISO 8601 | `"2026-10-27T08:15:00.000Z"` |
| kWh | number desimal | `20`, `7.5` |
| Boolean | JSON boolean asli, bukan `0/1` | `true` |

Catatan: tabel `t_promo*` menyimpan `boolean` dan `double precision`; controller
**wajib** mengonversi ke aturan di atas sebelum mengirim. Jangan meneruskan
`0/1` atau string numeric mentah ke klien.

### 1.3 Kode promo
- Selalu dikirim dan disimpan **UPPERCASE**
- Pola: `^[A-Z0-9_-]{3,30}$`
- Server meng-`upper(btrim())` input sebelum validasi; klien boleh mengirim
  huruf kecil
- Unik global (satu kode = satu promo)

### 1.4 Penomoran halaman
`?page=1&limit=25`. `limit` maksimum 100. Default 25.

---

## 2. Autentikasi & otorisasi

Tiga jenis token, **tidak boleh saling tertukar**:

| Konteks | Header | Middleware | Scope data |
|---|---|---|---|
| Admin EZ Charge | `Authorization: Bearer <token admin>` | `requireRole(1,2)` | semua |
| Portal mitra | `Authorization: Bearer <token portal>` | middleware baru `portalAuth` | hanya `id_mitra_promo` milik akun |
| Mobile pengguna | `Authorization: Bearer <token mobile>` | `mobileTokenAuth` | hanya data pengguna itu |
| ATPM (M2M) | `X-Api-Key: <api key>` | middleware baru `atpmAuth` | hanya mitra pemilik key |

**Aturan keras:** token admin **tidak** berlaku di endpoint portal, dan token
portal **tidak** berlaku di endpoint admin. Endpoint portal wajib menyaring
setiap query dengan `id_mitra_promo` dari token, bukan dari parameter request.
Parameter `id_mitra_promo` di body/query **diabaikan** bila dikirim portal.

---

## 3. Katalog alasan promo (`promo_alasan`)

Nilai ini berasal dari `fn_promo_validasi` dan **wajib** diteruskan apa adanya
ke klien. Klien yang menerjemahkan ke bahasa pengguna.

| Kode | Arti | Bisa terjadi saat |
|---|---|---|
| `KODE_KOSONG` | kode tidak diisi | quote/order |
| `KODE_TIDAK_DITEMUKAN` | kode tidak ada | quote/order |
| `PROMO_NONAKTIF` | `aktif = false` | quote/order |
| `BELUM_MULAI` | tanggal < `tanggal_mulai` | quote/order |
| `KEDALUWARSA` | tanggal > `tanggal_selesai` | quote/order |
| `BUKAN_PESERTA` | pengguna tidak terdaftar di `t_promo_peserta` | quote/order |
| `KENDARAAN_TIDAK_COCOK` | ATPM: merek kendaraan tidak cocok | quote/order |
| `MIN_KWH_TIDAK_TERPENUHI` | kWh < `min_kwh` | quote/order |
| `BATAS_PEMAKAIAN` | sudah mencapai `maks_pemakaian_per_user` | quote/order |
| `BUDGET_HABIS` | sisa budget ≤ 0 | quote/order |
| `NILAI_POTONGAN_NOL` | potongan terhitung 0 | quote/order |
| `KLAIM_GAGAL` | **baru**: budget habis saat klaim pasca-bayar | konfirmasi bayar |

`KLAIM_GAGAL` tidak pernah muncul di quote. Ia dicatat di server untuk laporan
eksposur (§0.A lapis 3), dan bila memungkinkan dikirim ke klien lewat status
transaksi.

Aturan: bila `potongan_rupiah = 0` padahal `kode_promo` dikirim, `promo_alasan`
**wajib** berisi salah satu kode di atas. Klien tidak boleh menebak.

---

## 4. Endpoint Admin — Mitra Promo

Prefix: `/admin/promo-mitra` · Role: `[1,2]`

### 4.1 `GET /admin/promo-mitra`
Query: `?jenis_mitra=atpm|hotel|asuransi|lainnya&aktif=true|false&q=<cari nama/kode>`

```json
{
  "success": true, "message": "Berhasil",
  "data": [
    {
      "id_mitra_promo": 1,
      "jenis_mitra": "atpm",
      "kode": "BYD",
      "nama": "BYD Indonesia",
      "alamat": "Jakarta",
      "latitude": "-6.2000000",
      "longitude": "106.8166667",
      "kontak_nama": "Budi",
      "kontak_email": "promo@byd.example",
      "kontak_hp": "08120000000",
      "aktif": true,
      "jumlah_promo": 3,
      "created_at": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

### 4.2 `POST /admin/promo-mitra`
Body (wajib: `jenis_mitra`, `kode`, `nama`):

```json
{
  "jenis_mitra": "atpm",
  "kode": "BYD",
  "nama": "BYD Indonesia",
  "alamat": "Jakarta",
  "latitude": "-6.2000000",
  "longitude": "106.8166667",
  "kontak_nama": "Budi",
  "kontak_email": "promo@byd.example",
  "kontak_hp": "08120000000"
}
```

Respons `201`: `{ success: true, message: "Mitra dibuat", data: { id_mitra_promo } }`

Error:
- `400` `jenis_mitra` tidak valid
- `409` kode sudah dipakai

### 4.3 `PUT /admin/promo-mitra/:id`
Body sama, semua opsional. `kode` boleh diubah selama belum dipakai promo aktif
(rekomendasi: tolak bila ada promo aktif).

### 4.4 `DELETE /admin/promo-mitra/:id`
Nonaktifkan (`aktif = false`). **Bukan** hard delete bila sudah punya promo.
Respons: `{ success: true, message: "Mitra dinonaktifkan" }`
Error `409` bila masih ada promo aktif milik mitra ini.

---

## 5. Endpoint Admin — Promo

Prefix: `/admin/promo` · Role: `[1,2]`

### 5.1 `GET /admin/promo`
Query: `?aktif=&jenis_mitra=&q=&page=&limit=`
Sumber data: view `v_promo_ringkas`.

```json
{
  "success": true, "message": "Berhasil",
  "data": [
    {
      "id_promo": 1,
      "kode_promo": "BYD2026",
      "nama": "BYD EV Owner 2026",
      "jenis_mitra": "atpm",
      "nama_mitra": "BYD Indonesia",
      "tipe_potongan": "per_kwh",
      "nilai_potongan": 600,
      "budget_rupiah": 1000000,
      "budget_terpakai": 12000,
      "sisa_budget": 988000,
      "persen_terpakai": 1.2,
      "tanggal_mulai": "2026-10-17",
      "tanggal_selesai": "2026-11-26",
      "aktif": true,
      "kebijakan_sisa": "hangus",
      "id_promo_lanjutan": null,
      "jumlah_peserta": 1,
      "jumlah_transaksi": 2,
      "total_potongan": 12000
    }
  ]
}
```

### 5.2 `GET /admin/promo/:id`
Detail lengkap + daftar iklan + ringkasan peserta.

### 5.3 `POST /admin/promo`
Body:

```json
{
  "kode_promo": "BYD2026",
  "id_mitra_promo": 1,
  "nama": "BYD EV Owner 2026",
  "deskripsi": "Potongan untuk pemilik kendaraan BYD",

  "tipe_potongan": "per_kwh",
  "nilai_potongan": 600,
  "maks_potongan": 200000,
  "min_kwh": 0,
  "maks_kwh": null,

  "budget_rupiah": 1000000,
  "kuota_kwh": null,
  "maks_pemakaian_per_user": 3,

  "tanggal_mulai": "2026-10-17",
  "tanggal_selesai": "2026-11-26",
  "kebijakan_sisa": "hangus",
  "id_promo_lanjutan": null,

  "butuh_peserta": true,
  "cek_kendaraan": true,
  "prioritas": 100,
  "aktif": true
}
```

Validasi server (wajib, bukan hanya klien):

| Aturan | Pesan |
|---|---|
| `kode_promo` cocok `^[A-Z0-9_-]{3,30}$` setelah uppercase | "Kode promo hanya huruf, angka, _ dan - (3-30 karakter)" |
| `kode_promo` unik | "Kode promo sudah dipakai" |
| `tipe_potongan` ∈ `per_kwh`,`persen`,`nominal` | "Tipe potongan tidak valid" |
| `nilai_potongan` > 0 | "Nilai potongan harus lebih dari 0" |
| `budget_rupiah` > 0 | "Budget wajib diisi" |
| `tanggal_selesai` >= `tanggal_mulai` | "Periode tidak valid" |
| `kebijakan_sisa` = `rollover` → `id_promo_lanjutan` boleh null saat dibuat, tetapi harus diisi sebelum tutup periode | (divalidasi saat tutup) |
| `id_promo_lanjutan` ≠ `id_promo` sendiri | "Promo lanjutan tidak boleh dirinya sendiri" |
| `id_mitra_promo` ada & aktif | "Mitra tidak ditemukan" |

Catatan `cek_kendaraan`: hanya boleh `true` bila `jenis_mitra = 'atpm'`.
Alasannya: data kendaraan (`t_user_kendaraan`) terikat ke merek = mitra ATPM.
Tolak dengan "Cek kendaraan hanya untuk mitra ATPM".

### 5.4 `PUT /admin/promo/:id`
Sama seperti POST, dengan tambahan aturan:

- `budget_rupiah` **tidak boleh** < `budget_terpakai` → `409` "Budget tidak
  boleh lebih kecil dari yang sudah terpakai"
- `id_mitra_promo` **tidak boleh** diubah bila sudah ada pemakaian → `409`
- `kode_promo` **tidak boleh** diubah bila sudah ada pemakaian → `409`
  (alasan: kode lama sudah beredar di iklan/pesan ke pengguna)

### 5.5 `DELETE /admin/promo/:id`
Nonaktifkan (`aktif = false`). Tidak menghapus data historis.

### 5.6 `POST /admin/promo/:id/tutup-periode`
Menjalankan `fn_promo_tutup_periode`.

Body: `{ "tanggal": "2026-11-27" }` (opsional, default `CURRENT_DATE`)

```json
{
  "success": true,
  "message": "Sisa budget dipindahkan ke promo lanjutan",
  "data": {
    "status": "ROLLOVER",
    "id_promo_asal": 1,
    "id_promo_tujuan": 4,
    "jumlah": 100000
  }
}
```

Nilai `status` yang mungkin: `ROLLOVER`, `HANGUS`, `BELUM_BERAKHIR`,
`TIDAK_ADA_SISA`, `LANJUTAN_BELUM_DITETAPKAN`, `SUDAH_DITUTUP`, `SIKLUS`,
`PROMO_TIDAK_DITEMUKAN`.

Pemetaan HTTP: `ROLLOVER`/`HANGUS` → `200`. Sisanya → `409` kecuali
`PROMO_TIDAK_DITEMUKAN` → `404`.

---

## 6. Endpoint Admin — Iklan Promo

### 6.1 `GET /admin/promo/:id/iklan`

```json
{
  "success": true, "message": "Berhasil",
  "data": [
    {
      "id_iklan": 1,
      "id_promo": 1,
      "foto": "promo-byd-01.jpg",
      "judul": "Promo BYD",
      "target_url": null,
      "maks_tayang_per_hari": 2,
      "tanggal_mulai": "2026-10-17",
      "tanggal_selesai": "2026-11-26",
      "urutan": 0,
      "aktif": true,
      "tayang_hari_ini": 1
    }
  ]
}
```

`foto` = **nama file saja**. URL lengkap dibentuk klien dari base
`/spklu/dashboard/uploads/promo/`.

### 6.2 `POST /admin/promo/:id/iklan`
`multipart/form-data`: `foto` (file), `judul`, `maks_tayang_per_hari`,
`tanggal_mulai`, `tanggal_selesai`, `urutan`, `target_url`.

Upload memakai `controller-upload.js`. **Perlu menambah folder** ke whitelist
`FOLDERS` di `controller-upload.js`: `'promo'`. Tanpa itu upload jatuh ke
`chargebox` secara diam-diam.

### 6.3 `PUT /admin/promo-iklan/:id` · `DELETE /admin/promo-iklan/:id`
Ubah / nonaktifkan.

---

## 7. Endpoint Admin — Peserta Promo

### 7.1 `GET /admin/promo/:id/peserta`
Query: `?status=active&q=`

```json
{
  "success": true, "message": "Berhasil",
  "data": [
    {
      "id_peserta": 2,
      "id_user": 8,
      "email": "ariefsumaila@gmail.com",
      "no_hp": "0812xxxx",
      "vin": null,
      "status": "active",
      "tanggal_mulai": "2026-10-17",
      "tanggal_selesai": "2026-11-26",
      "sumber": "atpm_endpoint",
      "created_at": "2026-10-27T08:00:00.000Z"
    }
  ]
}
```

`sumber` diturunkan: `id_portal_user` null & `id_user` terisi → `atpm_endpoint`
atau `admin`; `id_portal_user` terisi → `portal`.

### 7.2 `POST /admin/promo/:id/peserta`
Body: `{ "email": "...", "no_hp": "...", "id_user": null, "vin": null,
"status": "active", "tanggal_mulai": null, "tanggal_selesai": null }`

Minimal satu dari `email`/`no_hp`/`id_user`. Server mengisi `id_user` otomatis
bila `email`/`no_hp` cocok dengan `t_user_mobile` (agar validasi lebih cepat),
tetapi **tidak wajib** — peserta boleh didaftarkan sebelum pengguna mendaftar
akun.

### 7.3 `DELETE /admin/promo-peserta/:id`
Hapus peserta (hard delete aman karena `t_promo_pemakaian.id_peserta` ON DELETE
SET NULL).

### 7.4 `GET /admin/promo/:id/pemakaian`
Ledger untuk audit:

```json
{
  "data": [
    { "no_trans": "1793000000000", "id_user": 8, "kwh": 20,
      "harga_normal": 2466, "potongan_perkwh": 600, "harga_efektif": 1866,
      "potongan_rupiah": 12000, "status": "aktif",
      "created_at": "2026-10-27T09:00:00.000Z" }
  ]
}
```

### 7.5 `GET /admin/promo/eksposur`
**Baru**, untuk §0.A lapis 3. Daftar transaksi yang dibayar dengan diskon tetapi
klaim budget gagal.

```json
{
  "data": [
    { "no_trans": "...", "kode_promo": "BYD2026", "id_user": 8,
      "potongan_rupiah": 12000, "alasan": "KLAIM_GAGAL",
      "created_at": "..." }
  ],
  "ringkasan": { "jumlah_transaksi": 3, "total_rupiah": 36000 }
}
```

---

## 8. Endpoint Portal Mitra

Prefix: `/portal` · Auth: token portal (`portalAuth`)

### 8.1 `POST /portal/login`
Body: `{ "email": "...", "password": "..." }`

```json
{
  "success": true, "message": "Berhasil",
  "data": {
    "token": "eyJ...",
    "id_mitra_promo": 2,
    "nama_mitra": "Hotel Ubud Resort",
    "jenis_mitra": "hotel",
    "role": "operator"
  }
}
```

Error `401` "Email atau password salah". Tidak membocorkan mana yang salah.

Password disimpan sebagai hash (`t_portal_user.password_hash`). Algoritma
disepakati saat implementasi (rekomendasi: bcrypt, cost 10).

### 8.2 `GET /portal/promo`
Hanya promo milik mitra ini. Bentuk data sama dengan `GET /admin/promo` tetapi
tanpa field internal (`prioritas` boleh disembunyikan).

### 8.3 `GET /portal/promo/:id/peserta`
Error `404` "Promo tidak ditemukan" bila `id_promo` bukan milik mitra ini —
**bukan** `403`, agar tidak membocorkan keberadaan promo mitra lain.

### 8.4 `POST /portal/promo/:id/peserta`
Body: `{ "email": "...", "no_hp": "...", "catatan": "Kamar 204" }`

Dukungan **massal** (front office hotel butuh input cepat):

```json
{ "peserta": [
    { "email": "tamu1@example.com", "no_hp": "0812..." },
    { "email": "tamu2@example.com" }
  ] }
```

Respons menyertakan hasil per baris:

```json
{
  "success": true, "message": "2 dari 3 peserta ditambahkan",
  "data": {
    "berhasil": [ { "id_peserta": 10, "email": "tamu1@example.com" } ],
    "gagal": [ { "email": "tamu3@example.com", "alasan": "SUDAH_TERDAFTAR" } ]
  }
}
```

### 8.5 `DELETE /portal/peserta/:id`
Hanya peserta milik promo mitra ini.

---

## 9. Endpoint ATPM (M2M)

Prefix: `/atpm` · Auth: `X-Api-Key`

### 9.1 `POST /atpm/kendaraan`
Body: `{ "email": "...", "kode_promo": "..." }`

```json
{
  "success": true, "message": "Terdaftar",
  "data": { "ok": true, "status": "TERDAFTAR", "id_user": 8,
            "id_mitra_promo": 1, "id_peserta": 2 }
}
```

Status yang mungkin (dari `fn_kendaraan_daftar`): `TERDAFTAR`, `EMAIL_KOSONG`,
`KODE_KOSONG`, `KODE_TIDAK_DITEMUKAN`, `BUKAN_PROMO_ATPM`,
`USER_TIDAK_DITEMUKAN`.

Pemetaan HTTP: `TERDAFTAR` → `200`; `KODE_TIDAK_DITEMUKAN` → `404`;
`BUKAN_PROMO_ATPM` → `403`; sisanya `400`.

Idempoten: memanggil ulang tidak menggandakan baris.

### 9.2 API key per mitra — **KEPUTUSAN: satu key per mitra**

Disimpan di `t_promo_mitra` (bukan tabel terpisah):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `api_key_hash` | varchar(255) | hash sha256, UNIQUE — satu key satu mitra |
| `api_key_last_used` | timestamp | diisi setiap key dipakai, untuk deteksi key mati |

Aturan:
- Plaintext key **hanya ditampilkan sekali** saat dibuat/di-reset
- Key dikirim lewat header `X-Api-Key`, dicocokkan dengan hash
- Mitra tanpa `api_key_hash` → `401` "API key tidak valid"
- Rotasi: generate ulang menimpa hash lama (key lama langsung mati)

Endpoint pengelolaan (admin):
- `POST /admin/promo-mitra/:id/api-key` — generate/reset, respons berisi
  plaintext **sekali**
- `DELETE /admin/promo-mitra/:id/api-key` — cabut akses

Tidak perlu tabel `t_promo_mitra_api_key` selama kebutuhan hanya satu key per
mitra. Bila nanti butuh beberapa key (mis. ATPM punya beberapa sistem), baru
dibuat tabel terpisah dan kolom ini dimigrasikan.

---

## 10. Endpoint Mobile — Quote & Order

### 10.1 `POST /chargebox/getharga` (perubahan, additive)
Body lama + satu field opsional:

```json
{
  "chargebox_id": "EZ81920",
  "connector_id": 1,
  "id_user": 8,
  "jml_kwh_order": 20,
  "kode_promo": "BYD2026"
}
```

`kode_promo` opsional. Bila tidak dikirim atau kosong, perilaku **identik**
dengan sekarang (kompatibel mundur).

Respons: struktur `data` lama dipertahankan, blok `quote` diperluas:

```json
{
  "success": true, "message": "Berhasil",
  "data": {
    "price_per_kwh": 1866,
    "price_per_duration": 0,
    "ppn": 11,
    "pbjt": 3,
    "listFeeBeforePpn": [ { "kode_biaya": "admin_platform",
                            "nama_biaya": "Biaya Platform",
                            "besar_biaya": 1500,
                            "jenis_biaya": "pertransaksi" } ],
    "quote": {
      "kwh": 20,
      "harga_normal": 2466,
      "potongan_perkwh": 600,
      "harga_efektif": 1866,
      "biaya_energi": 37320,
      "pbjt_persen": 3, "pbjt": 1120,
      "biaya_platform": 1500, "biaya_layanan": 0, "kelas_layanan": null,
      "dpp": 38820, "ppn_persen": 11, "ppn": 4270,
      "total": 44210,

      "id_promo": 1,
      "kode_promo": "BYD2026",
      "nama_promo": "BYD EV Owner 2026",
      "nama_mitra": "BYD Indonesia",
      "potongan_rupiah": 12000,
      "potongan_dibatasi": false,
      "id_peserta": 2,
      "promo_alasan": null
    },
    "chargebox": { }
  }
}
```

Field promo (`id_promo` … `promo_alasan`) **selalu ada**, berisi `null`/`0` bila
tidak ada promo. Klien tidak perlu menebak keberadaan field.

### 10.2 `POST /transaction/simpanorder` (perubahan)
Body: tambah `kode_promo` (opsional). Field rupiah dari klien **diabaikan**
sudah menjadi perilaku sekarang.

Perilaku dengan promo:

| Kondisi | Perilaku |
|---|---|
| `kode_promo` kosong | seperti sekarang, tanpa promo |
| valid | order dibuat dengan `grand_total` berdiskon, snapshot promo disimpan |
| tidak valid | **order tetap dibuat tanpa promo**, respons menyertakan `promo_alasan` |

Contoh respons saat promo berubah di antara quote dan order:

```json
{
  "success": true,
  "message": "Order dibuat tanpa promo: kuota promo sudah habis",
  "data": { "no_trans": "...", "grand_total": 57890,
            "promo_dipakai": false, "promo_alasan": "BUDGET_HABIS" }
}
```

Ini sesuai keputusan §2.4: tanpa `quote_id`, tetapi klien diberi tahu alasannya
agar bisa menampilkan pesan.

### 10.3 Klaim budget (internal, bukan endpoint)
Dipicu oleh konfirmasi pembayaran, bukan oleh klien:

- callback gateway (`callback.routes.js`) → `fn_promo_pakai`
- `paywithsaldo` → `fn_promo_pakai`
- gagal → catat `KLAIM_GAGAL`, transaksi tetap sah

---

## 11. Endpoint Mobile — Iklan Promo

### 11.1 `GET /promo/iklan`
Auth: token mobile. Memakai `fn_promo_iklan_untuk_user(id_user)`.

```json
{
  "success": true, "message": "Berhasil",
  "data": [
    {
      "id_iklan": 1,
      "id_promo": 1,
      "kode_promo": "BYD2026",
      "nama_promo": "BYD EV Owner 2026",
      "nama_mitra": "BYD Indonesia",
      "foto_url": "https://energy.edifly-si.com/spklu/dashboard/uploads/promo/promo-byd-01.jpg",
      "judul": "Promo BYD",
      "target_url": null,
      "urutan": 0,
      "masih_bisa_tayang": true
    }
  ]
}
```

`foto_url` dibentuk **server** (bukan klien) agar mobile tidak perlu tahu base
path. `masih_bisa_tayang` false tetap dikirim agar klien bisa berhenti
menampilkan tanpa perlu tahu aturannya.

### 11.2 `POST /promo/iklan/:id/tayang`
Catat satu impresi.

```json
{ "success": true, "message": "Dicatat",
  "data": { "id_iklan": 1, "tayang_hari_ini": 1, "maks_tayang_per_hari": 2 } }
```

Idempoten tidak diperlukan: satu panggilan = satu impresi. Klien wajib
memanggil **hanya** saat iklan benar-benar terlihat, bukan saat data diterima.

---

## 12. Alur lengkap tiga skenario

### 12.1 ATPM
```
1. Admin  POST /admin/promo-mitra            {jenis_mitra: atpm, kode: BYD, ...}
2. Admin  POST /admin/promo                  {kode_promo: BYD2026, cek_kendaraan: true, ...}
3. Admin  POST /admin/promo/1/iklan          (multipart foto + maks_tayang_per_hari)
4. ATPM   POST /atpm/kendaraan               {email, kode_promo}
             -> t_user_kendaraan + t_promo_peserta terisi
5. Mobile GET  /promo/iklan                  -> iklan tampil, POST .../tayang
6. Mobile POST /chargebox/getharga           {..., kode_promo}
             -> quote.potongan_rupiah terisi
7. Mobile POST /transaction/simpanorder      {..., kode_promo}
             -> grand_total berdiskon, snapshot tersimpan
8. Bayar  (gateway callback)                 -> fn_promo_pakai, budget berkurang
9. Sesi tutup                                -> ledger final
10. Admin GET /admin/promo/1                 -> sisa budget benar
```

### 12.2 Hotel
Sama, tetapi langkah 4 diganti:
```
4. Portal POST /portal/login                 -> token portal
   Portal POST /portal/promo/2/peserta       {email/no_hp tamu}
```

### 12.3 Asuransi
Identik dengan hotel, `jenis_mitra = asuransi`.

---

## 13. Perubahan skema — SUDAH DIMASUKKAN ke migrasi (2026-10-27)

Ditemukan saat menulis kontrak, sudah masuk `2026-10-27_promo_terpadu.sql`
dan **diuji** (`BEGIN…ROLLBACK`, EXIT=0):

- [x] `t_promo_mitra.api_key_hash` varchar(255) UNIQUE + `api_key_last_used`
      — satu key per mitra (keputusan: 1 key, bukan tabel terpisah)
- [x] `t_promo_pemakaian.status` menerima `'gagal_klaim'`
- [x] `t_promo_pemakaian.alasan` varchar(30) — alasan klaim gagal
- [x] `fn_promo_klaim_gagal(...)` — catat eksposur tanpa mengubah budget
- [x] view `v_promo_eksposur`
- [x] index `idx_promo_pemakaian_gagal`
- [ ] `controller-upload.js` — tambah `'promo'` ke `FOLDERS`
      (**kode**, bukan migrasi; dikerjakan di Fase 2)

Bukti uji: key duplikat ditolak, mitra boleh tanpa key, klaim normal `aktif`,
klaim gagal `gagal_klaim` + alasan, status palsu ditolak, view eksposur hanya
memuat `gagal_klaim`, `fn_promo_batal` tidak menyentuh baris `gagal_klaim`.

---

## 14. Checklist verifikasi kontrak

Kontrak dianggap disetujui bila:

- [ ] Setiap endpoint punya contoh request **dan** response
- [ ] Katalog `promo_alasan` lengkap dan tidak ada nilai lain yang mungkin muncul
- [ ] Aturan auth portal (guard `id_mitra_promo`) disepakati
- [ ] Keputusan §9.2 (API key: kolom atau tabel) diambil
- [ ] Perubahan skema §13 disetujui untuk masuk migrasi yang sama
- [ ] Tim mobile menyatakan `quote` versi ini cukup untuk membangun §D
- [ ] Tidak ada endpoint yang "menyusul" tanpa masuk dokumen ini lebih dulu
