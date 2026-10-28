# SPKLU — Laporan Uji Vulnerabilitas (Backend + Frontend)

Tanggal: 16 Oktober 2026
Lingkup: `/opt/energy/applications/spklu` — backend Fastify (`:8080`), dashboard React (`/spklu/`), nginx live.
Metode: audit dinamis (92 probe HTTP ke instance berjalan), analisis statis (SQLi/XSS/secret), `npm audit` + `bun audit`, inspeksi bundel frontend.
Semua uji bersifat read-only / membersihkan diri sendiri. Tidak ada akun nyata yang diubah.

## Ringkasan

| Severity | Jumlah | Temuan |
|---|---|---|
| KRITIS | 1 | Account takeover via OTP dikembalikan di response API |
| SEDANG | 2 | Swagger UI + spec API publik; dependensi `request` (EOL) dengan advisory kritis |
| RENDAH | 3 | Advisory dependensi frontend; lookup mitra bocorkan email/telp; token di localStorage |
| LULUS | 85 | 85 dari 92 probe dinamis |

---

## 1. KRITIS — Account takeover lewat OTP yang dikembalikan di response

**Endpoint:** `POST /auth/kirimotp` → `POST /auth/resetpassword`
**Status:** TERBUKTI EXPLOITABLE (direproduksi)

`controller-auth.js::kirimotp` mengirim OTP via email **dan** mengembalikannya di body response:

```
res.send({ success: true, message: otp.toString(), jenis: jenis })
```

`resetpassword` hanya mencocokkan `otp` itu dengan `otpStore` lalu menjalankan
`UPDATE t_user_mobile SET password=$1 WHERE email=$2`. Tidak ada verifikasi kepemilikan.

**Bukti (dijalankan terhadap instance live, email non-eksisten agar tidak merusak akun nyata):**

```
1) kirimotp response  : {"success": true, "message": "657245", "jenis": "email"}
2) resetpassword      : {"success": true, "message": "Update password berhasil"}
CHAIN: EXPLOITABLE
```

**Dampak:** siapa pun yang memiliki `KEY_HEADER` (dibundel di dalam APK Flutter — dapat diekstrak)
dapat mengganti password **akun mobile mana pun** hanya dengan mengetahui email korban:
1. `POST /auth/kirimotp {email: <korban>}` → OTP dikembalikan di field `message`.
2. `POST /auth/resetpassword {email, otp, passwordbaru}` → password akun berubah.

Tidak perlu akses ke inbox email korban.

**Perbaikan yang disarankan (server-side):**
- JANGAN kembalikan OTP di response. Kembalikan pesan generik (mis. `"OTP terkirim"`).
- Batasi rate-limit `kirimotp` per-email, bukan hanya per-IP (saat ini 5/menit per IP).
- Pertimbangkan menyimpan OTP di-hash (bukan plaintext di Map) dan mencatat audit log.
- Catatan: field `message` adalah bagian dari kontrak mobile beku — perlu koordinasi Flutter
  (aplikasi harus meminta pengguna membaca OTP dari email, bukan dari response).

---

## 2. SEDANG — Swagger UI + spec API terekspos publik

**Temuan:** `.env` backend berisi `ENABLE_DOCS=true` sementara `NODE_ENV=production`.
`server.js` mendaftarkan Swagger hanya bila `ENABLE_DOCS=true`.

```
curl -sk -H 'Host: energy.edifly-si.com' https://127.0.0.1/spklu/api/docs/      -> 200 (Swagger UI)
curl -sk -H 'Host: energy.edifly-si.com' https://127.0.0.1/spklu/api/docs/json  -> 200 (69 path terekspos)
```

**Dampak:** penyerang anonim dapat memetakan 69 endpoint (termasuk seluruh `/admin/*`),
skema parameter, dan deskripsi skema keamanan (`bearerAuth`, `keyHeader`) — mempermudah
penyusunan serangan lanjutan. Bertentangan dengan SEC-09 di `SECURITY-TODO.md` yang
menyatakan `/docs` harus 404 di produksi.

**Perbaikan:** set `ENABLE_DOCS=false` di `backend/.env` lalu `pm2 restart spklu-backend`.
Jika docs tetap dibutuhkan, batasi di nginx (allowlist IP internal) alih-alih membukanya publik.

---

## 3. SEDANG — Paket `request` (EOL) masih dipakai kode produksi

`npm audit` melaporkan 2 critical, 6 high, 12 moderate pada backend.
Dua advisory kritis berasal dari `request` + `form-data`:

| Paket | Severity | Advisory | Dipakai di |
|---|---|---|---|
| `request` | critical | SSRF (GHSA-p8p7-x288-28g6) | `configs/doku.js:473,516`, `configs/bmsdoku.js:164` |
| `form-data` | critical | CRLF injection / unsafe random boundary | (transitif via `request`) |
| `qs`, `tough-cookie`, `uuid` | moderate | DoS / prototype pollution | (transitif) |
| `nodemailer` | high | 14 advisory (SMTP injection, DoS, TLS) | `configs/lib.js:109` |

