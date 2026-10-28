#!/bin/bash

# ─── Configuration ──────────────────────────────────────────────────────────
WORKDIR="/opt/energy/applications/plts/backend/src/seeders"
cd $WORKDIR || exit

NODE_BIN="/home/ariefrs/.nvm/versions/node/v22.23.1/bin/node"
ENV_FILE="../../.env"

# ─── Default Date Range ─────────────────────────────────────────────────────
# Bisa di-override dengan parameter: ./run-seeder.sh "2026-06-01T00:05:00+07:00" "2026-07-24T23:55:00+07:00" 15
START_DATE="${1:-2026-06-01T00:05:00+07:00}"
END_DATE="${2:-2026-07-24T23:55:00+07:00}"
INTERVAL="${3:-15}"

# Bersihkan argumen dari karakter aneh (newline, carriage return, dll)
START_DATE=$(echo "$START_DATE" | tr -d '\n\r' | xargs)
END_DATE=$(echo "$END_DATE" | tr -d '\n\r' | xargs)
INTERVAL=$(echo "$INTERVAL" | tr -d '\n\r' | xargs)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Memulai Background Seeding Telemetry..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📅 Period: $START_DATE to $END_DATE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏱️  Interval: $INTERVAL minutes"

# ─── Ambil semua Device ID ──────────────────────────────────────────────────
DEVICES=$($NODE_BIN --env-file=$ENV_FILE -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.device.findMany({select:{id:true}}).then(d => {
    console.log(d.map(x => x.id).join(' '));
    process.exit(0);
  });
")

# ─── Looping per device ─────────────────────────────────────────────────────
for DEVICE_ID in $DEVICES; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏳ Memulai seeding untuk ID: $DEVICE_ID"
  $NODE_BIN --env-file=$ENV_FILE seed-worker.js "$DEVICE_ID" "$START_DATE" "$END_DATE" "$INTERVAL"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🎉 Semua device selesai di-seed."
