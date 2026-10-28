# TODO — Perbaikan Keamanan SPKLU (Hasil Security Audit)

Sumber: laporan security audit (SEC-01 s/d SEC-13). Prioritas mengikuti tingkat keparahan,
dengan catatan dependensi antar-temuan. Tandai `[x]` saat selesai dan catat hasil verifikasi.

Status awal: SEC-13 (interpolasi LIMIT) dan bug fungsional `/admin/report/summary`
(filter mitra aktif) sudah diperbaiki pada sesi ini.

## Grup A — KRITIS (kerjakan dulu; saling terkait)

### SEC-02 · KRITIS · Token mobile diterima sebagai token admin (cross-realm)
Akar: `decodeAdmin` hanya `jwt.verify` lalu kembalikan `payload.data` tanpa cek klaim
admin/type_id/scope; token mobile & admin ditandatangani `SECRET_KEY` yang sama.
- [x] Tambah klaim pembeda pada token admin (`scope:'admin'`) saat login di
      `src/controllers/controller-admin.js`.
- [x] Di `src/services/permission.js::decodeAdmin`, tolak token tanpa klaim admin
      (`payload.scope !== 'admin'` → return null → middleware kirim 401).
- [x] Pastikan `admin-auth` menolak token mobile di SEMUA `/admin/*` (termasuk `/admin/report/*`).
- [x] Verifikasi: token mobile → 401 di `/admin/me`, `/admin/dashboard`, `/admin/report/summary`,
      `/admin/user`, `/admin/setting` (test 35/35 lolos).

### SEC-03 · KRITIS · IDOR baca/tulis (identitas dari body, bukan token)
Akar: handler memakai `req.body.id_user` / `req.body.email` / `req.body.no_trans` tanpa
mencocokkan dengan identitas di token.
- [x] Pastikan token mobile membawa `id_user` (terbit di `controller-auth.js` login).
- [x] Ambil identitas dari token via helper `tokenUserId(req)` (`src/services/permission.js`),
      bukan dari body; tolak bila tidak ada.
- [x] Tambah kepemilikan pada WHERE (`AND id_user=$token`) untuk getinvoice, datatopup,
      paywithsaldo; email (ubahprofil/hapususer/buatwallet) diambil dari token.
- [x] Verifikasi: token user 1 minta `id_user:3` / `no_trans:'6'` → ditolak/balik data user 1.
      (getinvoice no_trans=6 → success:false; getkwhuser id_user=3 → total=0 milik user 1; 4/4 lolos)
- [x] Tindak lanjut: `simpantoken` → token-auth + `tokenUserId`; `wallet.*` → verifikasi
      `idwallet` milik user (helper `ownWallet` + persist `id_wallet` di `registeragent`);
      `resetpassword` → wajib OTP (OTP disimpan di `kirimotp`, diverifikasi di `resetpassword`).
      Catatan: `resetpassword` kini butuh field `otp` dari client — koordinasikan dengan Flutter.
- [x] Konsistensi: `transaction.paywithsaldo` → verifikasi `id_wallet` dari body milik
      `id_user` di token (sebelumnya dipakai apa adanya ke `bmsdoku.tokenize/paywithsaldo`).
      Diverifikasi: `id_wallet` bukan milik user → `invalid0`.

### SEC-01 · KRITIS · OCPP WebSocket publik tanpa autentikasi
Akar: upgrade handler publik, identitas chargebox diambil dari path tanpa validasi
terdaftar, dan nginx `location /spklu/api/` meneruskan header Upgrade/Connection.
- [x] Hapus `proxy_set_header Upgrade/Connection` dari `location /spklu/api/` di `nginx/spklu.conf`.
      Live config `/etc/nginx/sites-available/energy` SUDAH diperbarui (baris 220-221 dihapus)
      + reload — diverifikasi 01/10 (blok `/spklu/api/` kini tanpa header Upgrade).
