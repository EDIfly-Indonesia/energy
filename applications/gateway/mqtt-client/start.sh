#!/bin/bash

# Start MQTT Client
cd /opt/energy/applications/gateway/mqtt-client

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -f ".installed" ]; then
    pip3 install -r requirements.txt
    touch .installed
fi

# Run client
python3 mqtt_client.py
