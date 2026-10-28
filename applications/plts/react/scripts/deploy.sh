#!/bin/bash
# Deploy frontend React to VM-Energy

set -e

echo "🚀 Membuat aplikasi React frontend..."
cd /opt/energy/applications/plts/react

echo "Clean Cache Build"
sudo rm -rf dist
sudo rm -rf node_modules/.vite

npm run build

echo "📤 Mengupload ke VM-Energy..."
scp -r dist/* vm-energy:/opt/energy/applications/plts/react/

echo "✅ Deploy selesai!"
