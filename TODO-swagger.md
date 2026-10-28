# TODO: Rapikan Dokumentasi Swagger — 48 Endpoint

Scope: 48 paths, 78 operasi, 14 grup resource.
Status: SELESAI — 0 schema tersisa, semua response terdokumentasi (0 "Default Response"), tags 78/78.

## Persiapan (fondasi) — kerjakan dulu sekali

- [x] Buat modul schema bersama, mis. `src/api/schemas/common.js`: response envelope `{ success, data, meta, errors }`, schema error standar (400/401/404/500), dan schema pagination (`page`, `limit`, `total`, `totalPages`).
- [x] Verifikasi Swagger UI jalan via nginx (`/plts/api/docs/` -> `/docs`) dan `/docs/json` mengeluarkan schema baru setelah tiap grup selesai.
- [x] Tetapkan konvensi: `tags` per resource, `summary` singkat, `description` opsional, `querystring`/`params`/`body`/`response` eksplisit.

## Per grup (urut prioritas: yang baru saja kita sentuh dulu)

- [x] Rates (5 ops) — `rate.routes.js`: body schema `RatePayload` (code, name, fixedAmount, currency, description, isActive), response `Rate`, tags `Rates`. Catat constraint FIXED-only di description.
- [x] Telemetry error-codes (1 op) — `telemetry.routes.js`: response `ErrorCode[]` (code, category, severity, descriptionId/En), querystring filter `category`/`severity`, tags `Telemetry`.
- [x] Telemetry realtime/summary (1 op) — response schema field baru: `errorCode`, `errorLabel`, `errorSeverity`, `efficiency`, `cosPhi`, plus `current`/`temperature`/`frequency` yang sudah dikoreksi. Paling rawan menyesatkan pengguna API.
- [x] Telemetry sisanya (10 op) — aggregates, latest, daily-summary, data, device/{id}, realtime/{deviceId}, timeseries, summary, `/`.

## Sisanya (CRUD standar, ikut pola yang sama)

- [x] Alarms (7) — termasuk `resolve`, `resolved/list`.
- [x] Auth (6) — login, refresh-token, verify, change-password, forgot-password, logout.
- [x] Users (7) — termasuk `{id}/permissions`.
- [x] Roles (7) — termasuk `{id}/permissions`.
- [x] Mappings (6) — termasuk `device/{deviceId}`.
- [x] Tenants (5)
- [x] Devices (5)
- [x] Invoices (5)
- [x] Companies (5)
- [x] Sites (3)
- [x] Reports (3) — energy, export.
- [x] Permissions (2) — termasuk `module/{module}`.

## Penutup

- [x] Jalankan `node -c` per file backend yang diedit.
- [x] Restart `plts-backend`, buka `/docs/json`, konfirmasi `components.schemas` > 0 dan tidak ada lagi "Default Response" pada grup yang sudah dikerjakan.
- [x] Update `docs/api-contract.md` bila masih dipakai sebagai referensi terpisah — TIDAK DIPERLUKAN (file tersebut sudah hilang bersama pohon `backend/backend/` yang dihapus; Swagger UI kini menjadi sumber dokumentasi utama).

Catatan: pekerjaan ini murni di backend (file route + controller), tidak menyentuh frontend atau skema DB.
