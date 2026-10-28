#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MQTT Gateway untuk IoT Router
=============================
- Menerima data dari device (serial/Modbus)
- Mengirim data ke MQTT Broker (RabbitMQ)
- Menerima perintah dari MQTT Broker
- Registrasi device otomatis

Data Tenant/Site/Device disesuaikan dengan database seeder terbaru.
"""

import json
import logging
import os
import sys
import time
import signal
import random
import threading
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

# Load environment variables
load_dotenv()

# ─── Configuration ──────────────────────────────────────────────
MQTT_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'admin')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'Pltsapp2026**')
MQTT_TLS = os.getenv('MQTT_TLS_ENABLED', 'false').lower() == 'true'

# Device Configuration (menggunakan ID dari seeder database)
DEVICE_ID = os.getenv('DEVICE_ID', '0301fed5-bb55-416b-97f1-a8a322a548d6')
DEVICE_MODEL = os.getenv('DEVICE_MODEL', 'Sungrow Battery 987')
DEVICE_SERIAL = os.getenv('DEVICE_SERIAL', 'SN-000001')

# Topic Configuration
TOPIC_PREFIX = os.getenv('TOPIC_PREFIX', 'energy')
TENANT_ID = os.getenv('TENANT_ID', 'PT Telkom')
SITE_ID = os.getenv('SITE_ID', 'Jakarta Plant A')

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', '/opt/energy/applications/gateway/logs/mqtt-gateway.log')

# ─── Logging Setup ──────────────────────────────────────────────
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ─── State ──────────────────────────────────────────────────────
is_running = True
connected = False

# ─── Signal Handling ────────────────────────────────────────────
def signal_handler(sig, frame):
    global is_running
    logger.info("Shutdown signal received...")
    is_running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ─── Device Data Simulator ──────────────────────────────────────
class DeviceSimulator:
    """Simulasi pembacaan data dari device (untuk testing)"""

    def __init__(self, device_id):
        self.device_id = device_id
        self.base_power = 5000 + random.randint(0, 1000)
        self.base_voltage = 230
        self.base_current = 21

    def read(self):
        """Simulasi membaca data dari device"""
        return {
            "p_active": round(self.base_power + random.randint(-500, 500), 2),
            "p_reactive": round(150 + random.randint(-20, 20), 2),
            "p_apparent": round(self.base_power + random.randint(-300, 300), 2),
            "v_ac": round(self.base_voltage + random.randint(-5, 5), 2),
            "c_ac": round(self.base_current + random.randint(-2, 2), 2),
            "f_grid": round(50 + (random.random() - 0.5) * 0.5, 3),
            "t_inverter": round(35 + random.randint(0, 15), 1),
            "e_daily": round(120 + random.randint(0, 30), 2),
            "e_total": round(42500 + random.randint(0, 500), 2),
            "b_soc": round(60 + random.randint(0, 35), 1),
            "s_device": "ONLINE",
            "s_grid": "CONNECTED",
        }

# ─── MQTT Callbacks ─────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    global connected
    if rc == 0:
        connected = True
        logger.info(f"✅ Connected to MQTT Broker: {MQTT_HOST}:{MQTT_PORT}")

        # Subscribe ke topik command
        command_topic = f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/command/#"
        client.subscribe(command_topic)
        logger.info(f"📡 Subscribed to: {command_topic}")

        # Register device
        register_device(client)
    else:
        connected = False
        logger.error(f"❌ Connection failed, code: {rc}")

def on_disconnect(client, userdata, rc):
    global connected
    connected = False
    logger.warning(f"⚠️  Disconnected, code: {rc}")

def on_message(client, userdata, msg):
    """Handle incoming MQTT messages (commands)"""
    try:
        payload = json.loads(msg.payload.decode())
        logger.info(f"📨 Command received: {msg.topic} -> {payload}")

        # Parse command
        if msg.topic.endswith('/ping'):
            handle_ping(client, payload)
        elif msg.topic.endswith('/set_config'):
            handle_set_config(client, payload)
        elif msg.topic.endswith('/restart'):
            handle_restart(client, payload)
        else:
            logger.warning(f"⚠️  Unknown command: {msg.topic}")

    except json.JSONDecodeError:
        logger.error(f"❌ Invalid JSON: {msg.payload.decode()}")
    except Exception as e:
        logger.error(f"❌ Error handling message: {e}")

def on_publish(client, userdata, mid):
    logger.debug(f"✅ Published, ID: {mid}")

# ─── Command Handlers ────────────────────────────────────────────
def handle_ping(client, payload):
    """Handle ping command"""
    response = {
        "type": "pong",
        "data": {
            "deviceId": DEVICE_ID,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "OK"
        }
    }
    client.publish(
        f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/command/response",
        json.dumps(response),
        qos=1
    )
    logger.info("🏓 Pong response sent")

def handle_set_config(client, payload):
    """Handle configuration update"""
    config = payload.get('data', {})
    logger.info(f"⚙️ Config updated: {config}")
    # TODO: Apply configuration to device

def handle_restart(client, payload):
    """Handle restart command"""
    logger.info("🔄 Restarting device...")
    # TODO: Implement actual restart logic

# ─── Device Registration ────────────────────────────────────────
def register_device(client):
    """Register device via MQTT"""
    try:
        reg_topic = f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/register"
        reg_payload = {
            "deviceId": DEVICE_ID,
            "serialNumber": DEVICE_SERIAL,
            "model": DEVICE_MODEL,
            "tenantId": TENANT_ID,
            "siteId": SITE_ID,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        result = client.publish(reg_topic, json.dumps(reg_payload), qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"📤 Registration sent: {reg_topic}")
        else:
            logger.error(f"❌ Failed to send registration")

    except Exception as e:
        logger.error(f"❌ Registration error: {e}")

# ─── Main Loop ──────────────────────────────────────────────────
def main():
    logger.info(f"🚀 Starting MQTT Gateway...")
    logger.info(f"   Device: {DEVICE_ID} ({DEVICE_MODEL})")
    logger.info(f"   Broker: {MQTT_HOST}:{MQTT_PORT}")
    logger.info(f"   Topic: {TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/{DEVICE_ID}")

    # Inisialisasi MQTT Client
    client = mqtt.Client(
        client_id=f"{DEVICE_ID}_{int(time.time())}",
        protocol=mqtt.MQTTv311
    )

    # Set callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.on_publish = on_publish

    # Set credentials
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    # TLS configuration
    if MQTT_TLS:
        client.tls_set(cert_reqs=mqtt.ssl.CERT_REQUIRED)
        client.tls_insecure_set(False)

    try:
        # Connect to broker
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()

        # Tunggu koneksi
        time.sleep(2)

        # Inisialisasi device simulator
        device = DeviceSimulator(DEVICE_ID)

        # Main loop
        last_telemetry = 0
        telemetry_interval = int(os.getenv('TELEMETRY_INTERVAL', 15))

        while is_running:
            if connected:
                # Send telemetry setiap interval
                current_time = time.time()
                if current_time - last_telemetry >= telemetry_interval:
                    # Read data dari device
                    data = device.read()

                    # Build payload
                    payload = {
                        "deviceId": DEVICE_ID,
                        "model": DEVICE_MODEL,
                        "serialNumber": DEVICE_SERIAL,
                        "tenant": TENANT_ID,
                        "site": SITE_ID,
                        "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                        "data": data,
                        "quality": "GOOD"
                    }

                    # Publish ke MQTT
                    topic = f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/{DEVICE_ID}"
                    result = client.publish(topic, json.dumps(payload), qos=1)

                    if result.rc == mqtt.MQTT_ERR_SUCCESS:
                        logger.debug(f"📤 Telemetry sent: {topic}")
                    else:
                        logger.error(f"❌ Failed to send telemetry")

                    last_telemetry = current_time

            # Health check
            if not connected and is_running:
                logger.warning("⚠️  Disconnected, attempting to reconnect...")
                try:
                    client.reconnect()
                    time.sleep(2)
                except:
                    pass

            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        logger.info("👋 MQTT Gateway stopped")

if __name__ == "__main__":
    main()
