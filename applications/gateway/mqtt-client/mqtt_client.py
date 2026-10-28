#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MQTT Client untuk IoT Gateway
=============================
Mengirim data telemetry dari device ke EMQX Broker
"""

import json
import logging
import os
import sys
import time
import random
import signal
from datetime import datetime
from dotenv import load_dotenv
import paho.mqtt.client as mqtt
import requests
import serial
import threading

# Load environment variables
load_dotenv()

# ─── Configuration ──────────────────────────────────────────────
MQTT_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'gateway')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'gateway123')
MQTT_TLS = os.getenv('MQTT_TLS_ENABLED', 'false').lower() == 'true'

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:9001')

DEVICE_ID = os.getenv('DEVICE_ID', 'INV-001')
DEVICE_MODEL = os.getenv('DEVICE_MODEL', 'SG110CX')
DEVICE_SERIAL = os.getenv('DEVICE_SERIAL', 'SN-2026-001')

TOPIC_PREFIX = os.getenv('TOPIC_PREFIX', 'energy')
TENANT_ID = os.getenv('TENANT_ID', 'demo-tenant')
SITE_ID = os.getenv('SITE_ID', 'demo-site')

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', '/opt/energy/applications/gateway/logs/mqtt-client.log')

# ─── Logging ────────────────────────────────────────────────────
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
registered = False

# ─── Signal Handling ────────────────────────────────────────────
def signal_handler(sig, frame):
    """Handle shutdown signals"""
    global is_running
    logger.info("Shutdown signal received...")
    is_running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ─── MQTT Callbacks ─────────────────────────────────────────────

def on_connect(client, userdata, flags, rc):
    """Callback saat koneksi MQTT berhasil"""
    global connected
    if rc == 0:
        connected = True
        logger.info(f"✅ Connected to MQTT Broker: {MQTT_HOST}:{MQTT_PORT}")
        # Subscribe ke topik untuk menerima perintah
        client.subscribe(f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/command/#")
        logger.info(f"📡 Subscribed to: {TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/command/#")
        
        # Register device ke backend
        register_device(client)
    else:
        connected = False
        logger.error(f"❌ Failed to connect to MQTT Broker, code: {rc}")

def on_disconnect(client, userdata, rc):
    """Callback saat disconnect dari MQTT"""
    global connected
    connected = False
    logger.warning(f"Disconnected from MQTT Broker, code: {rc}")

def on_message(client, userdata, msg):
    """Callback saat menerima pesan dari MQTT"""
    try:
        payload = json.loads(msg.payload.decode())
        logger.info(f"📨 Received: {msg.topic} -> {payload}")
        
        # Handle command
        if msg.topic.endswith('/command'):
            handle_command(client, payload)
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")

def on_publish(client, userdata, mid):
    """Callback saat publish berhasil"""
    logger.debug(f"✅ Published message ID: {mid}")

# ─── Functions ──────────────────────────────────────────────────

def register_device(client):
    """Register device ke backend melalui API"""
    global registered
    
    try:
        # 1. Cek apakah device sudah terdaftar
        response = requests.get(
            f"{API_BASE_URL}/api/v1/devices/serial/{DEVICE_SERIAL}",
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"✅ Device already registered: {DEVICE_SERIAL}")
            registered = True
            return True
            
    except requests.exceptions.RequestException as e:
        logger.warning(f"⚠️  Cannot connect to backend API: {e}")
        # Lanjutkan dengan registration via MQTT
    
    try:
        # 2. Kirim registration via MQTT
        reg_topic = f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/register"
        reg_payload = {
            "deviceId": DEVICE_ID,
            "serialNumber": DEVICE_SERIAL,
            "model": DEVICE_MODEL,
            "tenantId": TENANT_ID,
            "siteId": SITE_ID,
            "timestamp": datetime.now().isoformat()
        }
        
        result = client.publish(reg_topic, json.dumps(reg_payload), qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"📤 Registration sent: {reg_topic}")
            registered = True
            return True
        else:
            logger.error(f"❌ Failed to send registration")
            return False
            
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        return False

def handle_command(client, command):
    """Handle command dari MQTT"""
    cmd_type = command.get('type')
    cmd_data = command.get('data', {})
    
    if cmd_type == 'ping':
        response = {
            "type": "pong",
            "data": {"timestamp": datetime.now().isoformat()}
        }
        client.publish(
            f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/command/response",
            json.dumps(response),
            qos=1
        )
        logger.info("🏓 Pong response sent")
        
    elif cmd_type == 'set_config':
        # Update device configuration
        logger.info(f"⚙️ Configuration updated: {cmd_data}")
        
    elif cmd_type == 'restart':
        logger.info("🔄 Restarting device...")
        # Implement restart logic
        
    else:
        logger.warning(f"⚠️ Unknown command: {cmd_type}")

def read_device_data():
    """Membaca data dari device (simulasi / serial)"""
    # Simulasi data dari inverter
    return {
        "p_active": round(5000 + random.random() * 1000, 2),
        "p_reactive": round(150 + random.random() * 50, 2),
        "p_apparent": round(5000 + random.random() * 1000, 2),
        "v_ac": round(230 + random.random() * 5, 2),
        "c_ac": round(21 + random.random() * 2, 2),
        "f_grid": round(50 + (random.random() - 0.5) * 0.5, 3),
        "t_inverter": round(35 + random.random() * 15, 1),
        "e_daily": round(120 + random.random() * 30, 2),
        "e_total": round(42500 + random.random() * 500, 2),
        "s_device": "ONLINE",
        "s_grid": "CONNECTED",
        "b_soc": round(60 + random.random() * 35, 1)
    }

def send_telemetry(client):
    """Kirim data telemetry ke MQTT"""
    try:
        # Read data dari device
        data = read_device_data()
        
        # Build topic
        topic = f"{TOPIC_PREFIX}/{TENANT_ID}/{SITE_ID}/{DEVICE_ID}"
        
        # Build payload
        payload = {
            "deviceId": DEVICE_ID,
            "timestamp": datetime.now().isoformat(),
            "data": data,
            "quality": "GOOD"
        }
        
        # Publish to MQTT
        result = client.publish(topic, json.dumps(payload), qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.debug(f"📤 Telemetry sent: {topic}")
        else:
            logger.error(f"❌ Failed to send telemetry: {result.rc}")
            
    except Exception as e:
        logger.error(f"❌ Error sending telemetry: {e}")

def connect_serial():
    """Koneksi ke serial device (jika ada)"""
    try:
        serial_port = os.getenv('SERIAL_PORT', '/dev/ttyUSB0')
        ser = serial.Serial(
            port=serial_port,
            baudrate=9600,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=2
        )
        logger.info(f"🔌 Serial connected: {serial_port}")
        return ser
    except Exception as e:
        logger.warning(f"⚠️  Serial connection failed: {e}")
        return None

# ─── Main ───────────────────────────────────────────────────────

def main():
    logger.info(f"🚀 Starting MQTT Client...")
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
    
    # TLS configuration (jika diperlukan)
    if MQTT_TLS:
        client.tls_set(cert_reqs=mqtt.ssl.CERT_REQUIRED)
        client.tls_insecure_set(False)
    
    # Connect to broker
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()
        
        # Tunggu koneksi
        time.sleep(2)
        
        # Main loop
        last_telemetry = 0
        telemetry_interval = int(os.getenv('TELEMETRY_INTERVAL', 15))
        
        while is_running:
            if connected:
                # Send telemetry setiap interval
                current_time = time.time()
                if current_time - last_telemetry >= telemetry_interval:
                    send_telemetry(client)
                    last_telemetry = current_time
            
            # Health check - cek koneksi
            if not connected and is_running:
                logger.warning("⚠️  MQTT disconnected, attempting to reconnect...")
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
        logger.info("👋 MQTT Client stopped")

if __name__ == "__main__":
    main()
