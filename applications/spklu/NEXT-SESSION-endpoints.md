# Handoff — Perbaikan Bug Endpoint

Diperbarui: 2026-10-19 (sesi lanjutan). Status: **POST /chargebox/nearest SELESAI.**

## POST /chargebox/nearest — SELESAI (terverifikasi 20 tes)

Handler: `backend/src/controllers/controller-chargebox.js:6`
Schema: `backend/src/schemas/mobile.schema.js:42`

### Bug kode yang sudah diperbaiki

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | `limit` diabaikan total (tidak ada klausa `LIMIT`) | Default 50, dijepit 1..100, diikat sebagai `LIMIT $4` |
| 2 | `jml_konektor` keluar sebagai string `"3"` | `count(d.id)::int` → number |
| 3 | `connector[].status` selalu kosong | `LEFT JOIN konektor k` + `COALESCE(NULLIF(k.status,''), NULLIF(d.status,''))` |
| 4 | Kunci JSON salah ketik `conector_type` (tanpa `n`) | Diganti `connector_type` |

Catatan implementasi:

- `limit` non-numerik / < 1 → fallback 50; > 100 → dijepit 100. Nilai string
  (`"3"`) tetap dipakai karena di-`Number()`.
- Status live diambil dari tabel PostgreSQL `konektor` (ditulis
  `ocpp/handle.js` dan `configs/non_ocpp.js::updatestatuskonektor`), bukan dari
  `t_connector_detail.status` yang hanya atribut statis. UNIQUE
  `(chargebox_id, connector_id)` menjamin join tidak menggandakan baris.
- Bila konektor belum pernah melapor, `status` = `null` (tidak dikarang
  "Unavailable") — perilaku lama dipertahankan untuk data yang tidak ada.
- Ditambahkan `ORDER BY d.connector_id` di dalam `jsonb_agg` agar urutan
  konektor stabil.
- Semua kolom di `jsonb_build_object` sekarang ter-*qualify* (`d.`/`k.`) karena
  `konektor` juga punya kolom `connector_id` dan `status` (ambigu).
- `limit` didokumentasikan di `mobile.schema.js` agar muncul di Swagger.
- Envelope `{success,message,data}`, path, dan metode TIDAK berubah (API beku).
- **Breaking change:** kunci `conector_type` → `connector_type`. Klien mobile
  yang masih membaca `conector_type` harus disesuaikan.

### ⚠ BLOCKER: nilai live `connector_type` di luar daftar yang diizinkan

Nilai live saat ini **`"Type 2 AC"`** untuk kelima konektor, tetapi daftar
`CONNECTOR_TYPES` di dua tempat masih nilai lama:

- `dashboard/src/connectorTypes.ts`
- `backend/src/controllers/controller-admin-master.js`

Daftar saat ini: `AC Type 2 (Mennekes)`, `DC CCS2 (Combo 2)`, `DC CHAdeMO`.

Akibatnya (terverifikasi):

| Aksi | Hasil |
|---|---|
| UPDATE konektor, `connector_type` dipertahankan `"Type 2 AC"` | **DITERIMA** (via `sameAsStored`) |
| CREATE baru dengan `"Type 2 AC"` | **DITOLAK** — "Tipe konektor tidak valid" |
| CREATE baru dengan `"CCS2 DC"` | **DITOLAK** — "Tipe konektor tidak valid" |

Jadi mengubah opsi form saja TIDAK cukup: validasi backend akan memblokir
penyimpanan. Kedua daftar harus disamakan dengan nilai final yang disepakati.


### Ikon tipe konektor (SVG sendiri, direkonstruksi dari referensi PNG)

Lucide tidak punya ikon konektor AC/DC, jadi ikon dibuat sendiri. Referensi
visual ada di `dashboard/public/assets/images/`:

| Referensi | Isi |
|---|---|
| `ac.png` (500×500) | Housing Type 2 (atas rata) + 7 pin 2-3-2, gaya garis |
| `dc.png` (500×500) | Housing Type 2 kecil + pill DC berisi 2 pin besar (CCS2), gaya terisi |
| `connector.png` (40×43) | Ikon generik: housing + 7 pin + dasar dengan 2 kontak |

