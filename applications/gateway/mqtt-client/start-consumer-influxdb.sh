#!/bin/bash

# Load environment
export ENV_FILE="/opt/energy/applications/gateway/mqtt-client/.env.influx"

# Activate virtual environment
cd /opt/energy/applications/gateway/mqtt-client
source venv/bin/activate

# Run consumer
python mqtt_consumer_influxdb.py