- [x] Tolak `chargebox_id` tak terdaftar di `t_chargebox` saat upgrade via `rpcServer.auth()` di
      `src/ocpp/server.js` (cek DB sebelum menerima handshake).
- [ ] Aktifkan `strictMode` ocpp-rpc — follow-up: validasi juga RESPONS server (termasuk
      wildcard handler `{idTagInfo}`), perlu diuji dengan chargebox asli dulu.
- [ ] Firewall/allowlist IP untuk port 8080 (OCPP) & 8484 (non-OCPP TCP) — DITUNDA: belum ada
      data IP chargebox sama sekali. Prosedur siap dijalankan begitu IP diketahui (ufw).
- [ ] (opsional) Basic Auth + secret per device — butuh kolom secret di `t_chargebox`.
- [x] Verifikasi: `ws://…/AUDIT-OCPP-900` → ditolak; `ws://…/E2E001` → diterima (2/2).

## Grup B — TINGGI

### SEC-04 · TINGGI · 18 endpoint tanpa autentikasi (transfer/withdrawl/dompet)
Akar: `lib.cektoken` memakai pola "kirim respons lalu tetap lanjut" dan tidak dipanggil
di banyak handler.
- [x] Ubah `lib.cektoken`/`cekkey` jadi fungsi murni (return boolean, TANPA `res.send`) di `src/configs/lib.js`.
- [x] Pasang auth sebagai `preHandler` Fastify (`mobileTokenAuth`/`mobileKeyAuth` di
      `src/middleware/mobile-auth.js`) di semua grup kecuali publik.
- [ ] `/callback/va` (wajib publik): tambah verifikasi signature DOKU. (pending)
- [x] Verifikasi: 18 endpoint token-protected tanpa token → `{success:false,'invalid0'}`;
      10 endpoint key-protected → `{success:false,'invalid'}`. Catatan: status HTTP tetap
      200 (bukan 401) untuk menjaga kontrak mobile beku.

### SEC-05 · TINGGI · Otorisasi peran admin hanya di sisi klien
Akar: pembatasan menu hanya di `Layout.tsx`; server hanya cek token; `ownerScope` cuma
dipakai untuk chargebox/transaksi.
- [x] Tambah guard peran di server (`requireRole(...)` di `permission.js`), diterapkan per
      sub-scope di `admin.routes.js` mengikuti NAV React: chargebox/connector [1,2,3,6],
      transaction [1,2,3,4,5], area & mitra & pengguna [1,2], setting & wallet & laporan [1,2,4].
- [x] Perluas owner scope: `ownerFilter()` diterapkan ke `listRefund`/`listTopup`
      (`AND u.id_mitra=$1`); chargebox/transaksi/report sudah memakainya.
- [x] Verifikasi: token `type_id=3` → `/admin/user|setting|role|area|mitra|report` = 403,
      `/admin/chargebox|transaction` = 200; keuangan (4) setting=200 user=403; superadmin user=200. (11/11)

## Grup C — SEDANG

### SEC-06 · SEDANG · Stored XSS via unggahan SVG
- [x] Keluarkan `.svg` dari whitelist unggah di `src/controllers/controller-upload.js`.
- [x] Sajikan `/uploads/` dengan `Content-Security-Policy: sandbox` + `X-Content-Type-Options: nosniff`
      via `setHeaders` di `server.js` (dipilih daripada `Content-Disposition: attachment` agar
      `<img>` di dashboard tetap tampil inline).
- [ ] (opsional) Turunkan `unsafe-inline` hanya pada rute `/docs`.
- [x] Verifikasi: upload `.svg` → ditolak; `.png` → diterima; file tersaji dengan header sandbox. (3/3)

### SEC-07 · SEDANG · CORS merefleksikan origin sembarang
- [x] Ganti `origin:true` di `server.js` dengan daftar origin yang diizinkan eksplisit
      (`CORS_ORIGINS`, default: domain production + localhost dev).
