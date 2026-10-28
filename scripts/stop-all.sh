#!/bin/bash

echo "🛑 Stopping PLTS Platform..."

# Stop backend
pm2 stop plts-backend

# Stop Docker infrastructure
cd /opt/energy/infrastructure/compose/core
docker compose down

echo "✅ All services stopped!"
