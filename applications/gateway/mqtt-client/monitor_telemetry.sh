#!/usr/bin/env bash

# ─── Configuration ──────────────────────────────────────────────
INFLUX_ORG="energy_platform"
INFLUX_TOKEN="17ea8b7b8b43a29fbbfd1c58267d9efb836842ca3bc5f246bfa74135203bc1ef"
CONTAINER_NAME="energy-influxdb"

# Interval pemantauan (detik)
REFRESH_INTERVAL=2

# ─── Flux Query ─────────────────────────────────────────────────
# Mengambil record daya aktif (p_active) dan tegangan (v_dc) terbaru dalam 2 menit terakhir
QUERY='from(bucket: "telemetry")
  |> range(start: -2m)
  |> filter(fn: (r) => r._measurement == "power" or r._measurement == "voltage")
  |> filter(fn: (r) => r._field == "p_active" or r._field == "v_dc")
  |> last()
  |> keep(columns: ["_time", "device_id", "site", "site_tz", "_measurement", "_field", "_value"])'

# ─── Execution ──────────────────────────────────────────────────
echo "🚀 Memulai pemantauan real-time InfluxDB (Tekan CTRL+C untuk keluar)..."
sleep 1

watch -n ${REFRESH_INTERVAL} "docker exec ${CONTAINER_NAME} influx query \
  --org ${INFLUX_ORG} \
  --token \"${INFLUX_TOKEN}\" \
  '${QUERY}'"