- [x] Verifikasi: `Origin: evil.example` → tanpa header `access-control-allow-origin`;
      origin yang diizinkan → `access-control-allow-origin` sesuai.

### SEC-08 · SEDANG · Tanpa rate limiting
- [x] Pasang `@fastify/rate-limit` (global `max:100`/menit per IP) + `trustProxy: true` di `server.js`.
- [x] Batas ketat via `config.rateLimit`: `/auth/login` & `/admin/login` 20/menit,
      `/auth/kirimotp` & `/auth/tesemail` 5/menit, `/auth/registrasi` 10/menit.
- [ ] (opsional) Lockout sementara setelah N kali gagal login + captcha/PoW.
- [x] Verifikasi: 25 req ke `/auth/login` → 20 diproses, 5 × 429.

### SEC-09 · SEDANG · Kebocoran informasi
- [x] Error handler global (`server.js::setErrorHandler`): pesan generik + request id di log,
      tanpa bocorkan stack/detail internal. Verifikasi: body JSON rusak → 400 generik.
- [x] Lindungi `/docs` — Swagger UI + `/docs/json` hanya didaftarkan bila `ENABLE_DOCS=true`.
      Verifikasi: `/docs` & `/docs/json` → 404.
- [x] Hapus `/callback/tesglobalset` & `/callback/tesglobalget` (route + handler).
      Verifikasi: `/callback/tesglobalget` → 404.
- [x] `GET /admin/user` — sudah dibatasi role [1,2] oleh SEC-05; code/email hanya terlihat
      superadmin/admin (bukan mitra). Redaksi ditunda agar dashboard Pengguna tetap berfungsi.

### SEC-10 · SEDANG · Kredensial tertanam di kode
- [x] Kredensial SMTP Zoho (`smtppro.zoho.com` / `farid@gemes.co.id`) dipindah dari
      `lib.js` ke `.env`, lalu ke tabel `t_setting` (dikelola via halaman Setting admin).
      `kirimemailotp` kini membaca `t_setting` (smtp_host/port/secure/user/pass/from);
      `smtp_pass` write-only (tidak dikembalikan GET) + terenkripsi AES-256-GCM saat
      disimpan (kunci dari SECRET_KEY, `src/configs/secret.js`). Catatan:
      kata sandi masih yang lama (terkompromi) — WAJIB dirotasi.
- [x] JSESSIONID di `src/configs/bmsdoku.js` → pindah ke `.env` (`BMS_DOKU_JSESSIONID`).
- [x] `api_key` WhatsApp di `lib.js::waselesai` → pindah ke `.env` (`WA_API_KEY`).
- [x] Kredensial SMTP `mail.ailapos.com` di `lib.js::kirimemailsukses` (dead code) → fungsi dihapus.
- [ ] Rotasi nilai terekspos: JSESSIONID DOKU & WA api_key masih pending.
      Kata sandi SMTP SUDAH dirotasi (Zoho `smtppro.zoho.com`/`farid@gemes.co.id`
      → `mail.edifly-si.com`/`spklu@edifly-si.com`). Catatan: egress SMTP 465 ke
      `mail.edifly-si.com` tetap terblokir di VM (seperti host SMTP lainnya).
- [ ] Tambah pemindaian rahasia (gitleaks/trufflehog) pada CI.

## Grup D — RENDAH / INFO

### SEC-11 · RENDAH · Kelemahan skema token
- [x] Ganti `MD5(email+PENGACAK)` → HMAC-SHA256 (integritas token) di `mobile-auth.js`,
      `controller-auth.js` (sign), `lib.js::cektoken`, `middleware/auth.js`.
      Verifikasi: token HMAC lolos `verifyMobileToken`; token MD5 lama ditolak.
      Catatan: app mobile TIDAK menghitung kunci ini (PENGACAK rahasia backend), hanya
      meneruskan token — token lama akan invalid → pengguna login ulang (transparan).
