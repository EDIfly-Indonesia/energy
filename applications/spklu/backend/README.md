# Project Setup

Panduan menjalankan SPKLU di VM ini. **Tidak memakai Supabase.** Semua data ada
di PostgreSQL lokal (`energy-postgres`), dan semua akses data lewat backend
Fastify. Aplikasi mobile memanggil REST API, bukan database langsung.

## 1. PostgreSQL

Database berjalan sebagai container Docker di VM ini:

```bash
docker ps | grep energy-postgres
```

Database `spklu`, user `energy_app`. Kredensial ada di `backend/.env`
(`DB_USER_POSTGRE`, `DB_PASSWORD_POSTGRE`, `DB_DATABASE_POSTGRE`) dan tidak
pernah ditulis di dokumen ini.

Kalau container belum ada, buat sekali:

```bash
docker run -d --name energy-postgres \
  -e POSTGRES_USER=energy_app \
  -e POSTGRES_PASSWORD=<lihat .env> \
  -e POSTGRES_DB=spklu \
  -p 127.0.0.1:5432:5432 \
  -v energy-pgdata:/var/lib/postgresql/data \
  postgres:16
```

## 2. Import Database

Skema awal: `database/migrate_to_postgres.sql`. Untuk database kosong:

```bash
docker exec -i energy-postgres psql -U energy_app -d spklu < database/migrate_to_postgres.sql
```

File `database/db.sql` adalah DDL MySQL lama, disimpan hanya sebagai rujukan
riwayat. Jangan dijalankan.

## 3. Konfigurasi

Salin `backend/.env.example` menjadi `backend/.env` lalu isi. Variabel yang
wajib ada: `SECRET_KEY`, `PENGACAK`, `KEY_HEADER`, `DB_USER_POSTGRE`,
`DB_PASSWORD_POSTGRE`, `DB_DATABASE_POSTGRE`. Jangan commit `.env`.

## 4. Jalankan Backend

Backend dikelola pm2 di VM ini:

```bash
cd backend
npm install
pm2 start server.js --name spklu-backend
pm2 restart spklu-backend    # setelah mengubah kode
pm2 logs spklu-backend       # lihat log
```

Cek hidup:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/
```

API mendengarkan di `127.0.0.1:8080` (HTTP). Port 8484 dipakai server TCP
non-OCPP untuk chargebox, dan WebSocket OCPP berjalan terpisah.

## 5. Dashboard

```bash
cd dashboard
bun install
bun run build     # hasil ke dashboard/dist
```

nginx menyajikan `dashboard/dist` di `/spklu/` dan mem-proxy `/spklu/api/` ke
`127.0.0.1:8080` (prefix di-strip). Konfigurasi: `nginx/spklu.conf`.

## 6. Akses

| Tujuan | URL |
|---|---|
| Dashboard | https://energy.edifly-si.com/spklu/ |
| API mobile | https://energy.edifly-si.com/spklu/api/ |
| Swagger | https://energy.edifly-si.com/spklu/api/docs |
| Self-update APK | https://energy.edifly-si.com/spklu/download_apk/version.json |

## Requirements

- Docker (untuk `energy-postgres`)
- Node.js + npm (backend)
- Bun (dashboard)
- pm2 (proses backend)
- nginx (reverse proxy)
