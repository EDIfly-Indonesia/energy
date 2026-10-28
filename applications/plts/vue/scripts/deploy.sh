#!/bin/bash
# Deploy frontend to VM-Energy

echo "🚀 Building frontend..."
npm run build

echo "Uploading to VM-Energy..."
scp -r dist/ vm-energy:/opt/energy/applications/plts/vue/

echo "✅ Deploy completed!"
