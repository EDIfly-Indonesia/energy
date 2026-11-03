# TODO — Pembatalan Reservasi SPKLU (Backend)

Status: **SUDAH DITERAPKAN 3 Nov 2026** (commit 92d6324). Endpoint
`POST /transaction/cancelreservasi` aktif; lihat §8 untuk hasil uji.
Dokumen ini kini catatan keputusan + status.
Sumber keputusan: instruksi produk 2026-11-02. Sisi mobile sudah selesai dan
sudah memanggil endpoint yang diminta di sini — kontrak di §Kontrak API **jangan
diubah** tanpa menyelaraskan aplikasi.

---

## 1. Keputusan produk (sudah dikunci)

| Hal | Keputusan |
|---|---|
| Endpoint | `POST /transaction/cancelreservasi` |
| Body | `{ no_trans }` |
| Status yang boleh dibatalkan | `t_transaction.status_transaksi` = `order` **dan** `ready` |
| Refund | **Tidak ada.** Reservasi tidak menagih biaya, tidak ada dana kembali |
| Jendela reservasi | Maksimal **30 menit** ke depan. Tidak ada reservasi tanggal maju |

Catatan penting soal refund: `refund()` yang sudah ada **tidak dipanggil** oleh
pembatalan reservasi. Fungsi itu hanya untuk sesi charging yang sudah membayar
energi (mis. transaksi `charging`/`finish` yang dihentikan lebih awal).

---

## 2. Temuan audit kode (kondisi saat ini)

Semua nomor baris mengacu ke `src/controllers/controller-transaction.js`
sebagaimana ada saat dokumen ini ditulis.

1. **Belum ada endpoint pembatalan.** `src/routes/transaction.routes.js` hanya
   mendaftarkan 4 route: `simpanorder`, `startcharging`, `stopcharging`,
   `paywithsaldo`. Tidak ada route cancel/batal di seluruh `src/routes/`.

2. **Status reservasi tidak konsisten.** `t_reservasi.status` punya default
   `'unpaid'` (bukan NULL), tetapi:
   - `paywithsaldo` menulis `status='ready'` (baris 508) ✔
   - `controller-callback.js` **tidak pernah** menyentuh `t_reservasi` — jadi
     reservasi yang dibayar lewat VA/QRIS tetap `'unpaid'` ✘
   - `stopcharging` (baris 440) tidak menyentuh `t_reservasi` sama sekali ✘

3. **Cek reservasi aktif mengabaikan `status`** (baris 157–166):
   ```sql
   SELECT 1 FROM t_reservasi
   WHERE chargebox_id = $1 AND connector_id = $2
     AND now() > date AND now() < date_expired
   ```
   Tanpa filter status, reservasi yang **dibatalkan** atau **kedaluwarsa** tetap
   memblokir konektor sampai `date_expired` lewat. Ini akan membuat fitur
   pembatalan tidak berefek apa pun kecuali diperbaiki lebih dulu.

4. **Tidak ada job yang meng-expire reservasi.** `src/jobs/scheduler.js` hanya
   menjalankan refund dan watchdog charging. Reservasi yang lewat
   `date_expired` tetap berstatus aktif di DB.

5. **Expiry pembayaran bergantung `setTimeout` in-process** (baris ~303).
   Timer mati saat service restart, sehingga order `order`/`unpaid` yang sudah
   lewat `tgl_expired` bisa menggantung. Ini sebabnya perlu job cron (§Fase 3).

6. **INSERT reservasi menelan error** (baris 229–232):
   `.catch(e => console.error('Gagal reservasi:', e))`
   Order tetap dianggap sukses walau reservasi gagal dibuat.

7. **Tidak ada index pendukung.** `t_reservasi` hanya punya PK pada `id`.
   Cek reservasi aktif memfilter `(chargebox_id, connector_id, date,
   date_expired)` tanpa index.

8. **Server tidak menegakkan jendela 30 menit.** Batas ini saat ini hanya
   divalidasi di aplikasi mobile (`lib/feature/homepage/utils/reservation_window.dart`).
   Klien bisa dipanggil langsung, jadi server wajib memvalidasi ulang.

