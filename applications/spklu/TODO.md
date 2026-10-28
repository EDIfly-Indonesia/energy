# TODO — Migrasi SPKLU ke Full JavaScript + Single PostgreSQL

Target akhir:
- Backend: Fastify + Swagger (full JavaScript), satu sumber data PostgreSQL (`energy-postgres`).
- Dashboard: React.js (full JavaScript), konsumsi REST API backend.
- Dihapus: Express lama, CodeIgniter (PHP), MySQL, Supabase.

## Keputusan yang harus dikunci dulu (blocker)

- [ ] Letak skema SPKLU di PostgreSQL: database terpisah `spklu` (sudah dibuat) vs gabung ke `energy_platform`. Rekomendasi: `spklu` terpisah pada instance `energy-postgres` yang sama.
- [x] Sumber otoritatif `berita`: TIDAK dobel — `berita` (PostgreSQL) = notifikasi user mobile (jenis_berita: welcome, pembayaran, tunggubayartopup, topupgagal, refundsukses/refundpending, finishcharging, dst); `t_berita` (MySQL) = konten berita/news (radius/geo untuk endpoint getberita). Dua fungsi berbeda dengan nama mirip.
- [x] Inventaris pembaca `charging`/`berita`/`konektor` oleh app mobile (Supabase realtime). Penggantinya REST + polling pendek: `POST /informasi/getberita_user`, `/informasi/setberitadibaca`, `/informasi/getkonektor`, `/informasi/getcharging`. Lihat `MOBILE-INBOX-MIGRATION.md`.

## Fase 0 — Fondasi backend Fastify — SELESAI

- [x] Scaffold entrypoint Fastify baru (`server.js`), daftarkan `@fastify/swagger` + `@fastify/swagger-ui` (+ helmet/cors/formbody).
- [x] Pindahkan server OCPP (ocpp-rpc) ke `src/ocpp/server.js` dan server TCP (net, 8484) ke `src/nonocpp/server.js`; cron jobs ke `src/jobs/scheduler.js`.
- [x] Pertahankan pool `mysql2` + `pg` (DB belum dipindah).
- [x] Hapus dead import + dependency `@supabase/supabase-js`; buang dependency tak terpakai (`sharp`, `mysql`, `request-promise`, `nodemailer-express-handlebars`).

## Fase 1 — Migrasi route Express → Fastify (per grup) + Swagger — SELESAI (auth belum di-hardening)

- [x] Grup auth (16 route unik; duplikat `POST /auth/registrasi` diperbaiki).
- [x] Grup user (3).
- [x] Grup chargebox (2).
- [x] Grup informasi (9).
- [x] Grup transaction (4).
- [x] Grup wallet (6).
- [x] Grup callback (3).
- [x] Grup nonocpp (2). Total 45 route terdaftar di Swagger.
- [x] Buang controller basi: `controller-chargebox_2.js`, `controller-chargebox_old.js`, `controller-transaction-backup.js`.
- [~] Auth: dipertahankan lewat adapter (`lib.cektoken`/`cekkey` di dalam controller). Fastify preHandler-based auth BELUM dipasang — butuh `SECRET_KEY`/`PENGACAK`/`KEY_HEADER` di `.env` + keputusan endpoint mana yang wajib auth.
- [~] Skema Swagger: tags + summary + body (loose object) per endpoint. Response model masih longgar (belum didetailkan per field).
- [x] Entrypoint: `package.json` `main` + `start` → `server.js`. (Dockerfile masih `npm run dev`; ganti ke `npm start` untuk produksi bila perlu.)
- [~] Smoke test: boot + `/docs/json` (45 path) + `/auth/getsetting` + `/informasi/welcome` OK. Full flow (login, getberita, simpanorder, start/stop) belum — butuh MySQL berjalan + env secrets.

## Fase 2 — Dashboard: CodeIgniter → React.js (React + TypeScript + Bun + Tailwind) — SELESAI

