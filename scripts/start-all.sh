#!/bin/bash

echo "🚀 Starting PLTS Platform..."

# Start Docker infrastructure
cd /opt/energy/infrastructure/compose/core
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Start backend
cd /opt/energy/applications/plts/backend
pm2 start ecosystem.config.js

# Start InfluxDB Dump Dummy Data Devices
cd /opt/energy/applications/gateway/mqtt-client
source venv/bin/activate

nohup python3 inverter_simulator.py --device-id INV-001 --interval 5 > /dev/null 2>&1 &
nohup python3 inverter_simulator.py --device-id INV-002 --interval 7 > /dev/null 2>&1 &
nohup python3 inverter_simulator.py --device-id INV-003 --interval 10 > /dev/null 2>&1 &

echo "✅ All services started!"
echo "Backend: http://localhost:9001"
echo "Swagger: http://localhost:9001/docs"
echo "RabbitMQ: http://localhost:15672"
echo "PgAdmin: http://localhost:8888"
echo "InfluxDB: http://localhost:8086"
echo "Kafka: http://localhost:9092"