Hasil vektorisasi ada di `dashboard/src/assets/icons/`:

| File | viewBox | Isi |
|---|---|---|
| `connector-ac.svg` | `0 0 500 500` | housing busur r=209 + 12 lingkaran |
| `connector-dc.svg` | `0 0 500 500` | 4 path (2 keyline + 2 badan) + 9 lingkaran |
| `connector-generic.svg` | `0 0 40 43` | dipakai untuk placeholder "Pilih Tipe" |

Kesetiaan geometri diukur, bukan dikira-kira: SVG dirender pada ukuran referensi
lalu mask-nya dibandingkan dengan kanal alpha PNG (IoU). Hasil: **AC 92,5%,
DC 92,0%, generik 52,8%** (yang generik rendah karena referensinya hanya 40×43 —
di bawah resolusi untuk pencocokan presisi).

Dipakai lewat `dashboard/src/components/ConnectorIcon.tsx`:

```tsx
<ConnectorIcon value="AC" size={24} />      // menu
<ConnectorIcon value="" size={24} />        // placeholder → ikon generik
<ConnectorIcon value={x} fallback={false} />  // null kalau tidak dikenal
```

Catatan penting:

- **Impor `?raw` + render INLINE, jangan `<img>`.** SVG yang dimuat `<img>`
  adalah dokumen terpisah: `currentColor` di dalamnya TIDAK mewarisi warna CSS
  dari luar dan ikon tampil hitam di tema gelap. Ini sudah terbukti saat
  pengujian (ikon hitam saat masih memakai `<img>`).
- Karena di-inline, file harus ada di `src/assets/` — file di `public/` tidak
  bisa diimpor dari JS oleh Vite.
- **`value` kosong (`''`) adalah kunci sah** untuk ikon generik. Jangan pakai
  cek falsy (`value ? ... : ...`) — string kosong akan terbuang dan placeholder
  jatuh ke ikon Lucide `Plug`.
- Ukuran render: 24px di menu, 20px di trigger, wadah `.cts-icon` = `w-6`.
- `.cts-item` memakai `items-center` agar ikon setinggi 24px tetap seimbang
  terhadap label dua baris.
- Tinggi optik AC dan DC memang berbeda (DC dua bagian, jadi lebih tinggi).
  Itu faithful terhadap referensi — jangan "dirapikan" dengan menyeragamkan
  tinggi, karena akan merusak proporsi konektornya.
- Detail 7-pin berada di batas keterbacaan pada 24px. Itu konsekuensi wajar dari
  ikon sedetail itu; makna tetap tersampaikan lewat label AC/DC.

### Cara mengukur ulang kesetiaan ikon

`svg-iou.cjs` (di scratch) merender SVG pada ukuran referensi, mengambil
screenshot elemen (bukan halaman — kalau halaman, ukurannya beda dan IoU jadi
omong kosong), lalu membandingkan mask. Skrip ini juga menulis gambar diff:
putih = cocok, merah = hanya referensi, hijau = hanya SVG.

### Sublabel dropdown

`connectorTypes.ts` punya `ringkas` khusus untuk sub-baris dropdown
(mis. `Bolak-balik · 7–22 kW`). Jangan pakai `arus` untuk sublabel — sejak
nilainya disederhanakan menjadi `AC`/`DC`, `arus` sama persis dengan `value`
sehingga tampil sebagai duplikat ("AC / AC").

### ⚠ Placeholder konektor saat chargebox baru dibuat

Trigger `trg_tchargebox_ai` menyisipkan konektor #1 dengan **hanya**
`(chargebox_id, connector_id)` — `connector_type` dan `electric_power` NULL:

```sql
INSERT INTO t_connector_detail (chargebox_id, connector_id) VALUES (NEW.chargebox_id, 1);
```

Tujuannya agar chargebox tetap muncul di `/chargebox/nearest` (query memakai
INNER JOIN ke `t_connector_detail`). Konsekuensinya: sampai admin mengisi tipe
dan daya, endpoint mobile mengirim `connector_type: null` — melanggar kontrak
AC/DC. Perlu keputusan: beri default eksplisit di trigger, atau ubah `nearest`
menjadi LEFT JOIN lalu hapus auto-create.