**Catatan eksploitabilitas:** jalur `request` saat ini memakai URL yang dibentuk dari
`url_api + target` (keduanya konstanta/env, bukan input pengguna) dan nama field form yang
tetap — sehingga SSRF/CRLF **belum dapat dipicu langsung**. Namun ini dependensi EOL dengan
severity kritis yang aktif dipanggil; `configs/doku.js` sudah memakai `axios` di fungsi lain,
jadi migrasi `postreq`/`getreq`/`bmsdoku` ke axios menghapus seluruh rantai ini.

**Perbaikan:** port `request.post/get` → `axios` (pola sudah ada di `doku.js`), lalu hapus
`request` dari `package.json`. `nodemailer` perlu dinaikkan ke 10.x (breaking — uji ulang alur OTP).

---

## 4. RENDAH — Advisory dependensi frontend

`bun audit`: 2 high, 5 moderate.

| Paket | Severity | Dampak nyata |
|---|---|---|
| `vite` | high | dev-server only (`server.fs.deny` bypass di Windows) — tidak ada di build produksi |
| `source-map-js` | high | build-time (via tailwind/postcss) |
| `react-router` | moderate | open-redirect via `<Link>`/`useNavigate` — **tidak dapat dieksploitasi**: dashboard tidak punya target navigasi dinamis (semua literal: `/`, `/login`) |
| `esbuild` | moderate | dev-server only |

**Perbaikan:** `bun audit fix` + naikkan `vite`/`react-router-dom`.

---

## 5. RENDAH — Observasi lain

- **Lookup mitra membocorkan email/telepon.** `GET /admin/mitra` untuk role `[1,2,3,6]`
  mengembalikan `id, name, email, telp`. Ini disengaja agar dropdown form chargebox terisi,
  dan sudah owner-scoped (mitra-owner hanya melihat mitra-nya sendiri). Pertimbangkan
  memangkas field untuk role operator bila tidak diperlukan.
- **Token admin di `localStorage`.** Pola SPA standar; tidak ada XSS yang ditemukan untuk
  mengeksploitasinya (tidak ada `dangerouslySetInnerHTML`/`innerHTML`). Pertimbangkan cookie
  `httpOnly` sebagai pertahanan berlapis.

---

## Yang sudah LULUS (85/92 probe)

- **Autentikasi admin:** 18 route GET `/admin/*` + `/admin/upload` → 401 tanpa token.
- **Cross-realm (SEC-02):** token mobile ditolak di `/admin/me`, `/dashboard`, `/user`, `/setting`, `/report/*`, `/transaction` → 401.
- **Pemalsuan JWT:** `alg:none`, secret salah, klaim `scope:admin` dihapus, token kedaluwarsa → 401.
- **Otorisasi peran (SEC-05):** `type_id=3` → 403 pada `user`/`setting`/`role`/report dan semua write `area`/`mitra`; tetap 200 pada `chargebox`/`transaction` (sesuai desain).
- **Auth mobile:** 26 endpoint → `invalid0` tanpa token; `login`/`registrasi`/`kirimotp`/`resetpassword` → `invalid` tanpa `key-header`.
- **IDOR (SEC-03):** `no_trans`/`id_user` milik user lain ditolak.
- **Injeksi SQL:** `?id_mitra`, `?from`, `?group` (report), `email` login, path param `chargebox` — semua parameterized atau di-whitelist; payload ditolak tanpa error DB.
- **Kebocoran info (SEC-09):** pesan error generik, tanpa stack trace/path internal; tidak ada `x-powered-by`.
- **Header keamanan:** helmet aktif (`x-content-type-options`, `x-frame-options`, CSP).
- **CORS (SEC-07):** origin asing tidak di-allow.
- **Upload (SEC-06):** `.svg`/`.html`/`.php`/`.js`/`.exe` ditolak; traversal nama file dinetralkan; traversal folder → 400.
- **OCPP (SEC-01):** identitas chargebox tak terdaftar ditolak saat handshake.
- **Rate limit (SEC-08):** `/auth/login` mengembalikan 429 setelah batas.
- **Frontend:** tidak ada nilai rahasia backend (`SECRET_KEY`, `PENGACAK`, `KEY_HEADER`, kredensial DB/DOKU/WA) yang bocor ke bundel `dist/` atau `src/`; tidak ada source map di produksi; tidak ada `dangerouslySetInnerHTML`/`eval`.

---

## Prioritas tindak lanjut

1. **SEGERA** — hentikan pengembalian OTP di response `/auth/kirimotp` (koordinasi Flutter).
2. **SEGERA** — `ENABLE_DOCS=false` + restart backend.
3. **Minggu ini** — migrasi `request` → `axios`; upgrade `nodemailer` 10.x.
4. **Backlog** — `bun audit fix`; pangkas field lookup mitra; evaluasi cookie httpOnly.

Skrip audit dapat dijalankan ulang: `vuln-audit.cjs` (92 probe dinamis) +
`frontend-secret-scan.cjs` (pemindaian rahasia bundel).