9. **`t_reservasi.transaction_id` bertipe `integer`** sedangkan
   `t_transaction.no_trans` bertipe `varchar`. Postgres melakukan cast implisit,
   jadi berfungsi, tetapi rawan bila `no_trans` suatu saat bukan angka murni.

10. **Data lama: `no_trans` NULL.** `t_transaction` id=44 di produksi punya
    `no_trans = NULL` sementara `t_reservasi.transaction_id = 44`. Perbaikan
    penulisan `no_trans` sudah di-commit (`d071643`), tetapi baris lama belum
    dibersihkan — pembatalan berbasis `no_trans` tidak akan menemukannya.

---

## 3. Kontrak API (WAJIB sama dengan yang sudah dipakai mobile)

Mobile sudah mengimplementasikan ini di
`lib/feature/homepage/services/transaction_service.dart`. Jangan mengubah bentuk
request/response.

**Request**
```
POST /transaction/cancelreservasi
Authorization: Bearer <token>
Content-Type: application/json

{ "no_trans": "44" }
```

**Response sukses**
```json
{ "success": true, "message": "Reservasi berhasil dibatalkan" }
```

**Response ditolak** (HTTP tetap 200, mengikuti pola endpoint lain di repo ini)
```json
{ "success": false, "message": "Transaksi tidak dapat dibatalkan" }
```

**Catatan kontrak**
- `no_trans` dikirim sebagai **string** (mobile mengirim hasil `toString()`).
- `id_user` **tidak** dikirim klien. Server wajib mengambilnya dari token
  (`tokenUserId(req)`) dan memverifikasi kepemilikan transaksi.
- Mobile memperlakukan **HTTP 404** sebagai "fitur belum tersedia di server".
  Jangan mengembalikan 404 untuk transaksi yang tidak ditemukan — gunakan
  `success: false`.

---

## 4. Fase kerja

### Fase 0 — Prasyarat skema & data