### ⚠ acos() harus di-clamp — pernah membuat seluruh endpoint gagal

`/chargebox/nearest` dan `/informasi/getberita` menghitung jarak dengan
`6371 * acos(...)`. PostgreSQL melempar **`input is out of range`** bila argumen
`acos()` sedikit melebihi 1 — dan itu terjadi justru saat titik pencarian **sama
persis** dengan koordinat chargebox/berita (`cos²+sin²` bisa membulat jadi
`1.0000000000000002`). Kasus paling wajar: pengguna berdiri di lokasi charger
atau mencari koordinat chargebox-nya sendiri.

Akibatnya bukan satu baris hilang, tetapi **seluruh endpoint** mengembalikan
`{"success":false,"message":"Terjadi kesalahan"}` tanpa data apa pun.

Perbaikannya: bungkus argumen dengan `LEAST(1, GREATEST(-1, ...))`.

```sql
round((6371 * acos(LEAST(1, GREATEST(-1,
       cos(radians($1::double precision)) * cos(radians(c.lat::double precision))
     * cos(radians(c.lng::double precision) - radians($2::double precision))
     + sin(radians($3::double precision)) * sin(radians(c.lat::double precision))))))::numeric, 2) AS jarak
```

Saat mengedit SQL seperti ini, **hitung kurung secara programatik** — jangan
kira-kira. Menambah `LEAST(GREATEST(` menambah 2 kurung buka, dan salah hitung
menghasilkan `syntax error at or near "AS"` yang menutupi bug aslinya.
Regresi: `acos-clamp-test.cjs` (13 asersi, termasuk kutub dan antimeridian).

### Pesan error 400 harus bisa ditindaklanjuti

Global error handler dulu memetakan **semua** 400 menjadi
`"Permintaan tidak valid"`, sehingga body JSON yang salah sintaks tidak bisa
dibedakan dari field yang kurang — klien hanya bisa menebak. Sekarang:

| Kondisi | Pesan |
|---|---|
| JSON tidak valid (mis. koma berlebih) | `Body bukan JSON yang valid. Periksa sintaks JSON — koma berlebih sebelum "}" atau "]" adalah penyebab paling umum.` |
| Body kosong | `Body JSON kosong.` |
| Content-Type salah | `Content-Type tidak didukung. Gunakan application/json.` |
| Gagal validasi schema | `Permintaan tidak valid — <field>: <pesan>` |

Yang diungkap hanya informasi tentang **request klien sendiri**, bukan stack
trace, nama tabel, atau query. Prinsip SEC-09 tetap: error 5xx tetap
`"Terjadi kesalahan"`.

### Diagnostik auth: header `x-auth-error`

`/chargebox/nearest` (dan semua endpoint mobile bertoken) **mewajibkan**
`Authorization: Bearer <token>`. Tanpa token, body respons tetap
`{"success":false,"message":"invalid0"}` (kontrak mobile beku — jangan diubah),
tetapi kini ada header tambahan:

| `x-auth-error` | Arti |
|---|---|
| `missing-token` | Header `Authorization` tidak dikirim |
| `not-bearer` | Ada header tapi bukan skema `Bearer` |
| `invalid-or-expired-token` | Token salah, signature tidak cocok, atau kedaluwarsa |
| `missing-key-header` / `wrong-key-header` | Untuk endpoint `mobileKeyAuth` |

### Cara memanggil `/chargebox/nearest` dengan benar (curl)

```bash
# 1. login dulu — butuh key-header (nilainya di backend/.env, jangan di-commit)
curl -X POST 'https://energy.edifly-si.com/spklu/api/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'key-header: <KEY_HEADER>' \
  -d '{"email":"user@example.com","password":"...","loginby":"password"}'
# -> { "success": true, "token": "eyJ..." }

# 2. baru panggil nearest dengan token itu
curl -X POST 'https://energy.edifly-si.com/spklu/api/chargebox/nearest' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"latitude":"-6.2996197","longitude":"106.7765413","limit":10}'
```

Catatan: `limit` WAJIB integer (lihat bagian berikut). JSON harus valid —
**tanpa** koma sebelum `}`.

### Artikel berita (`t_berita`) — CRUD admin

