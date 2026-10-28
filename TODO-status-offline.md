# TODO: Perbaiki Inkonsistensi Status OFFLINE vs Telemetry Aktif

Masalah: device dengan status OFFLINE di PostgreSQL (SN-000005, dst.) masih punya telemetry segar di InfluxDB (efficiency 98,4%, cosPhi, dll.), sehingga UI menampilkan kontradiksi: OFFLINE + error E-001 tapi efisiensi terisi.
Akar masalah: (a) simulator publish untuk semua 55 device tanpa peduli status DB, (b) tidak ada yang menulis status/last_seen_at dari telemetry masuk, (c) getRealtimeSummary membaca status (PostgreSQL) dan telemetry (InfluxDB) dari dua sumber yang tidak sinkron.

## Tahap 1 — Simulator hormati status OFFLINE

- [x] Baca daftar device OFFLINE dari PostgreSQL (via API backend atau koneksi DB) saat simulator startup, dan refresh berkala.
- [x] Di `inverter_simulator.py`, skip publish untuk device yang statusnya OFFLINE di DB.
- [x] Verifikasi: SN-000005 berhenti memproduksi titik telemetry baru di InfluxDB.

## Tahap 2 — Backend tulis last_seen_at & sinkronkan status

- [x] Di telemetry-validator (atau writer) yang menerima telemetry masuk, update `tbl_devices.last_seen_at = now()` untuk device terkait.
- [x] Tentukan aturan sinkronisasi `status`: jika telemetry masuk → set status ONLINE (kecuali payload `s_device` bilang FAULT/OFFLINE, maka ikuti payload).
- [x] Verifikasi: `last_seen_at` terisi untuk device yang aktif; status berubah dari OFFLINE → ONLINE saat data masuk.

## Tahap 3 — Pengaman tampilan (backend)

- [x] Di `getRealtimeSummary`, jika `status === 'OFFLINE'`, paksa semua field `realtime` jadi null/empty (termasuk efficiency/cosPhi).
- [x] Verifikasi: device OFFLINE menampilkan "—" di kolom Efficiency dan semua kolom telemetry, konsisten dengan statusnya.

## Penutup

- [x] `node -c` untuk file backend yang diedit; `py_compile` untuk simulator.
- [x] Restart `plts-backend` + `plts-mqtt-gateway` (+ `plts-telemetry-validator`).
- [x] Smoke test: `/telemetry/realtime/summary` → device OFFLINE punya realtime kosong; device ONLINE punya data.
- [x] Konfirmasi tidak ada regresi di halaman Dashboard (Inverter Monitoring).

Catatan: pekerjaan menyentuh backend (validator/controller) + gateway (simulator Python). Tidak menyentuh frontend atau skema DB.