- [x] Scaffold React (Vite + TypeScript) di `dashboard-react/`; build lolos (`tsc && vite build`).
- [x] Migrasi ke `dashboard/` (ganti CodeIgniter) dengan Bun + Tailwind v4: `bun install` + `bun run build` lolos (45 module), server produksi `bun server.ts` (SPA fallback) teruji; styling via Tailwind `@apply` di `src/index.css`; `Dockerfile` (oven/bun) + `docker-compose.yml` di network `energy-core`.
- [x] Endpoint admin login (`POST /admin/login`, auth `t_users_admin` md5 — parity lama) + halaman login React terhubung. Endpoint mobile TIDAK disentuh.
- [x] Endpoint admin dashboard (`GET /admin/dashboard`), list chargebox (`GET /admin/chargebox`), list transaksi (`GET /admin/transaction`) + halaman React (Beranda, Chargebox, Transaksi) + router/layout + auth token.
- [x] CRUD Area (`/admin/area` list/create/update/delete) + CRUD Chargebox (`/admin/chargebox` + `:id` get/post/put/delete) + konektor (`/admin/chargebox/:chargeboxId/connector`, `/admin/connector/:id`) + halaman React Area & Chargebox (form + konektor inline).
- [x] Mitra (list/create/update/soft-delete), Setting (PPN/PBJT/admin wallet), Wallet (refund list + mark done, topup list), Pengguna (admin user list/create/update + roles) — endpoint + halaman React.
- [x] Migrasi modul per area: auth+home+chargebox+area+mitra+transaksi+wallet+pengguna+setting+LAPORAN selesai. Modul Laporan keuangan dibangun ULANG di atas tabel SPKLU (bukan port Laporan.php POS): endpoint `GET /admin/report/{summary,transaction,topup,refund,mitra}` + halaman React `Laporan.tsx` (filter rentang tanggal, grup harian/bulanan, ringkasan pemasukan/pengeluaran/net/saldo user, tab transaksi/topup/refund/per-mitra).
- [x] Upload foto multipart: endpoint `POST /admin/upload` (@fastify/multipart, simpan ke `backend/uploads/` + @fastify/static di `/uploads/`) + komponen React `UploadField` (Area.foto & Chargebox.foto).
- [x] Role/owner filtering: login admin mengembalikan `type_id`/`type_code`/`id_role`/`id_mitra`; middleware `admin-auth` (JWT) di semua route `/admin/*` (kecuali login); filter nav sidebar React per role; owner scope (mitra) memfilter chargebox/transaksi lewat `t_users_admin.id_mitra`.
- [~] Semua akses data lewat Fastify API. Format angka Indonesia (id-ID) — sebagian masih `toLocaleString('id-ID')` inline.
- [x] CodeIgniter (PHP) di `dashboard/` dipindah ke `_dashboard-php-backup/`; app baru React+Bun+Tailwind kini di `dashboard/`. Direktori `dashboard-react/` (Fase 2 lama) sudah DIHAPUS.

## Fase 3 — Konsolidasi data: MySQL → PostgreSQL (single source) — PORT SELESAI

- [x] 32 tabel MySQL → DDL PostgreSQL + 13 trigger PL/pgSQL + view `menu` + seed data, ditulis di `database/migrate_to_postgres.sql` dan DITERAPKAN ke DB `spklu` (total 35 tabel: 32 baru + berita/charging/konektor).
- [x] Port lapisan DB backend dari `mysql2` → `pg`: `database.service.js` jadi single pg pool (`query`/`run` helper + alias `pool`/`poolpostgre`/`queryMySQL`). SEMUA SQL di controller/auth-chargebox-informasi-transaction-user-callback-nonocpp-admin×3, configs/global-lib-non_ocpp, services/chargingState, jobs/scheduler-refund×2, ocpp/handle sudah diport (dialek MySQL→PG). Terverifikasi: `node -c` semua file, boot OK, query jalan (carabayar, admin dashboard DATE_FORMAT/CURDATE/MONTH, nearest haversine+jsonb_agg, getharga IS NOT DISTINCT FROM).
- [x] Perbaikan runtime DDL: `t_transaction_detail/detail2/manual.id_tag DEFAULT ''` (trigger `ttransaction_ai` butuh default — dulu MySQL non-strict otomatis ''); tabel `t_log` + `t_log_ebike` ditambahkan (dipakai kode tapi tidak ada di db.sql).
- [x] Hapus service `mysql` + `phpmyadmin` dari docker-compose (app kini hanya `energy-postgres` via network `energy-core` — network sudah berjalan); `.env` var MySQL dihapus; `mysql2` dihapus dari package.json; file `handle_old_3.js` (sisa mysql2) dihapus.
- [~] Kolom JSON kini `jsonb` — penulisan sudah pakai `::jsonb`; PEMBACAAN kolom jsonb (mis. `t_transaction.pembayaran`, `t_topup.pembayaran`) belum diverifikasi vs ekspektasi mobile (pg return objek, mysql2 return string). Perlu smoke test data real.
- [x] Event `e_kwhuser` (reset kWh bulanan): dipindah ke app scheduler (`src/jobs/scheduler.js` → `resetMonthlyKwh`, cek tanggal 1 tiap jam).
- [x] Migrasi data MySQL: tidak ada MySQL berjalan (tak ada container/volume/dump) — hanya seed `db.sql`. Sisa seed (t_bankwithdrawl 99, t_berita 6, t_jenismember 1) dimigrasi via `database/migrate_data.js` + diverifikasi.
- [x] Verifikasi end-to-end flow charging (DB-level, tanpa chargebox fisik): `e2e-test.cjs` — admin auth/role/upload + simpanorder (trigger detail) + callback VA (ready/paid) + trigger kWh tracking. 21/21 lolos. Bagian OCPP (RemoteStart/Stop) butuh chargebox nyata.

## Verifikasi umum

- [ ] `docker compose config` valid untuk backend (dan dashboard baru).
- [ ] Smoke test full flow pasca tiap fase.
- [ ] Tidak ada sisa dependency `mysql2`/`mysqli`/Supabase di kode.

## Risiko & catatan

- Fase 3 paling berisiko; kerjakan setelah Fase 1 & 2 stabil.
- App mobile yang membaca Supabase realtime sudah punya pengganti REST (`/informasi/getberita_user`, `/setberitadibaca`, `/getkonektor`, `/getcharging`); realtime diganti polling pendek. Yang tersisa: penerapan di sisi Flutter (lihat `MOBILE-INBOX-MIGRATION.md`).
- Migrasi data MySQL→PostgreSQL wajib divalidasi baris-per-baris (bukan asal `INSERT`).