Dashboard punya menu **Berita** (`/spklu/berita`, role 1 & 2). Endpoint:

| Endpoint | Guna |
|---|---|
| `GET /admin/berita` | Daftar artikel, urut `id_berita DESC` |
| `POST /admin/berita` | Tambah artikel |
| `PUT /admin/berita/:id` | Ubah artikel |
| `DELETE /admin/berita/:id` | Hapus artikel |

Body: `judul`, `berita` (isi), `tgl_terbit` (`YYYY-MM-DD`), `jangkauan`
(`semua`/`radius`), `radius_km`, `pusat_latitude`, `pusat_longitude`,
`jenis_berita` (`app`/`web`), `status` (`1` tampil / `0` draft), `foto`
(nama file dari `/admin/upload?folder=berita/foto`), `url` (opsional).

**Jangan tertukar:** `t_berita` = artikel dengan jangkauan geografis, dibaca
`POST /informasi/getberita`. `berita` (tanpa `t_`) = feed notifikasi per user,
dibaca `POST /informasi/getberita_user`. Nama mirip, fungsi berbeda.

**⚠ `radius` disimpan dalam MIL, bukan km.** Query mobile menghitung jarak km
lalu membandingkan dengan `radius * 0.621371`. API menerima/mengembalikan
`radius_km` dan mengonversi di controller saja. Jangan mengubah penyimpanan
menjadi km tanpa mengubah query mobile: filternya akan jadi 0,62x lebih sempit
tanpa gejala yang jelas.

**⚠ `tgl_terbit` harus dikembalikan sebagai teks `YYYY-MM-DD`.** Kolomnya
`date`; driver `pg` mem-parse menjadi Date tengah malam waktu LOKAL, dan JSON
menyimpannya sebagai UTC, sehingga di WIB tanggalnya mundur sehari
(`2026-10-20` menjadi `"2026-10-19T17:00:00.000Z"`). Akibatnya tabel menampilkan
tanggal salah dan setiap edit memundurkan tanggal terbit satu hari. Karena itu
query list memakai `to_char(tgl_terbit, 'YYYY-MM-DD')`. Regresi:
`berita-api-test.cjs` + `berita-ui-test.cjs`.

**Kolom NOT NULL tanpa default** yang harus tetap diisi: `tgl_buat` (`now()`),
`pembuat` (dari token admin, dipotong 20 karakter), `pusat_latitude` /
`pusat_longitude` (diisi `'0'` saat jangkauan `semua`), `foto` (diisi `''` bila
tidak ada), `radius` (0 saat `semua`).

**Tampil atau tidak** ditentukan query mobile: `status=1` **dan**
`tgl_terbit <= CURRENT_DATE`. Jadi tanggal terbit di masa depan = artikel
terjadwal, dan itu bukan bug.

### MapPicker: kontrol zoom pindah ke kanan-atas

Kontrol zoom default Leaflet ada di kiri-atas, tempat yang sama dengan kotak
pencarian (`.map-search`, `z-index: 1000`), sehingga tombol +/- tertutup dan
tidak bisa diklik. Sekarang peta dibuat dengan `zoomControl: false` lalu
`L.control.zoom({ position: 'topright' })`. Ini memperbaiki form Berita **dan**
form Chargebox yang memakai komponen yang sama.

### Inbox mobile: REST + polling, Supabase dicabut

Empat endpoint pengganti akses langsung Supabase dari app (semua `POST`,
Bearer token wajib, `id_user` diambil dari token bukan dari body):

| Endpoint | Guna |
|---|---|
| `/informasi/getberita_user` | Feed inbox user. Body `{limit}` integer 1..100 default 25. Urut `id DESC`. `dibaca` selalu boolean. |
| `/informasi/setberitadibaca` | Body `{id}`. Hanya berita milik user token. |
| `/informasi/getkonektor` | Body `{chargebox_id}`. Status terakhir per `connector_id`. |
| `/informasi/getcharging` | Body `{no_trans}`. Progres charging; kepemilikan dicek lewat `t_transaction.id_user`. |

