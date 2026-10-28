# Test Suite — Fitur Promo

Suite regresi untuk fitur promo EZ Charge (ATPM / Hotel / Asuransi).
Memakai test runner bawaan Node (`node:test`) — **tidak perlu install apa pun**.

## Cara menjalankan

```bash
cd /opt/energy/applications/spklu/backend

npm test          # semua suite (db + api + e2e)
npm run test:db   # fungsi database saja, tidak butuh server hidup
npm run test:api  # endpoint HTTP, butuh server hidup
npm run test:e2e  # 3 skenario bisnis ujung ke ujung, butuh server hidup
```

Bila DB tidak resolve, set host secara eksplisit:

```bash
DB_HOST_POSTGRE=127.0.0.1 npm test
```

Runner sudah menyetel `DB_HOST_POSTGRE=127.0.0.1` sebagai default, karena pm2
menjalankan backend dengan nilai itu (Postgres di host yang sama), sedangkan
`.env` berisi nama container `energy-postgres` yang tidak resolve dari host.

## Isi suite

| File | Jumlah | Cakupan |
|---|---|---|
| `promo.db.test.js` | 24 | `fn_promo_validasi`, `fn_promo_pakai` (idempotensi), `fn_promo_batal`, `fn_promo_tutup_periode` (hangus/rollover), `fn_promo_iklan_untuk_user`, constraint skema |
| `promo.api.test.js` | 42 | Admin CRUD mitra/promo/iklan/peserta, API key ATPM, ATPM daftar kendaraan, portal login + guard mitra, iklan mobile + batas impresi, tutup periode, eksposur |
| `promo.e2e.test.js` | 23 | 3 skenario bisnis lengkap lewat HTTP + callback pembayaran asli, termasuk retry callback dan snapshot transaksi |

Total: **89 test**.

## Aturan keselamatan data

- Semua data uji memakai prefix `TEST_` (kode promo) dan `TM_` (kode mitra).
- `cleanup()` hanya menghapus baris dengan prefix tersebut — tidak pernah
  menyentuh data produksi.
- Suite memanggil `cleanup()` di `before` dan `after`, dan test terakhir
  memverifikasi tidak ada sisa data uji.
- Test E2E membuat transaksi sungguhan lewat API order dan callback, lalu
  menghapusnya di akhir.

## Yang perlu diketahui saat menambah test

1. **Jangan pakai `BEGIN ... ROLLBACK`** untuk test HTTP — server memakai pool
   koneksi sendiri, jadi transaksi test tidak terlihat oleh server.
2. **`DELETE` tanpa body** — jangan pasang `Content-Type: application/json`,
   Fastify menolak body kosong dengan header itu. Helper `makeClient().del()`
   sudah menangani.
3. **Token**: `adminToken()` mengambil captcha lalu login; `mobileToken()`
   menandatangani JWT langsung memakai `SECRET_KEY` dan `PENGACAK` dari `.env`.
4. **Suite dijalankan serial** (`--test-concurrency=1`) karena berbagi DB yang
   sama dan prefix data yang sama.
5. Bila menambah kolom/tabel promo baru, tambahkan pembersihannya di
   `helpers.cleanup()` — urutan penting karena foreign key.
