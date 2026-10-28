# Wallet DOKU (WaaS Sub Account)

Integrasi wallet SPKLU memakai **DOKU Wallet-as-a-Service Sub Account v1**.
Referensi: https://developers.doku.com/wallet-as-a-service/sub-account/sub-account-v1

## Dua jenis wallet

| | Wallet Pusat | Wallet Pelanggan |
|---|---|---|
| Jumlah | satu | satu per pelanggan |
| Dibuat | manual sekali (CLI/UI) | otomatis saat registrasi |
| Disimpan di | `t_setting.admin_wallet` (prod) / `admin_wallet_sandbox` | `t_user_mobile.id_wallet` |
| Fungsi | menampung transfer saldo dari wallet user; sumber dana refund | bayar pakai saldo, menerima refund |

Format ID: `SAC-<4 digit>-<epoch ms>`, mis. `SAC-9914-1628075940045`.

## Kontrak API yang dipakai

```
POST /sac-merchant/v1/accounts
{ "account": { "email": "...", "type": "STANDARD", "name": "..." } }
-> 201 { "account": { "id": "SAC-...", "status": "PENDING", "type": "STANDARD",
                       "created_date": "...", "updated_date": "...",
                       "name": "...", "email": "..." } }

GET  /sac-merchant/v1/balances/{account_id}
-> 200 { "balance": { "pending": "600000", "available": "1700500" } }

POST /sac-merchant/v1/transfers
{ "transfer": { "origin": "...", "destination": "...", "amount": 50000, "invoice_number": "..." } }
-> 200 { "transfer": { "invoice_number", "origin", "destination", "amount", "status": "SUCCESS", "created" } }

POST /sac-merchant/v1/payouts
{ "account": { "id": "SAC-..." },
  "payout": { "amount": 20000, "invoice_number": "..." },
  "beneficiary": { "bank_code": "BNINIDJA", "bank_account_number": "...", "bank_account_name": "..." } }
-> 200 { "account": {...}, "payout": {...}, "beneficiary": {...} }
```

### Bentuk respons saldo — jangan salah baca

`Get Balances` mengembalikan `{"balance":{"pending","available"}}`, **bukan**
`{"account":{"balance":...}}`. Kedua nilai adalah **string**. Membaca
`r.account.balance` menghasilkan `undefined`, dan `r.balance` menghasilkan objek
yang kalau di-`Number()` menjadi `NaN` di dashboard. `verifyWallet()` memetakan
`available` → `saldo` (angka) dan `pending` → `saldo_tertunda`.

### Accept Payment — wallet tujuan topup

Agar dana topup masuk ke wallet pelanggan (bukan akun utama merchant), body
payment harus membawa:

```json
"additional_info": { "account": { "id": "SAC-..." } }
```

`lampirkanWallet()` di `configs/doku.js` menambahkan ini ke `createlink`,
`createshopepay`, `createcheckout`, `createdokuwallet`, `createva`, dan
`createovo`. Tanpa ini, wallet pelanggan selalu nol sehingga pembayaran pakai
saldo (transfer wallet user → wallet pusat) tidak akan pernah bisa.

### Batas field (Sub Account V1)

`account.email` maks **40**, `account.name` maks **100**, `account.type` maks
**20**. Divalidasi lokal di `createSubAccount()` supaya gagal cepat dengan pesan
jelas.

Signature: `HMACSHA256=base64(HMAC-SHA256(secret,
"Client-Id:<id>\nRequest-Id:<uuid>\nRequest-Timestamp:<iso8601>\nRequest-Target:<path>[\nDigest:<base64(sha256(body))>]"))`

Header: `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature`, dan `Content-Type: application/json` bila ada body.

`Request-Timestamp` **tanpa milidetik** — persis seperti contoh DOKU
(`2020-08-11T08:45:42Z`). `Date#toISOString()` menghasilkan `.000Z`; helper
`isoTanpaMilidetik()` membuangnya. Jangan diganti kembali ke `toISOString()`.

Contoh header dari dokumentasi (nilai `Client-Id` contoh, bukan milik kita):

```
Client-Id: MCH-0001-10791114622547
Request-Id: b6a465ea-bb65-48b2-a22b-3e8fb51cf22e
Request-Timestamp: 2020-08-11T08:45:42Z
Signature: HMACSHA256=vl9DBTX5KhEiXmnpOD0TSm8PYQknuHPdyHSTSc3W6Ps=
```

Catatan penting: sub account **baru berstatus `PENDING`**, bukan langsung `ACTIVE`.
Karena DOKU tidak menyediakan endpoint "get account", satu-satunya cara membuktikan
wallet bisa dipakai adalah memanggil endpoint saldo — itu yang dilakukan `verify`.

## Blocker: kredensial belum lengkap + produk belum aktif

Diuji langsung ke DOKU pada 2026-10-28 dengan Brand ID `BRN-0208-…`:

| Uji | Hasil |
|---|---|
| `POST api.doku.com/checkout/v1/payment` (Jokul) | `invalid_signature` → **Brand ID dikenali** |
| `POST api.doku.com/sac-merchant/v1/accounts` | `invalid_client_id` |
| `GET api-sandbox.doku.com/sac-merchant/...` | `invalid_client_id` |

Kesimpulan: Brand ID valid, tetapi **dua hal belum siap**.

### 1. `API Key` bukan `Secret Key`