- **`limit` integer-only** lewat `preValidation: requireInteger('limit')`
  (`src/middleware/require-integer.js`, dipakai juga oleh `/chargebox/nearest`).
  String `"25"` ditolak 400. Schema saja tidak cukup karena AJV coerce.
- **Isolasi antar-user teruji**: berita user lain tidak bocor, dan menandai
  berita user lain ditolak.
- **Index** `berita_id_user_id_desc (id_user, id DESC)` ditambahkan, karena
  polling memperbanyak query feed per user. Terverifikasi memakai Index Only
  Scan saat seq scan dimatikan.
- **Pengganti realtime = polling pendek**: inbox 15-30 s, status konektor dan
  progres charging 5-10 s, dihentikan saat app di background.
- **Sisi Flutter belum diterapkan** (source app tidak ada di VM ini). Patch
  `InboxViewModel.getinbox()` + `markAsRead()` + lifecycle timer ada di
  `MOBILE-INBOX-MIGRATION.md`.
- `backend/README.md` sudah ditulis ulang: tidak lagi menyuruh install Supabase.
  `backend/.env.example` ditambahkan (placeholder, tanpa nilai rahasia) dan
  dikecualikan dari `.gitignore` (`.env*` + `!.env.example`).

### `limit` WAJIB integer

`POST /chargebox/nearest` — `limit` harus bilangan bulat: kirim `10`, bukan `"10"`.

| Body | Hasil |
|---|---|
| `"limit": 10` | 200 OK |
| `"limit": "10"` | **400** `limit: harus bilangan bulat (integer), bukan string` |
| `"limit": 10.5` | **400** `... bukan desimal` |
| `"limit": true` | **400** `... bukan boolean` |
| `"limit": null` | dianggap tidak dikirim → default 50 |
| tanpa `limit` | default 50 |
| `"limit": 0` / negatif | fallback 50 |
| `"limit": 500` | dijepit 100 |

**Kenapa perlu hook, bukan cukup schema.** Fastify memakai AJV dengan
`coerceTypes: 'array'` (`@fastify/ajv-compiler/lib/default-ajv-options.js`),
jadi `"10"` dan `true` **dipaksa** menjadi angka SEBELUM validasi berjalan —
`type: 'integer'` di schema tidak akan menolaknya. Satu-satunya tempat yang
masih melihat tipe asli dari JSON adalah `preValidation`, yang berjalan sebelum
validation. Lihat `requireIntegerLimit()` di `src/routes/chargebox.routes.js`.

**Hook Fastify 5 WAJIB `async`.** Hook non-async yang mengembalikan `undefined`
dianggap gaya callback dan tidak pernah memanggil `done`, sehingga request
**menggantung tanpa respons** (curl: `HTTP 000`, tanpa error di log). Ini bukan
bug yang terlihat dari kode — hanya ketahuan saat memanggil endpoint.

Regresi: `limit-integer-test.cjs` (12 asersi).

### ⚠ Workflow `berita`: tabel tulis-saja, belum bisa dibaca mobile

Rencana memakai `berita` sebagai kanal tunggal (self-update APK + notifikasi
charging/konektor/pembayaran) **belum bisa jalan apa adanya**. Kondisi aktual:

Struktur `berita` (PostgreSQL):

```
id bigint identity | created_at timestamptz | id_user int | no_trans varchar
judul varchar | isi varchar | jenis_berita varchar | dibaca boolean default false
```

- **Tidak ada satu pun endpoint yang MEMBACA `berita`.** Semua kode hanya
  `INSERT INTO berita(id_user,no_trans,jenis_berita,judul,isi)`. Grep
  `SELECT ... FROM berita` → nol hasil. Jadi mobile tidak punya cara mengambil
  feed notifikasi. Ini blocker utama.
- **`dibaca` tidak pernah di-UPDATE** — belum ada endpoint mark-as-read.
- **Tidak ada kolom `url`** (padahal `t_berita` punya). Self-update butuh URL
  APK, versi, dan flag `force` — tidak ada tempat menyimpannya.
- **Tidak ada `id_chargebox` / `connector_id`** → event charging/konektor tidak
  bisa di-deep-link ke perangkat tertentu.
- **Index hanya primary key.** Feed per user (`WHERE id_user=$1 ORDER BY
  created_at DESC`) akan full scan; perlu index komposit.

