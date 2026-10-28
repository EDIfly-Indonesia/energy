#!/bin/bash
# Script untuk setup environment proyek PLTS di lokasi baru (/opt/energy)
PROJECT_DIR="/opt/energy"

echo "Setup environment PLTS..."

# 1. Pastikan Docker container berjalan
echo "Restarting Docker containers..."
sudo docker compose -f $PROJECT_DIR/infrastructure/compose/core/docker-compose.yml down
sudo docker compose -f $PROJECT_DIR/infrastructure/compose/core/docker-compose.yml up -d

# 2. Re-install/Update dependensi & Prisma (opsional tapi disarankan setelah pindah)
echo "Ensuring backend dependencies..."
cd $PROJECT_DIR/applications/plts/backend
npm install
npx prisma generate

# 3. Restart PM2
echo "Restarting PM2 backend..."
pm2 delete plts-backend || true
pm2 start ecosystem.config.js

echo "Setup selesai!"