`doku_key_...` adalah **API Key**, bukan secret untuk HMAC. Dokumentasi DOKU
menyebut yang dibutuhkan adalah **Secret Key** berformat `SK-...`
(Dashboard → Integrations → API Keys). Dengan API Key sebagai secret, signature
selalu ditolak (`invalid_signature`).

### 2. Sub-Account belum diaktifkan

Endpoint `/sac-merchant/*` menolak Brand ID yang valid di endpoint lain. Dokumentasi
DOKU menyatakan Sub-Account harus diaktifkan lewat Sales:

> Contact Sales to activate Sub-Account.

Tanpa aktivasi ini, Create Account tidak akan pernah berhasil, apa pun kredensialnya.

### 3. Brand ID ini milik PRODUKSI

Brand ID yang sama ditolak di `api-sandbox.doku.com`. Sandbox DOKU adalah akun
terpisah — untuk uji coba perlu Brand ID sandbox sendiri dari sandbox.doku.com.

### Yang dibutuhkan di `.env`

```
IS_PROD=1                      # brand ini produksi
CLIENT_ID_DOKU=<Brand ID BRN-... dari Dashboard DOKU>
SECRET_KEY_DOKU=<Secret Key SK-... dari Integrations > API Keys>
URL_DOKU=https://api.doku.com
```

Nilai kredensial tidak ditulis di dokumen ini — isi langsung di `backend/.env`
yang sudah masuk `.gitignore`.

Untuk sandbox (opsional, akun terpisah): `CLIENT_ID_DOKU_DEV` / `SECRET_KEY_DOKU_DEV`.

## Perintah commissioning

```bash
# ringkasan: wallet pusat + hitungan pelanggan
node scripts/doku-wallet.cjs status

# buat wallet pusat (default SANDBOX; tambah --prod untuk produksi)
node scripts/doku-wallet.cjs create-central \
  --name "GoCaz SPKLU" --email "wallet@edifly-si.com"

# buktikan wallet benar-benar bisa dipakai
node scripts/doku-wallet.cjs verify SAC-9914-1628075940045

# lihat siapa yang belum punya wallet (tidak mengubah apa pun)
node scripts/doku-wallet.cjs backfill --dry-run

# buatkan wallet untuk semua pelanggan yang belum punya
node scripts/doku-wallet.cjs backfill --limit 100

# satu pelanggan tertentu
node scripts/doku-wallet.cjs create-user 8
```

Skrip memaksa `DB_HOST_POSTGRE=127.0.0.1` karena `.env` memakai nama container
(`energy-postgres`) yang tidak resolve dari host.

## Dari dashboard

Menu **Wallet → tab "Wallet DOKU"** (role 1 dan 2):

- melihat ID wallet pusat, status verifikasi, dan saldo
- membuat wallet pusat
- menyimpan ID yang sudah ada secara manual
- melihat pelanggan yang belum punya / gagal dibuat, lalu membuat ulang

## Endpoint admin

| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/wallet` | status wallet pusat + ringkasan pelanggan |
| POST | `/admin/wallet/central` | buat wallet pusat (`name`, `email`, `force`) |
| PUT | `/admin/wallet/central` | simpan ID manual (`id_wallet`) |
| POST | `/admin/wallet/backfill` | buat untuk yang belum punya (`limit`, `force`, `dry_run`) |
| POST | `/admin/pelanggan/:id/wallet` | buat/ulangi satu pelanggan |

Role 1 dan 2. `POST /admin/wallet/central` **tidak** membuat sub account baru bila
`t_setting` sudah terisi — pakai `force: true` bila memang ingin membuat yang baru.

## Perilaku saat registrasi

`POST /auth/registrasi` memanggil `walletProvision.createUserWallet(id_user)` setelah
baris pelanggan dibuat.

- Berhasil → `id_wallet` terisi, `wallet_status` = `pending` (atau `active` bila DOKU
  mengembalikan ACTIVE).
- Gagal (kredensial kosong, DOKU down, email kosong) → registrasi **tetap berhasil**,
  `wallet_status` = `failed`, alasannya di `wallet_error`. Pelanggan bisa topup, hanya
  belum bisa bayar pakai saldo. Admin mengulang lewat UI atau CLI.

Kolom pendukung di `t_user_mobile`:

```
wallet_status      none | pending | active | failed
wallet_error       alasan kegagalan terakhir
wallet_updated_at  kapan status terakhir berubah
```

## Yang masih perlu diputuskan

1. **Kredensial DOKU** — harus diisi sebelum wallet sungguhan bisa dibuat.
2. **Aktivasi sub account** — DOKU mengembalikan `PENDING`; perlu dipastikan apakah
   aktivasi otomatis atau harus lewat DOKU Dashboard/KYC.
3. **Backfill pelanggan lama** — `backfill` akan membuat wallet untuk semua pelanggan
   yang `id_wallet`-nya kosong. Saat ini hanya ada 1 pelanggan (id 8).
4. **`IS_PROD`** — saat ini `0` (sandbox). Jangan diubah ke `1` sebelum wallet pusat
   produksi dibuat, karena setting produksi dan sandbox terpisah.

## Berkas

- `backend/src/services/doku-waas.js` — klien WaaS (signature, create/balance/transfer/payout)
- `backend/src/services/wallet-provision.js` — penyediaan wallet pusat & pelanggan
- `backend/src/controllers/controller-admin-wallet.js` — endpoint admin
- `scripts/doku-wallet.cjs` — CLI commissioning
- `dashboard/src/components/DokuWalletPanel.tsx` — panel UI
- `backend/src/configs/doku.js` — `idWalletAdmin()` membaca `t_setting`, bukan hardcode