Nilai `jenis_berita` yang SUDAH dipakai kode (jangan diubah, mobile mungkin
sudah menanganinya):

| jenis_berita | Judul | Sumber |
|---|---|---|
| `welcome` | — | `controller-auth.js` (registrasi) |
| `ordercharging` | Menunggu Pembayaran Charging | `controller-transaction.js` |
| `pembayaran` | Pembayaran Sukses | `controller-transaction.js` |
| `pembayarangagal` | Pembayaran Gagal | `controller-transaction.js` |
| `tunggubayartopup` | Menunggu Pembayaran Topup | `controller-auth.js` |
| `topupgagal` | Pembayaran Topup Gagal | `controller-auth.js` |
| `refundsukses` | Refund sukses | `controller-callback.js`, `jobs/refundUnusedPaidTransactions.js` |
| `refundpending` | Refund pending | `controller-callback.js`, `jobs/refundUnusedPaidTransactions.js` |
| `finishcharging` | Charging Selesai | `ocpp/handle.js` |

Self-update APK saat ini **sudah ada dan jalan** lewat file statis, bukan
`berita`: `apk/version.json` (versionName 1.1.9, versionCode 28, url, size,
sha256, changelog, force) disajikan nginx di
`/spklu/download_apk/version.json` (Cache-Control: no-store) + `spklu.apk`.
Kalau mau dipindah ke `berita`, endpoint version.json harus membaca DB — dan
`sha256`/`size` tetap perlu disimpan agar update bisa diverifikasi.

### Dokumentasi manual yang perlu diperbarui (BUKAN bug kode)

| Item | Dokumentasi | Aktual |
|---|---|---|
| `chargebox_id` | `1` (number) | `"EZ81920"` (string, ID perangkat `EZ`+5 digit) |
| `connector_type` | `"Type 2"` | `"AC"` atau `"DC"` saja |
| `electric_power` | `"50kW"` | `7` / `30` / `60` (number, **kW**) |
| `fasilitas` | `"Toilet, Wifi, Cafe"` | `jsonb` (array/objek) atau `null` |
| `status` | `"available"` (huruf kecil) | `"Available"` / `"Charging"` / `"Finishing"` (sesuai OCPP, kapital) |

## Kontrak connector_type & electric_power — SELESAI

Dikonfirmasi tim developer:

- `connector_type` = string/varchar, **hanya** `"AC"` atau `"DC"`.
- `electric_power` = integer, satuan **kW**, contoh `7` / `30` / `60`.

Kolom `electric_power` bertipe **`integer`** (bukan `numeric`/`decimal`), sesuai
kontrak. Perubahan DDL:

```sql
-- PostgreSQL (live)
ALTER TABLE t_connector_detail
  ALTER COLUMN electric_power TYPE integer USING electric_power::integer;
```

File DDL ikut disesuaikan: `backend/database/migrate_to_postgres.sql`
(`integer`) dan `backend/database/db.sql` (`int`). Batas atas 1000 kW divalidasi
di controller, jauh di bawah batas `integer` (2.147.483.647), jadi tidak ada
risiko overflow.

### Migrasi data yang dijalankan

```sql
-- connector_type: 'Type 2 AC' -> 'AC'  (apa pun mengandung DC -> 'DC')
UPDATE t_connector_detail SET connector_type = CASE
    WHEN upper(connector_type) LIKE '%DC%' THEN 'DC'
    WHEN upper(connector_type) LIKE '%AC%' THEN 'AC'
    ELSE connector_type END
 WHERE connector_type IS NOT NULL AND connector_type NOT IN ('AC','DC');

-- electric_power: Watt -> kW
UPDATE t_connector_detail SET electric_power = electric_power / 1000
 WHERE electric_power IS NOT NULL AND electric_power > 1000;
```

Hasil: EZ30931 #1–#2 = `AC 60`, EZ81920 #1–#3 = `AC 7`.

### Perubahan kode

- `dashboard/src/connectorTypes.ts` — `CONNECTOR_TYPES` jadi 2 entri (`AC`, `DC`).
  Properti `kecepatan` dihapus.
