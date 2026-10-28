#!/bin/bash

echo "🔄 Resetting InfluxDB..."

# Stop and remove
docker stop energy-influxdb 2>/dev/null
docker rm energy-influxdb 2>/dev/null

# Remove data
echo "⚠️  Removing all InfluxDB data..."
sudo rm -rf /opt/energy/data/influxdb/*

# Start fresh
cd /opt/energy/infrastructure/compose/core
docker compose up -d influxdb

echo "⏳ Waiting for InfluxDB to start..."
sleep 15

# Setup
echo "📝 Setting up InfluxDB..."
SETUP_OUTPUT=$(docker exec -it energy-influxdb influx setup \
  --username admin \
  --password Pltsapp2026** \
  --org energy_platform \
  --bucket telemetry \
  --retention 30d \
  --force 2>&1)

echo ""
echo "Setup output:"
echo "$SETUP_OUTPUT"

# Extract token
TOKEN=$(echo "$SETUP_OUTPUT" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo ""
  echo "✅ Token created:"
  echo "$TOKEN"
  
  # Save to .env
  ENV_FILE="/opt/energy/applications/plts/backend/.env"
  if [ -f "$ENV_FILE" ]; then
    sed -i '/INFLUXDB_TOKEN/d' "$ENV_FILE"
    echo "INFLUXDB_TOKEN=$TOKEN" >> "$ENV_FILE"
    echo "✅ Token saved to $ENV_FILE"
  fi
  
  ENV_INFLUX="/opt/energy/infrastructure/compose/core/influxdb/.env"
  if [ -f "$ENV_INFLUX" ]; then
    sed -i '/INFLUX_TOKEN/d' "$ENV_INFLUX"
    echo "INFLUX_TOKEN=$TOKEN" >> "$ENV_INFLUX"
    echo "✅ Token saved to $ENV_INFLUX"
  fi
  
  # Test token
  echo ""
  echo "🧪 Testing token..."
  TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Token $TOKEN" \
    http://localhost:8086/api/v2/buckets)
  
  if [ "$TEST_RESULT" = "200" ]; then
    echo "✅ Token works!"
  else
    echo "⚠️  Token test failed with status: $TEST_RESULT"
  fi
else
  echo "❌ Failed to extract token"
fi

echo ""
echo "🎉 InfluxDB reset completed!"