- [ ] Tambah index pendukung di `t_reservasi`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_reservasi_connector_aktif
    ON t_reservasi (chargebox_id, connector_id, date_expired)
    WHERE status IN ('unpaid', 'ready');

  CREATE INDEX IF NOT EXISTS idx_reservasi_transaction
    ON t_reservasi (transaction_id);
  ```
  Partial index pada `status` membuat cek "reservasi aktif" tetap murah walau
  riwayat reservasi menumpuk.

- [ ] Tambah constraint nilai status agar tidak ada nilai liar:
  ```sql
  ALTER TABLE t_reservasi
    ADD CONSTRAINT chk_reservasi_status
    CHECK (status IN ('unpaid','ready','charging','finish','cancel','expired'));
  ```
  **Periksa dulu** nilai yang sudah ada:
  `SELECT status, count(*) FROM t_reservasi GROUP BY status;`
  Saat ini hanya ada `unpaid`. Constraint akan gagal bila ada nilai lain.

- [ ] Bersihkan data lama: isi `no_trans` yang NULL dari `id` (backfill), lalu
  verifikasi jumlahnya nol.
  ```sql
  UPDATE t_transaction SET no_trans = id::text WHERE no_trans IS NULL;
  ```
  Jalankan dalam transaksi dan backup lebih dulu.

- [ ] Putuskan penanganan `transaction_id integer` vs `no_trans varchar`.
  Rekomendasi: **biarkan apa adanya** (cast implisit sudah berjalan), cukup
  tambahkan komentar di skema. Migrasi tipe kolom berisiko dan tidak mendesak.

### Fase 1 — Endpoint `POST /transaction/cancelreservasi`

- [ ] Tambah route di `src/routes/transaction.routes.js`, mengikuti pola route
  lain di file itu (tag `transaction`, `preHandler: mobileTokenAuth`):
  ```js
  fastify.post('/transaction/cancelreservasi',
    { schema: { tags: ['transaction'], summary: 'Batalkan reservasi/order', body: s.trxCancelReservasi, security: BEARER },
      preHandler: mobileTokenAuth },
    toFastify(transaction.cancelreservasi));
  ```

- [ ] Tambah skema body di `src/schemas/mobile.schema.js` (dekat
  `trxSimpanorder`):
  ```js
  trxCancelReservasi: body({
    no_trans: str('No transaksi yang dibatalkan'),
  }),
  ```

- [ ] Implementasi `cancelreservasi` di `src/controllers/controller-transaction.js`:

  - [ ] Ambil `id_user` dari token; tolak bila null (`'invalid0'`).
  - [ ] Validasi `no_trans` wajib ada dan tidak kosong.
  - [ ] Ambil transaksi **dengan syarat kepemilikan**:
    ```sql
    SELECT id, no_trans, id_user, status_transaksi, status_bayar, chargebox_id, connector_id
    FROM t_transaction WHERE no_trans = $1 AND id_user = $2
    ```
  - [ ] Tolak bila tidak ditemukan → `success:false`, pesan
    "Transaksi tidak ditemukan". **Bukan** 404.
  - [ ] Tolak bila status bukan `order`/`ready` → pesan yang menyebut status
    saat ini, mis. "Transaksi berstatus charging tidak dapat dibatalkan".
  - [ ] Tolak bila `status_transaksi = 'ready'` **dan** charging sudah berjalan
    (indikator: ada baris di `t_transaction_detail.start_timestamp`, atau
    `jml_kwh_terpakai > 0`). Ini mencegah pembatalan sesi yang sudah mengalirkan
    energi — kasus itu harus lewat `stopcharging` + `refund()`.
  - [ ] Jalankan pembatalan dalam **satu transaksi DB** (`BEGIN`/`COMMIT`):
    ```sql
    UPDATE t_transaction
       SET status_transaksi = 'cancel', update_at = now()
     WHERE no_trans = $1 AND id_user = $2;

    UPDATE t_reservasi
       SET status = 'cancel'
     WHERE transaction_id = $1::int;
    ```
  - [ ] Lepas konektor bila perlu: kembalikan `t_connector_detail.status` ke
    `'Available'` untuk `(chargebox_id, connector_id)` terkait, **hanya** bila
    tidak ada reservasi aktif lain yang menahan konektor itu. Cek ulang setelah
    update reservasi, jangan melepas buta.
  - [ ] **Jangan** memanggil `refund()` — sesuai keputusan produk.
  - [ ] Lepas klaim promo bila ada, karena pembatalan membatalkan seluruh sesi.
    Pakai `promoService.lepasPromo(no_trans)` seperti di `refund()` (baris ~547),
    dibungkus `try/catch` agar tidak menggagalkan pembatalan.
  - [ ] Kirim notifikasi in-app lewat tabel `berita`
    (`jenis_berita: 'reservasibatal'`), mengikuti pola insert di `simpanorder`.
  - [ ] Balas `{ success: true, message: 'Reservasi berhasil dibatalkan' }`.
  - [ ] Idempoten: memanggil dua kali pada transaksi yang sudah `cancel` harus
    mengembalikan `success: false` dengan pesan jelas, bukan error 500.

### Fase 2 — Perbaiki cek reservasi aktif (blocker fitur ini)

Tanpa ini, pembatalan tidak berefek: konektor tetap terblokir.

- [ ] Ubah query di `simpanorder` (baris 157–166) agar mengabaikan reservasi
  yang sudah batal/kedaluwarsa:
  ```sql
  SELECT 1 FROM t_reservasi
   WHERE chargebox_id = $1 AND connector_id = $2
     AND status IN ('unpaid', 'ready')
     AND now() > date AND now() < date_expired
   LIMIT 1;
  ```
- [ ] Pertimbangkan mengganti syarat waktu menjadi hanya `now() < date_expired`,
  karena reservasi yang `date`-nya belum tiba tetap harus menahan konektor.
  Konfirmasi ke produk sebelum mengubah perilaku ini.

### Fase 3 — Job expire reservasi

- [ ] Buat `src/jobs/expireReservasi.js` mengikuti pola
  `refundUnusedPaidTransactions.js`.
- [ ] Isi: tandai reservasi yang lewat waktu sebagai `expired`, dan batalkan
  transaksi `order`/`unpaid` yang sudah lewat `tgl_expired`.
  ```sql
  UPDATE t_reservasi SET status = 'expired'
   WHERE status IN ('unpaid', 'ready') AND date_expired < now();
  ```
- [ ] Daftarkan di `src/jobs/scheduler.js` pada interval yang sama (60 detik).
- [ ] Setelah job ini ada, **hapus** `setTimeout` expiry di `simpanorder`
  (baris ~303) agar tidak ada dua mekanisme yang saling bertabrakan. Timer
  in-process tidak selamat dari restart dan tidak bisa diandalkan.
- [ ] Pastikan job idempoten dan aman dijalankan berulang.

### Fase 4 — Konsistensi status reservasi

- [ ] `controller-callback.js` (baris ~20, blok pembayaran VA/QRIS): setelah
  `t_transaction` jadi `ready`, ikut set reservasi:
  ```sql
  UPDATE t_reservasi SET status = 'ready' WHERE transaction_id = $1::int;
  ```
  Tanpa ini, reservasi berbayar via VA/QRIS tetap `unpaid`.
- [ ] `stopcharging` (baris 440): set reservasi terkait menjadi `finish` saat
  charging selesai, agar riwayatnya lengkap.
- [ ] Samakan sumber kebenaran status. Rekomendasi: `t_transaction.status_transaksi`
  adalah sumber utama; `t_reservasi.status` hanya cermin untuk kebutuhan
  pelepasan konektor. Dokumentasikan pilihan ini di komentar skema.

### Fase 5 — Tegakkan jendela 30 menit di server

- [ ] Di `simpanorder`, saat `req.body.reservasi == 1`, validasi
  `date_reservasi`:
  - wajib ada dan bisa diparse,
  - tidak lebih dari **30 menit** ke depan,
  - tidak di masa lalu (beri toleransi beberapa detik).
- [ ] Tolak dengan `success: false` dan pesan yang sama seperti di mobile:
  "Reservasi maksimal 30 menit dari sekarang."
- [ ] Samakan `date_expired`: saat ini `dateReservasi + 15 menit` (baris ~221).
  Putuskan apakah tetap 15 menit atau mengikuti jendela 30 menit, lalu
  dokumentasikan. Jangan biarkan dua angka berbeda tanpa penjelasan.
- [ ] Pertimbangkan menurunkan `wkt_exp` (15 menit) untuk order reservasi agar
  pembayaran tidak melewati slot reservasi.

### Fase 6 — Swagger & dokumentasi

- [ ] Pastikan endpoint baru muncul di `/docs/json` (jumlah path bertambah 1).
- [ ] Tambahkan ringkasan alur reservasi → batal ke `NEXT-SESSION-endpoints.md`
  atau dokumen baru `CANCEL-RESERVASI.md`, termasuk tabel transisi status:

  | Dari | Aksi | Ke |
  |---|---|---|
  | `order` | cancelreservasi | `cancel` |
  | `ready` (belum mulai charging) | cancelreservasi | `cancel` |
  | `ready` (charging berjalan) | — | ditolak, pakai `stopcharging` |
  | `charging`/`finish`/`expired` | cancelreservasi | ditolak |

### Fase 7 — Pengujian

- [ ] Tambah kasus di `test/` mengikuti pola `test/run.js` yang ada:
  - [ ] batal `order` → sukses, `t_transaction.status_transaksi='cancel'`,
        `t_reservasi.status='cancel'`
  - [ ] batal `ready` yang belum mulai → sukses
  - [ ] batal `charging` → ditolak
  - [ ] batal transaksi milik user lain → ditolak ("tidak ditemukan")
  - [ ] batal dua kali → pemanggilan kedua `success:false`
  - [ ] setelah batal, `simpanorder` pada konektor yang sama → **berhasil**
        (bukti konektor benar-benar lepas)
  - [ ] reservasi > 30 menit ditolak saat `simpanorder`
- [ ] Uji manual end-to-end dengan APK: tombol "Batalkan" di tab Riwayat
  (`order` dan `ready`) lalu pastikan baris berpindah ke daftar selesai.

---

## 5. Urutan eksekusi yang disarankan

1. Fase 0 (index + backfill `no_trans`) — aman, tanpa efek ke klien.
2. Fase 2 (perbaiki cek reservasi aktif) — **wajib sebelum** endpoint dipakai.
3. Fase 1 (endpoint cancel).
4. Fase 3 (job expire) + hapus `setTimeout`.
5. Fase 4 (konsistensi status).
6. Fase 5 (validasi 30 menit).
7. Fase 6–7 (dokumentasi + tes).

Fase 1 boleh naik sebelum Fase 2 hanya untuk uji coba, tetapi **jangan
dirilis** ke pengguna dalam kondisi itu: tombol batal akan tampak berhasil
sementara konektor tetap terblokir.

---

## 6. Yang TIDAK boleh diubah tanpa koordinasi mobile

- Bentuk request/response `cancelreservasi` (§3).
- Nama field `no_trans`, `success`, `message`.
- Perilaku: HTTP 200 untuk penolakan, 404 hanya untuk route tidak ada.
- `GET/POST /informasi/gettransaksi` — field `no_trans` dipakai sebagai ID
  transaksi di kartu riwayat. Jangan menghapus atau mengganti namanya.

---

## 7. Risiko yang perlu disadari

- **Pelepasan konektor buta** bisa membuat dua pengguna memesan konektor yang
  sama. Selalu cek ulang reservasi aktif lain sebelum men-set `Available`.
- **Pembatalan setelah bayar tanpa refund** akan terlihat seperti dana hangus
  oleh pengguna. Pastikan pesan konfirmasi di mobile (sudah ada) tetap
  menegaskan tidak ada pengembalian dana, dan pertimbangkan menampilkan
  peringatan tambahan bila `status_bayar='paid'`.
- **Job expire + `setTimeout` berjalan bersamaan** dapat menulis status berbeda
  pada transaksi yang sama. Hapus salah satunya (Fase 3).


---

## 8. Status implementasi (3 Nov 2026)

Endpoint aktif di produksi. Uji end-to-end lewat HTTP nyata: **15/15 lulus**.

| Kasus | Hasil |
|---|---|
| Batal status `order`, konektor bersih | success, transaksi+reservasi jadi `cancel`, konektor `Available` |
| Batal status `order`, konektor masih direservasi lain | transaksi batal, **konektor TIDAK dilepas** (guard bekerja) |
| Batal ulang | ditolak: "Reservasi ini sudah dibatalkan" |
| Batal `ready` (belum mulai) | success |
| Batal `charging` | ditolak: status tidak dapat dibatalkan |
| Batal `ready` yang sudah mengalirkan energi | ditolak: "Pengisian sudah dimulai..." |
| Transaksi milik user lain | ditolak: "Transaksi tidak ditemukan" |
| `no_trans` kosong | ditolak |
| Notifikasi in-app | baris `berita` jenis `reservasibatal` dibuat |

Catatan: penolakan memakai **HTTP 200 + success:false**, sesuai kontrak yang
sudah dipakai mobile. HTTP 404 hanya untuk route yang tidak ada.

### Risiko yang perlu keputusan produk

Status `ready` berarti tagihan **sudah terbayar dari saldo**. Membatalkan
tanpa refund membuat saldo pengguna hangus. Pada alur DOKU lama hal ini tidak
terasa karena reservasi tidak menagih; setelah migrasi ke saldo, `ready`
berarti uang sudah keluar. Bila ini tidak diinginkan, pembatalan `ready`
harus memanggil `refund()` (atau `saldoService.kredit` dengan
`jenis=kredit_refund`) — saat ini belum, sesuai keputusan "tanpa refund".