- `components/ConnectorTypeSelect.tsx` — ikon `AC`→`Plug`, `DC`→`Zap`;
  `BatteryCharging` tidak dipakai lagi.
- `controller-admin-master.js` — `CONNECTOR_TYPES = ['AC','DC']`;
  `electric_power` maksimum 1000 (kW), bukan 9999999 (Watt).
- `admin.schema.js` — deskripsi field disesuaikan (kW, AC/DC).
- `pages/Chargebox.tsx` — header `Daya (kW)`, label `Daya (kW)`,
  placeholder `mis. 7 / 30 / 60`, `maxDigits` 7→4, teks bantuan diganti.

### Dampak ke perhitungan scheduler

`jobs/scheduler.js:39` menghitung `estimatedHours = orderedEnergyKWh / electric_power`
— artinya kode itu **sudah mengasumsikan kW**. Selama data tersimpan dalam Watt
(60000), estimasi menjadi 1000× terlalu kecil sehingga watchdog bisa menandai
charging selesai terlalu cepat. Migrasi ke kW **memperbaiki bug laten ini**;
tidak ada perubahan kode scheduler yang diperlukan.

### Breaking change untuk klien mobile

`connector_type` kini `"AC"`/`"DC"` (bukan `"Type 2 AC"`), `electric_power`
kini kW (bukan Watt), dan kunci JSON sudah `connector_type` (bukan
`conector_type`). Aplikasi Flutter harus menyesuaikan ketiganya.

### ⚠ BLOCKER lama sudah teratasi

Sebelumnya nilai live `"Type 2 AC"` tidak ada di daftar yang diizinkan sehingga
Tambah Konektor selalu gagal. Setelah migrasi + penyamaan daftar, create/update
untuk `AC` dan `DC` berhasil (terverifikasi 25 tes API + 9 tes UI).


## OCPP Protocol — SELESAI

`dashboard/src/pages/Chargebox.tsx` — label & urutan opsi disesuaikan:

```html
<option value="non_ocpp">Non-OCPP</option>
<option value="ocpp1.6J">OCPP 1.6J</option>
<option value="ocpp2.0">OCPP 2.0</option>
<option value="ocpp2.0.1">OCPP 2.0.1</option>
```

Sebelumnya label `Non OCPP` (tanpa tanda hubung) dan urutannya di akhir.
Backend `OCPP_PROTOCOLS` sudah menerima keempat nilai; keempatnya terverifikasi
tersimpan dengan benar. Default form tetap `ocpp1.6J`.

## Belum diperbaiki (prioritas berikutnya)

- `controller-report.js::mitra` — `JOIN t_mitra m` (INNER). Transaksi milik
  mitra soft-deleted HILANG dari laporan per-mitra → angka tidak cocok dengan
  total keseluruhan. **Paling berdampak secara finansial.**
- `controller-admin.js::listChargebox` — `LEFT JOIN t_mitra` tanpa
  `deleted_at IS NULL` (cacat sama seperti Pelanggan yang sudah diperbaiki).
  Belum terlihat karena semua chargebox menunjuk mitra aktif.
- `controller-auth.js::login` — INNER JOIN `t_mitra` tanpa filter
  `deleted_at`. Pelanggan dari mitra terhapus masih bisa login.
  **Keputusan bisnis** — jangan diubah tanpa persetujuan.
- `/chargebox/getharga` — `Data tidak ada` karena `t_besar_biaya`/`t_biaya`
  kosong (gap data, bukan bug kode).

## Catatan setup tes

`t_area` hanya berisi `id_area` 2 dan 3. Membuat chargebox uji dengan
`id_area=1` akan HILANG dari `/chargebox/nearest` karena `JOIN t_area`
(INNER) — bukan bug, tapi jebakan saat menyiapkan data uji.

## Konteks sesi sebelumnya (selesai)

Chargebox (auto-ID `EZ`+5 digit, jsonb foto, layout 2 kolom, modal konektor),
CRUD konektor + tipe ber-ikon + navigasi keyboard, `electric_power integer` (kW),
input bilangan bulat (tanpa koma/titik), modul Pelanggan (read-only list),
mitra soft-deleted tidak tampil, validasi hapus Mitra, dan perbaikan 6 sequence
identity yang tertinggal.
