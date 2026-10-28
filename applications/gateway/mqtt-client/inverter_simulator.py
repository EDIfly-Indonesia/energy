#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Inverter Simulator
==================
Simulasi inverter yang mengirimkan data telemetry ke MQTT Broker.
Format topic: energy/{tenant}/{site}/{device_id}
Timestamp dikirimkan secara eksplisit dalam format UTC (ISO 8601 dengan akhiran Z).

Data Tenant/Site/Device disesuaikan dengan database seeder terbaru.
"""

import json
import logging
import os
import sys
import time
import signal
import random
import argparse
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

# psycopg2 opsional — dipakai untuk membaca status OFFLINE dari PostgreSQL.
# Jika tidak tersedia, simulator berjalan tanpa filter status (fail-open).
try:
    import psycopg2
    _HAS_PSYCOPG2 = True
except ImportError:
    psycopg2 = None
    _HAS_PSYCOPG2 = False

# Load environment variables
load_dotenv()

# ─── Configuration ──────────────────────────────────────────────
MQTT_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', 'admin')
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', 'Pltsapp2026**')

TOPIC_PREFIX = os.getenv('TOPIC_PREFIX', 'energy')

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', './logs/inverter-simulator.log')

# ─── PostgreSQL (untuk membaca status device) ───────────────────
# Simulator menghormati status OFFLINE di tbl_devices: device OFFLINE tidak
# dipublikasikan telemetry-nya. Koneksi DB bersifat opsional (fail-open) —
# jika DB tidak terjangkau, simulator tetap mempublikasikan semua device.
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', 5432))
POSTGRES_DB = os.getenv('POSTGRES_DB', 'energy_platform')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'energy_app')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
OFFLINE_REFRESH_INTERVAL = int(os.getenv('OFFLINE_REFRESH_INTERVAL', '60'))  # detik

# ─── Site Timezone Mapping (from seeded data) ───────────────────
# All sites are in Indonesia (WIB/WITA/WIT)
SITE_TZ_OFFSET = {
    # PT Telkom sites
    'Jakarta Plant A': 7,      # WIB
    'Jakarta Plant B': 7,      # WIB
    'Bandung Plant A': 7,      # WIB
    'Bandung Plant B': 7,      # WIB
    'Semarang Plant A': 7,     # WIB
    # PT Indosat sites
    'Medan Plant A': 7,        # WIB
    'Medan Plant B': 7,        # WIB
    'Padang Plant A': 7,       # WIB
    'Pekanbaru Plant A': 7,    # WIB
    'Surabaya Plant A': 7,     # WIB
    'Surabaya Plant B': 7,     # WIB
    'Bali Plant A': 8,         # WITA
    'Bali Plant B': 8,         # WITA
    'Bandung Plant C': 7,      # WIB
    'Jakarta Plant C': 7,      # WIB
    # PT Mitratel sites
    'Jakarta Plant D': 7,      # WIB
    'Semarang Plant B': 7,     # WIB
    # PT Charoen Pokphand sites
    'Semarang Plant C': 7,     # WIB
    'Surabaya Plant C': 7,     # WIB
}

# ─── Device Configurations from Seeder ──────────────────────────
# Format: {device_id: {tenant, site, serial, model, brand, type}}
DEVICE_CONFIGS = {
    # PT Indosat - Bali Plant B
    '010bf470-c76c-4cb1-b2c9-0abf81e85e39': {'tenant': 'PT Indosat', 'site': 'Bali Plant B', 'serial': 'SN-000001', 'model': 'Huawei Battery Gen 1', 'brand': 'Huawei', 'type': 'Battery'},
    # PT Telkom - Bandung Plant A
    '68b23642-229a-41e2-9da0-310eb15e70ff': {'tenant': 'PT Telkom', 'site': 'Bandung Plant A', 'serial': 'SN-000002', 'model': 'Goodwe Smart Meter Gen 2', 'brand': 'Goodwe', 'type': 'Smart Meter'},
    'c98667c3-96ae-44d0-b1f7-e8b2a1c136a2': {'tenant': 'PT Telkom', 'site': 'Bandung Plant B', 'serial': 'SN-000003', 'model': 'Growatt Data Logger Gen 3', 'brand': 'Growatt', 'type': 'Data Logger'},
    # PT Indosat - Bandung Plant C
    '23ce86ae-6811-4547-b192-2fed7b0c230f': {'tenant': 'PT Indosat', 'site': 'Bandung Plant C', 'serial': 'SN-000004', 'model': 'SMA Gateway Gen 4', 'brand': 'SMA', 'type': 'Gateway'},
    # PT Telkom - Jakarta Plant A
    '25eb08c0-de7b-4593-a383-2ec26526b247': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant A', 'serial': 'SN-000005', 'model': 'ABB Solar Panel Gen 5', 'brand': 'ABB', 'type': 'Solar Panel'},
    '4f89d152-d68e-4b12-b141-4200dcf8b869': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant B', 'serial': 'SN-000006', 'model': 'Schneider Electric Optimizer Gen 6', 'brand': 'Schneider Electric', 'type': 'Optimizer'},
    # PT Indosat - Jakarta Plant C
    '934e0cb4-2dee-4935-82a3-2de37eb321f5': {'tenant': 'PT Indosat', 'site': 'Jakarta Plant C', 'serial': 'SN-000007', 'model': 'Solis Charge Controller Gen 7', 'brand': 'Solis', 'type': 'Charge Controller'},
    # PT Mitratel - Jakarta Plant D
    '5ef645fa-87ca-4992-9cc3-946992ddc967': {'tenant': 'PT Mitratel', 'site': 'Jakarta Plant D', 'serial': 'SN-000008', 'model': 'Fronius Inverter Gen 8', 'brand': 'Fronius', 'type': 'Inverter'},
    # PT Indosat - Medan Plant A
    '5dc42da3-dffd-4371-978f-39f63f5c3a37': {'tenant': 'PT Indosat', 'site': 'Medan Plant A', 'serial': 'SN-000009', 'model': 'Delta Battery Gen 9', 'brand': 'Delta', 'type': 'Battery'},
    '109510ca-8e4f-45f3-ad84-36e5a97ccb4f': {'tenant': 'PT Indosat', 'site': 'Medan Plant B', 'serial': 'SN-000010', 'model': 'Sungrow Smart Meter Gen 10', 'brand': 'Sungrow', 'type': 'Smart Meter'},
    '8f4f4c23-eba9-456e-b0e7-6f31acebf217': {'tenant': 'PT Indosat', 'site': 'Padang Plant A', 'serial': 'SN-000011', 'model': 'Huawei Data Logger Gen 11', 'brand': 'Huawei', 'type': 'Data Logger'},
    '298a2373-55e5-4a0d-a675-7d141b0f48a8': {'tenant': 'PT Indosat', 'site': 'Pekanbaru Plant A', 'serial': 'SN-000012', 'model': 'Goodwe Gateway Gen 12', 'brand': 'Goodwe', 'type': 'Gateway'},
    # PT Telkom - Semarang Plant A
    'e37e6ca4-8816-4bd9-a850-98018c72c563': {'tenant': 'PT Telkom', 'site': 'Semarang Plant A', 'serial': 'SN-000013', 'model': 'Growatt Solar Panel Gen 13', 'brand': 'Growatt', 'type': 'Solar Panel'},
    # PT Mitratel - Semarang Plant B
    '476098e8-f3cd-49cf-a315-8ed3b1b7403f': {'tenant': 'PT Mitratel', 'site': 'Semarang Plant B', 'serial': 'SN-000014', 'model': 'SMA Optimizer Gen 14', 'brand': 'SMA', 'type': 'Optimizer'},
    # PT Charoen Pokphand - Semarang Plant C
    'fc0889e9-13fe-4aab-8882-2dce9b2259a4': {'tenant': 'PT Charoen Pokphand', 'site': 'Semarang Plant C', 'serial': 'SN-000015', 'model': 'ABB Charge Controller Gen 15', 'brand': 'ABB', 'type': 'Charge Controller'},
    # PT Indosat - Surabaya Plant A
    '5f1dac5d-e77f-478e-9345-5c80a118532f': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant A', 'serial': 'SN-000016', 'model': 'Schneider Electric Inverter Gen 16', 'brand': 'Schneider Electric', 'type': 'Inverter'},
    '3d8ff8d2-6455-4ad1-bb58-5a0ae4a33857': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant B', 'serial': 'SN-000017', 'model': 'Solis Battery Gen 17', 'brand': 'Solis', 'type': 'Battery'},
    # PT Charoen Pokphand - Surabaya Plant C
    'dc512cc8-6a69-4b27-a8bb-d279ac661427': {'tenant': 'PT Charoen Pokphand', 'site': 'Surabaya Plant C', 'serial': 'SN-000018', 'model': 'Fronius Smart Meter Gen 18', 'brand': 'Fronius', 'type': 'Smart Meter'},
    # PT Indosat - Bali Plant A
    'cb90940c-4364-4174-86e3-373657d4b1e2': {'tenant': 'PT Indosat', 'site': 'Bali Plant A', 'serial': 'SN-000019', 'model': 'Delta Data Logger Gen 19', 'brand': 'Delta', 'type': 'Data Logger'},
    '94c5ca67-4d0f-4f80-bba0-d7b5c3f0b800': {'tenant': 'PT Indosat', 'site': 'Bali Plant B', 'serial': 'SN-000020', 'model': 'Sungrow Gateway Gen 20', 'brand': 'Sungrow', 'type': 'Gateway'},
    # PT Telkom - Bandung Plant A
    '6fc31e55-f539-49be-bdb5-036f1cc56199': {'tenant': 'PT Telkom', 'site': 'Bandung Plant A', 'serial': 'SN-000021', 'model': 'Huawei Solar Panel Gen 21', 'brand': 'Huawei', 'type': 'Solar Panel'},
    'e5028500-5f62-4b36-ad30-58d430a0f6c8': {'tenant': 'PT Telkom', 'site': 'Bandung Plant B', 'serial': 'SN-000022', 'model': 'Goodwe Optimizer Gen 22', 'brand': 'Goodwe', 'type': 'Optimizer'},
    # PT Indosat - Bandung Plant C
    'c19a8824-dcb8-4888-9d68-bb00563bc8a5': {'tenant': 'PT Indosat', 'site': 'Bandung Plant C', 'serial': 'SN-000023', 'model': 'Growatt Charge Controller Gen 23', 'brand': 'Growatt', 'type': 'Charge Controller'},
    # PT Telkom - Jakarta Plant A
    'e385053b-1f36-491d-b70c-889d4f4a3a7f': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant A', 'serial': 'SN-000024', 'model': 'SMA Inverter Gen 24', 'brand': 'SMA', 'type': 'Inverter'},
    '0e51b4a7-07bb-4f98-bd8c-b6c20b25589c': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant B', 'serial': 'SN-000025', 'model': 'ABB Battery Gen 25', 'brand': 'ABB', 'type': 'Battery'},
    # PT Indosat - Jakarta Plant C
    '90a5a323-f768-4270-bbc7-522ec9d30074': {'tenant': 'PT Indosat', 'site': 'Jakarta Plant C', 'serial': 'SN-000026', 'model': 'Schneider Electric Smart Meter Gen 26', 'brand': 'Schneider Electric', 'type': 'Smart Meter'},
    # PT Mitratel - Jakarta Plant D
    'fa474933-4a67-4863-9715-18f729c27fd0': {'tenant': 'PT Mitratel', 'site': 'Jakarta Plant D', 'serial': 'SN-000027', 'model': 'Solis Data Logger Gen 27', 'brand': 'Solis', 'type': 'Data Logger'},
    # PT Indosat - Medan Plant A
    'c392fac1-2eee-47db-9418-5c9b30702822': {'tenant': 'PT Indosat', 'site': 'Medan Plant A', 'serial': 'SN-000028', 'model': 'Fronius Gateway Gen 28', 'brand': 'Fronius', 'type': 'Gateway'},
    '3e2e7eda-4dd6-4b05-8a5b-d2567e81c9a5': {'tenant': 'PT Indosat', 'site': 'Medan Plant B', 'serial': 'SN-000029', 'model': 'Delta Solar Panel Gen 29', 'brand': 'Delta', 'type': 'Solar Panel'},
    '70ad355f-df7f-4f3d-a170-00180e010f3a': {'tenant': 'PT Indosat', 'site': 'Padang Plant A', 'serial': 'SN-000030', 'model': 'Sungrow Optimizer Gen 30', 'brand': 'Sungrow', 'type': 'Optimizer'},
    '0f97428a-cf27-44f9-be96-73b3876da10e': {'tenant': 'PT Indosat', 'site': 'Pekanbaru Plant A', 'serial': 'SN-000031', 'model': 'Huawei Charge Controller Gen 31', 'brand': 'Huawei', 'type': 'Charge Controller'},
    # PT Telkom - Semarang Plant A
    '7fb7faa0-90de-4dd8-a660-38496838b4ae': {'tenant': 'PT Telkom', 'site': 'Semarang Plant A', 'serial': 'SN-000032', 'model': 'Goodwe Inverter Gen 32', 'brand': 'Goodwe', 'type': 'Inverter'},
    # PT Mitratel - Semarang Plant B
    '199aeb98-4b10-4ff9-a41b-db878cd2d805': {'tenant': 'PT Mitratel', 'site': 'Semarang Plant B', 'serial': 'SN-000033', 'model': 'Growatt Battery Gen 33', 'brand': 'Growatt', 'type': 'Battery'},
    # PT Charoen Pokphand - Semarang Plant C
    'e1cc4fee-5748-444d-9d75-e92154bdbfbe': {'tenant': 'PT Charoen Pokphand', 'site': 'Semarang Plant C', 'serial': 'SN-000034', 'model': 'SMA Smart Meter Gen 34', 'brand': 'SMA', 'type': 'Smart Meter'},
    # PT Indosat - Surabaya Plant A
    'ea3b93cb-46aa-4827-971b-090fb9bdb2d4': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant A', 'serial': 'SN-000035', 'model': 'ABB Data Logger Gen 35', 'brand': 'ABB', 'type': 'Data Logger'},
    '3695b62d-1bed-4bb6-98e5-9626e0df898d': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant B', 'serial': 'SN-000036', 'model': 'Schneider Electric Gateway Gen 36', 'brand': 'Schneider Electric', 'type': 'Gateway'},
    # PT Charoen Pokphand - Surabaya Plant C
    '5c4af558-290d-4969-9744-5854d87335be': {'tenant': 'PT Charoen Pokphand', 'site': 'Surabaya Plant C', 'serial': 'SN-000037', 'model': 'Solis Solar Panel Gen 37', 'brand': 'Solis', 'type': 'Solar Panel'},
    # PT Indosat - Bali Plant A
    '82831f86-4c8b-4ebf-a00d-2be1c85e48d0': {'tenant': 'PT Indosat', 'site': 'Bali Plant A', 'serial': 'SN-000038', 'model': 'Fronius Optimizer Gen 38', 'brand': 'Fronius', 'type': 'Optimizer'},
    'b50c216b-37bb-4255-a1cb-134ddb2ba52c': {'tenant': 'PT Indosat', 'site': 'Bali Plant B', 'serial': 'SN-000039', 'model': 'Delta Charge Controller Gen 39', 'brand': 'Delta', 'type': 'Charge Controller'},
    # PT Telkom - Bandung Plant A
    '7a076b4e-c442-4ffa-8802-888a6f94acfb': {'tenant': 'PT Telkom', 'site': 'Bandung Plant A', 'serial': 'SN-000040', 'model': 'Sungrow Inverter Gen 40', 'brand': 'Sungrow', 'type': 'Inverter'},
    'b4a2e1c3-e759-41fe-8475-7d3772b3f4d5': {'tenant': 'PT Telkom', 'site': 'Bandung Plant B', 'serial': 'SN-000041', 'model': 'Huawei Battery Gen 41', 'brand': 'Huawei', 'type': 'Battery'},
    # PT Indosat - Bandung Plant C
    '1aa2292b-e4d2-4b94-9bc3-6b6a7d2399ca': {'tenant': 'PT Indosat', 'site': 'Bandung Plant C', 'serial': 'SN-000042', 'model': 'Goodwe Smart Meter Gen 42', 'brand': 'Goodwe', 'type': 'Smart Meter'},
    # PT Telkom - Jakarta Plant A
    'dfd2af60-e119-4bca-af61-7532378e7cb5': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant A', 'serial': 'SN-000043', 'model': 'Growatt Data Logger Gen 43', 'brand': 'Growatt', 'type': 'Data Logger'},
    '4bc698de-c582-49f0-83d4-12cb14492726': {'tenant': 'PT Telkom', 'site': 'Jakarta Plant B', 'serial': 'SN-000044', 'model': 'SMA Gateway Gen 44', 'brand': 'SMA', 'type': 'Gateway'},
    # PT Indosat - Jakarta Plant C
    '61ea8e1d-60f3-4fae-a4ac-aaf679754de4': {'tenant': 'PT Indosat', 'site': 'Jakarta Plant C', 'serial': 'SN-000045', 'model': 'ABB Solar Panel Gen 45', 'brand': 'ABB', 'type': 'Solar Panel'},
    # PT Mitratel - Jakarta Plant D
    '348658ed-ed90-4037-8751-b83502b6c43c': {'tenant': 'PT Mitratel', 'site': 'Jakarta Plant D', 'serial': 'SN-000046', 'model': 'Schneider Electric Optimizer Gen 46', 'brand': 'Schneider Electric', 'type': 'Optimizer'},
    # PT Indosat - Medan Plant A
    'a79605c7-bac4-48dc-9ce4-cb2ee3b8d445': {'tenant': 'PT Indosat', 'site': 'Medan Plant A', 'serial': 'SN-000047', 'model': 'Solis Charge Controller Gen 47', 'brand': 'Solis', 'type': 'Charge Controller'},
    '8be14523-f610-43a5-a768-3aca883df08d': {'tenant': 'PT Indosat', 'site': 'Medan Plant B', 'serial': 'SN-000048', 'model': 'Fronius Inverter Gen 48', 'brand': 'Fronius', 'type': 'Inverter'},
    '8457322e-00f0-4a37-9618-7fc9e7204cc6': {'tenant': 'PT Indosat', 'site': 'Padang Plant A', 'serial': 'SN-000049', 'model': 'Delta Battery Gen 49', 'brand': 'Delta', 'type': 'Battery'},
    'ffbde925-bc0f-4391-9a71-a4eca8f4f604': {'tenant': 'PT Indosat', 'site': 'Pekanbaru Plant A', 'serial': 'SN-000050', 'model': 'Sungrow Smart Meter Gen 50', 'brand': 'Sungrow', 'type': 'Smart Meter'},
    # PT Telkom - Semarang Plant A
    '58846393-b389-4ada-883d-75b702f23bd3': {'tenant': 'PT Telkom', 'site': 'Semarang Plant A', 'serial': 'SN-000051', 'model': 'Huawei Data Logger Gen 51', 'brand': 'Huawei', 'type': 'Data Logger'},
    # PT Mitratel - Semarang Plant B
    '1409a114-6ea3-458d-8575-8ef8dbe6cce3': {'tenant': 'PT Mitratel', 'site': 'Semarang Plant B', 'serial': 'SN-000052', 'model': 'Goodwe Gateway Gen 52', 'brand': 'Goodwe', 'type': 'Gateway'},
    # PT Charoen Pokphand - Semarang Plant C
    'c495017e-e426-4d58-8abd-7df2df6e6bc2': {'tenant': 'PT Charoen Pokphand', 'site': 'Semarang Plant C', 'serial': 'SN-000053', 'model': 'Growatt Solar Panel Gen 53', 'brand': 'Growatt', 'type': 'Solar Panel'},
    # PT Indosat - Surabaya Plant A
    'd70e7b86-f8e9-45e9-a158-6567cceb4cc7': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant A', 'serial': 'SN-000054', 'model': 'SMA Optimizer Gen 54', 'brand': 'SMA', 'type': 'Optimizer'},
    '78babeaf-e778-4aaf-905b-868cbfdeab14': {'tenant': 'PT Indosat', 'site': 'Surabaya Plant B', 'serial': 'SN-000055', 'model': 'ABB Charge Controller Gen 55', 'brand': 'ABB', 'type': 'Charge Controller'},
}

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

# Cache daftar serial device yang OFFLINE di PostgreSQL (di-refresh berkala).
# Dipakai untuk skip publish device yang statusnya OFFLINE di DB.
_offline_serials = set()
_offline_last_refresh = 0.0


def fetch_offline_serials():
    """Baca serial device berstatus OFFLINE dari tbl_devices.

    Returns set of serial number (mis. {'SN-000005', ...}). Jika DB tidak
    terjangkau / psycopg2 tidak tersedia, return set kosong (fail-open:
    simulator tetap publish semua device).
    """
    global _offline_serials, _offline_last_refresh

    # Throttle: jangan query DB setiap publish.
    now = time.time()
    if now - _offline_last_refresh < OFFLINE_REFRESH_INTERVAL:
        return _offline_serials

    if psycopg2 is None:
        logger.warning("psycopg2 tidak tersedia — filter status OFFLINE dinonaktifkan.")
        _offline_last_refresh = now
        return _offline_serials

    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            connect_timeout=3,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT serial_number FROM tbl_devices WHERE status = 'OFFLINE'")
                rows = cur.fetchall()
            _offline_serials = {r[0] for r in rows}
        finally:
            conn.close()
        _offline_last_refresh = now
        if _offline_serials:
            logger.info(f"🟠 Device OFFLINE (skip publish): {len(_offline_serials)} device")
    except Exception as e:
        # Fail-open: jika gagal baca DB, anggap tidak ada yang offline.
        logger.warning(f"⚠️ Gagal baca status OFFLINE dari PostgreSQL: {e}")
        _offline_serials = set()
        _offline_last_refresh = now

    return _offline_serials


def is_device_offline(serial):
    """True jika device (by serial) berstatus OFFLINE di DB."""
    return serial in fetch_offline_serials()

# ─── Signal Handling ────────────────────────────────────────────
def signal_handler(sig, frame):
    global is_running
    logger.info("Shutdown signal received...")
    is_running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ─── Inverter Simulator Class ──────────────────────────────────
class InverterSimulator:
    """Simulasi inverter dengan data yang realistis berbasis UTC Timestamp"""

    def __init__(self, device_id):
        if device_id not in DEVICE_CONFIGS:
            raise ValueError(f"Unknown device_id: {device_id}. Available: {list(DEVICE_CONFIGS.keys())}")

        config = DEVICE_CONFIGS[device_id]
        self.device_id = device_id
        self.tenant = config['tenant']
        self.site = config['site']
        self.serial = config['serial']
        self.model = config['model']
        self.brand = config['brand']
        self.type = config['type']

        # Base values with realistic ranges
        # For a 100kWp site, peak power should be near 100000 W (100 kW).
        # base_power is the nominal peak power for this inverter (in Watts).
        self.base_power = random.uniform(80000, 110000)  # Watts (e.g. 80kW-110kW for 100kWp site)
        self.base_voltage = 220 + random.uniform(-10, 10)
        self.base_current = self.base_power / self.base_voltage

        # Energy counters (in Watt-hours, Wh)
        self.total_energy_wh = random.uniform(100000, 500000)  # Start with some accumulated energy
        self.daily_energy_wh = 0
        # Interval publish nyata (detik) — dipakai utk increment energi yg benar;
        # di-override oleh runner sesuai argumen --interval (PM2: 180s).
        self.publish_interval_s = 5

        # Battery model (in Watt-hours; 50 kWh nominal per storage unit)
        self.battery_capacity_wh = 50000
        # SOC mulai acak 30-70%, lalu dikendalikan state machine charge/discharge
        self.battery_soc = random.uniform(30, 70)
        self.battery_charge_wh = 0    # akumulasi energi charge hari ini (Wh)
        self.battery_discharge_wh = 0 # akumulasi energi discharge hari ini (Wh)

        # Timezone offset per site
        self.tz_offset_hours = SITE_TZ_OFFSET.get(self.site, 7)
        now_local = datetime.now(timezone.utc) + timedelta(hours=self.tz_offset_hours)
        self.last_reset = now_local.date()

        # Status
        self.status = "ONLINE"
        self.fault_code = None

        # Solar irradiance pattern (6 AM - 6 PM local time)
        self.sunrise = 6
        self.sunset = 18

        logger.info(f"🔌 Inverter initialized: {self.device_id} ({self.model})")
        logger.info(f"   Tenant: {self.tenant}, Site: {self.site} (TZ: UTC+{self.tz_offset_hours})")
        logger.info(f"   Serial: {self.serial}, Brand: {self.brand}, Type: {self.type}")

    def get_solar_factor(self, local_time):
        """Calculate solar irradiance factor based on local time of day"""
        hour = local_time.hour + local_time.minute / 60.0

        if hour < self.sunrise or hour > self.sunset:
            return 0.0

        # Peak at noon (12 PM)
        peak_hour = 12.0
        factor = 1.0 - abs(hour - peak_hour) / (self.sunset - self.sunrise)
        factor = max(0, min(1, factor))

        # Cloud randomness
        factor *= random.uniform(0.7, 1.0)

        return factor

    def generate_telemetry(self):
        """Generate realistic telemetry data with UTC timestamp"""
        now_utc = datetime.now(timezone.utc)
        now_local = now_utc + timedelta(hours=self.tz_offset_hours)

        # Reset daily energy & battery counters at local midnight
        if now_local.date() != self.last_reset:
            self.daily_energy_wh = 0
            self.battery_charge_wh = 0
            self.battery_discharge_wh = 0
            self.last_reset = now_local.date()

        solar_factor = self.get_solar_factor(now_local)

        # Statuses - generate FIRST so we can use for power calculation
        grid_status = "CONNECTED" if random.random() > 0.05 else "DISCONNECTED"

        status_roll = random.random()
        if status_roll < 0.95:
            device_status = "ONLINE"
            fault = None
        elif status_roll < 0.98:
            device_status = "WARNING"
            fault = "W-201" if random.random() > 0.5 else "W-202"
        else:
            device_status = "FAULT"
            fault = "E-208" if random.random() > 0.5 else "E-201"

        # Power varies with solar irradiance AND device status
        power = self.base_power * solar_factor * random.uniform(0.85, 1.15)
        power = max(0, power)

        # Jika device FAULT, power = 0
        if device_status == "FAULT":
            power = 0
            voltage = 0
            current = 0
        else:
            # Voltage and current
            voltage = self.base_voltage * (1 + random.uniform(-0.02, 0.02))
            current = power / voltage if voltage > 0 else 0

        # Update energy counters
        # power is in Watts; interval nyata antar publish (default 5s, dipakai 180s
        # di PM2). Sebelumnya hardcode 5s → e_daily/e_total undercount 36× saat
        # interval 180s, membuat produksi harian tampak sangat kecil.
        interval_s = getattr(self, 'publish_interval_s', 5)
        energy_increment_wh = power * interval_s / 3600  # Wh per interval
        self.daily_energy_wh += energy_increment_wh
        self.total_energy_wh += energy_increment_wh

        # Temperature
        ambient_temp = 25 + solar_factor * 10 + random.uniform(-2, 2)
        inverter_temp = ambient_temp + 15 + random.uniform(-5, 5)

        # ── Battery state machine ────────────────────────────────────────────
        # Model hybrid PV+battery: charge dari surplus PV saat siang, discharge
        # untuk mensuplai beban dasar saat malam. dt_h = interval publish nyata
        # (180 s) agar SOC bergerak realistis antar publish.
        dt_h = 180 / 3600.0
        b_charge = 0.0
        b_discharge = 0.0
        if device_status != "FAULT" and self.battery_capacity_wh > 0:
            if solar_factor > 0.30 and self.battery_soc < 95.0:
                # Charge: sebagian surplus produksi (max 15%), tak overcharge
                b_charge = min(
                    power * 0.15,
                    (95.0 - self.battery_soc) / 100.0 * self.battery_capacity_wh / dt_h
                )
                if b_charge > 0:
                    ch_wh = b_charge * dt_h
                    self.battery_soc += ch_wh / self.battery_capacity_wh * 100.0
                    self.battery_charge_wh += ch_wh
            elif solar_factor < 0.10 and self.battery_soc > 20.0:
                # Discharge: suplai beban dasar malam (max 8% kapasitas), jaga min 20%
                b_discharge = min(
                    self.base_power * 0.08,
                    (self.battery_soc - 20.0) / 100.0 * self.battery_capacity_wh / dt_h
                )
                if b_discharge > 0:
                    dis_wh = b_discharge * dt_h
                    self.battery_soc -= dis_wh / self.battery_capacity_wh * 100.0
                    self.battery_discharge_wh += dis_wh
        self.battery_soc = max(5.0, min(99.0, self.battery_soc))
        battery_state = "CHARGING" if b_charge > 0 else ("DISCHARGING" if b_discharge > 0 else "IDLE")

        # Irradiance (W/m²) — untuk perhitungan Performance Ratio (PR)
        i_ghi = solar_factor * 1000.0 * random.uniform(0.85, 1.0)

        # ISO 8601 UTC String dengan akhiran 'Z' (Contoh: 2026-08-12T09:25:30Z)
        utc_timestamp_str = now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

        return {
            "deviceId": self.device_id,
            "serialNumber": self.serial,
            "model": self.model,
            "brand": self.brand,
            "deviceType": self.type,
            "tenant": self.tenant,
            "site": self.site,
            "timestamp": utc_timestamp_str,
            "data": {
                # Power
                "p_active": round(power, 2),
                "p_reactive": round(power * 0.05 * random.uniform(0.5, 1.5), 2),
                "p_apparent": round(power * 1.01, 2),
                "p_export": round(power * random.uniform(0.3, 0.7), 2),
                "p_import": round(power * random.uniform(0.0, 0.2), 2),
                "p_load": round(power * random.uniform(0.5, 0.9), 2),

                # Voltage
                "v_ac": round(voltage, 2),
                "v_dc": round(voltage * 1.5 * random.uniform(0.9, 1.1), 2),

                # Current
                "c_ac": round(current, 2),
                "c_dc": round(current * 1.2, 2),

                # Energy
                "e_daily": round(self.daily_energy_wh, 2),  # Wh
                "e_total": round(self.total_energy_wh, 2),  # Wh
                "e_daily_export": round(self.daily_energy_wh * random.uniform(0.3, 0.6), 2),
                "e_daily_load": round(self.daily_energy_wh * random.uniform(0.4, 0.8), 2),
                "e_daily_charge": round(self.battery_charge_wh, 2),      # Wh energi charge hari ini
                "e_daily_discharge": round(self.battery_discharge_wh, 2),  # Wh energi discharge hari ini

                # Frequency
                "f_grid": round(50 + random.uniform(-0.1, 0.1), 3),

                # Temperature
                "t_inverter": round(inverter_temp, 1),
                "t_env": round(ambient_temp, 1),

                # Battery
                "b_soc": round(self.battery_soc, 1),
                "b_charge": round(b_charge, 2),          # W (daya charge saat ini)
                "b_discharge": round(b_discharge, 2),    # W (daya discharge saat ini)
                "b_soh": round(85 + random.uniform(0, 15), 1),
                "b_voltage": round(48 + random.uniform(-2, 2), 2),
                "b_temp": round(ambient_temp + 5, 1),

                # Irradiance (W/m²)
                "i_ghi": round(i_ghi, 1),

                # Status
                "s_device": device_status,
                "s_grid": grid_status,
                "s_battery": battery_state,
                "s_alarm": fault or "NONE",

                # Others
                "efficiency": round(94 + random.uniform(0, 5), 1),
                "cos_phi": round(0.85 + random.uniform(0, 0.1), 3)
            },
            "quality": "GOOD" if device_status == "ONLINE" else "WARNING"
        }

# ─── MQTT Callbacks ─────────────────────────────────────────────
def on_connect(client, userdata, flags, rc):
    global connected
    if rc == 0:
        connected = True
        logger.info(f"✅ Connected to MQTT Broker: {MQTT_HOST}:{MQTT_PORT}")
    else:
        connected = False
        logger.error(f"❌ Connection failed, code: {rc}")

def on_disconnect(client, userdata, rc):
    global connected
    connected = False
    logger.warning(f"⚠️ Disconnected, code: {rc}")

def on_publish(client, userdata, mid):
    logger.debug(f"✅ Published, ID: {mid}")

# ─── Run single simulator ───────────────────────────────────────
def run_single_simulator(device_id, interval, count):
    global connected

    inverter = InverterSimulator(device_id)
    inverter.publish_interval_s = interval  # interval nyata untuk increment energi

    logger.info("🚀 Starting Inverter Simulator (UTC Mode)...")
    logger.info(f"   Device: {device_id} ({inverter.model})")
    logger.info(f"   Tenant: {inverter.tenant}, Site: {inverter.site}")
    logger.info(f"   Interval: {interval}s")
    logger.info(f"   MQTT Broker: {MQTT_HOST}:{MQTT_PORT}")

    client = mqtt.Client(
        client_id=f"sim_{device_id}_{int(time.time())}",
        protocol=mqtt.MQTTv311
    )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish

    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()

        time.sleep(2)

        if not connected:
            logger.error("❌ Failed to connect to MQTT Broker")
            return 1

        sent_count = 0
        while is_running:
            # Hormati status OFFLINE di DB: skip publish untuk device mati.
            if is_device_offline(inverter.serial):
                time.sleep(interval)
                continue

            telemetry = inverter.generate_telemetry()
            topic = f"{TOPIC_PREFIX}/{inverter.tenant}/{inverter.site}/{device_id}"

            result = client.publish(topic, json.dumps(telemetry), qos=1)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                sent_count += 1
                logger.info(f"📤 [{sent_count}] Telemetry sent to {topic} [UTC: {telemetry['timestamp']}]")
            else:
                logger.error(f"❌ Failed to publish: {result.rc}")

            if count > 0 and sent_count >= count:
                logger.info(f"✅ Reached message limit: {count}")
                break

            time.sleep(interval)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        logger.info("👋 Simulator stopped")

    return 0

# ─── Run all simulators ────────────────────────────────────────
def run_all_simulators(interval):
    """Jalankan simulator untuk semua device secara parallel (threading)"""
    import threading

    threads = []
    stop_event = threading.Event()

    def simulator_thread(device_id):
        inverter = InverterSimulator(device_id)
        inverter.publish_interval_s = interval  # interval nyata utk increment energi
        client = mqtt.Client(
            client_id=f"sim_{device_id}_{int(time.time())}",
            protocol=mqtt.MQTTv311
        )
        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.on_publish = on_publish
        if MQTT_USERNAME:
            client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_start()
            time.sleep(1)

            while not stop_event.is_set():
                # Hormati status OFFLINE di DB: skip publish untuk device mati.
                if is_device_offline(inverter.serial):
                    time.sleep(interval)
                    continue

                telemetry = inverter.generate_telemetry()
                topic = f"{TOPIC_PREFIX}/{inverter.tenant}/{inverter.site}/{device_id}"
                client.publish(topic, json.dumps(telemetry), qos=1)
                time.sleep(interval)
        except Exception as e:
            logger.error(f"❌ Thread error for {device_id}: {e}")
        finally:
            client.loop_stop()
            client.disconnect()

    logger.info(f"🚀 Starting {len(DEVICE_CONFIGS)} simulators...")
    for device_id in DEVICE_CONFIGS.keys():
        t = threading.Thread(target=simulator_thread, args=(device_id,), daemon=True)
        t.start()
        threads.append(t)
        time.sleep(0.1)  # Stagger connections

    try:
        while is_running:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down all simulators...")
        stop_event.set()
        for t in threads:
            t.join(timeout=2)

    logger.info("👋 All simulators stopped")
    return 0

# ─── Main Function ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='Inverter Simulator - PLTS SCADA')
    parser.add_argument('--device-id', default=os.getenv('DEVICE_ID'),
                        help=f'Device ID (default: first device). Available: {len(DEVICE_CONFIGS)} devices')
    parser.add_argument('--list-devices', action='store_true',
                        help='List all available device configurations and exit')
    parser.add_argument('--all', action='store_true',
                        help='Run simulators for ALL devices in parallel')
    parser.add_argument('--interval', type=int, default=5,
                        help='Telemetry interval in seconds (default: 5)')
    parser.add_argument('--count', type=int, default=0,
                        help='Number of messages to send (0 = infinite)')
    args = parser.parse_args()

    if args.list_devices:
        print(f"\n{'='*100}")
        print(f"Available Device Configurations ({len(DEVICE_CONFIGS)} devices)")
        print(f"{'='*100}")
        for device_id, config in DEVICE_CONFIGS.items():
            print(f"  {device_id}")
            print(f"    Tenant: {config['tenant']}")
            print(f"    Site:   {config['site']}")
            print(f"    Serial: {config['serial']}")
            print(f"    Model:  {config['model']}")
            print(f"    Brand:  {config['brand']}")
            print(f"    Type:   {config['type']}")
            print()
        return 0

    if args.all:
        return run_all_simulators(args.interval)

    # Default to first device if none specified
    if not args.device_id:
        args.device_id = list(DEVICE_CONFIGS.keys())[0]
        logger.info(f"No device-id specified, using default: {args.device_id}")

    return run_single_simulator(args.device_id, args.interval, args.count)

if __name__ == "__main__":
    sys.exit(main())