- [x] TTL token admin 24 jam → 8 jam (env `ADMIN_TOKEN_TTL_SECONDS`).
- [x] Hapus fallback `'spklu-dev-secret'` + fail-fast guard `SECRET_KEY`/`PENGACAK` di `server.js`.
- [x] (penguatan) bcrypt cost factor 8 → 10 di login/ganti/reset/registrasi + buat admin.
- [ ] (opsional) Mekanisme pencabutan/denylist token + TTL mobile 7 hari → lebih pendek.

### SEC-12 · RENDAH · Endpoint dev tersisa & galat internal terlempar
- [x] `/callback/tesglobal*` — sudah dihapus penuh di SEC-09 (route + handler), tidak perlu flag.
- [x] Non-OCPP: `startcharging`/`stopcharging` guard `state.gsocket` → `{success:false,'Chargebox tidak terhubung'}`;
      handler TCP `socket.on('data')` dibungkus try/catch + `.catch` pada `handle_responstar` (async).
      Verifikasi: startcharging tanpa chargebox terhubung → 200 dengan pesan bisnis (bukan stack trace).

### SEC-13 · INFO · Interpolasi LIMIT — SELESAI
- [x] `gettransaksi` memakai default + parameter terikat (`LIMIT $2`). Diverifikasi.

### Regresi modul Laporan (temuan fungsional audit) — SELESAI
- [x] `/admin/report/summary` gagal saat filter mitra aktif (`$3` tak terikat di query
      saldo). Diperbaiki (`saldoMitra` → `$1`). Diverifikasi: `summary?id_mitra=3` → 200.

## Urutan pengerjaan yang disarankan
1. SEC-02 + SEC-04 (token admin vs mobile + cektoken murni) — fondasi auth, membuka SEC-03/SEC-05.
2. SEC-03 + SEC-05 (IDOR + otorisasi peran) — setelah identitas ada di token.
3. SEC-01 (OCPP) — paralel, terpisah dari REST.
4. SEC-06..SEC-10 (XSS, CORS, rate limit, info leak, creds) — hardening berlapis.
5. SEC-11, SEC-12 (token scheme, endpoint dev) — perapian.

## Sesi berikutnya — tindak lanjut lintas-tim & konten

### Flutter DEV (perlu build & rilis aplikasi)
- [ ] 3 endpoint kirim Bearer: `simpantoken` (login_service.dart:236), `getharga` (scan_qr_service.dart:27),
      `paywithsaldo` (payment_method_service.dart:95) — ganti `defaultOptions()` → `authOptions(token)`.
- [ ] Penanganan `invalid0` di aplikasi (bersihkan sesi + arahkan ke /login).
- [ ] Hapus `SECRET_KEY` & `PENGACAK` dari `.env` Flutter — rahasia backend-only, jangan dibundle ke APK/IPA.

### Backend / konten
- [ ] EULA/ToS: isi placeholder `[NAMA BADAN HUKUM PENYELENGGARA]`, `[EMAIL KONTAK]`, `[TANGGAL]`
      + review tim legal, lalu rebuild dashboard.
- [ ] Konfirmasi alur berita: jika ada unggahan video, tambah `.mp4`/`.webm` ke `ALLOWED_EXT`
      di `controller-upload.js` (folder `berita/video` sudah ada tapi ekstensi video ditolak).
- [ ] (keputusan) Revert sementara `/chargebox/getharga` ke `mobileKeyAuth` bila ada pengguna aktif
      yang alur scan-QR-nya terblokir, sampai build Flutter rilis.
- [x] Rotasi password SMTP dari halaman Setting (nilai lama terkompromi) — SELESAI:
      kini `mail.edifly-si.com` / `spklu@edifly-si.com`. Catatan: SMTP egress 465 masih terblokir.

