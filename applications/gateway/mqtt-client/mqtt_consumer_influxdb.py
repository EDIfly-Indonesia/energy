#!/usr/bin/env python3
"""
MQTT Consumer - Menyimpan data telemetry ke InfluxDB
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import pika
import psycopg2
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv()

# ─── Configuration ──────────────────────────────────────────────
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'admin')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'Pltsapp2026**')
RABBITMQ_QUEUE = os.getenv('RABBITMQ_QUEUE', 'telemetry_queue')

INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'energy_platform')
INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'telemetry')

# PostgreSQL (untuk validasi device/site sebelum write)
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', 5432))
POSTGRES_DB = os.getenv('POSTGRES_DB', 'energy_platform')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'energy_app')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
VALIDATE_DEVICE = os.getenv('VALIDATE_DEVICE', 'true').lower() == 'true'

LOG_FILE = os.getenv('LOG_FILE', './logs/mqtt-influxdb-consumer.log')

from site_tz_map import SITE_TZ_MAP

# ─── Logging ────────────────────────────────────────────────────
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ─── InfluxDB Setup ─────────────────────────────────────────────
try:
    influx_client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
    write_api = influx_client.write_api(write_options=SYNCHRONOUS)
    logger.info(f"✅ Connected to InfluxDB: {INFLUXDB_URL}")
except Exception as e:
    logger.error(f"❌ InfluxDB connection failed: {e}")
    sys.exit(1)

# ─── Telemetry Mapping ──────────────────────────────────────────
MEASUREMENT_MAP = {
    # Power
    'p_active': 'power', 'p_reactive': 'power', 'p_apparent': 'power',
    'p_active_a': 'power', 'p_active_b': 'power', 'p_active_c': 'power',
    'p_export': 'power', 'p_import': 'power',
    'p_pv1': 'power', 'p_pv2': 'power', 'p_pv3': 'power', 'p_pv4': 'power',
    'p_battery_charge': 'power', 'p_battery_discharge': 'power',
    'p_load': 'power',

    # Voltage
    'v_dc': 'voltage', 'v_dc1': 'voltage', 'v_dc2': 'voltage',
    'v_dc3': 'voltage', 'v_dc4': 'voltage',
    'v_ac': 'voltage', 'v_ab': 'voltage', 'v_bc': 'voltage', 'v_ca': 'voltage',
    'v_an': 'voltage', 'v_bn': 'voltage', 'v_cn': 'voltage',
    'v_battery': 'voltage', 'v_grid': 'voltage',

    # Current
    'c_dc': 'current', 'c_dc1': 'current', 'c_dc2': 'current',
    'c_dc3': 'current', 'c_dc4': 'current',
    'c_ac': 'current', 'c_a': 'current', 'c_b': 'current', 'c_c': 'current',
    'c_battery': 'current',

    # Energy
    'e_daily': 'energy', 'e_total': 'energy',
    'e_daily_export': 'energy', 'e_total_export': 'energy',
    'e_daily_import': 'energy', 'e_total_import': 'energy',
    'e_daily_charge': 'energy', 'e_daily_discharge': 'energy',
    'e_total_charge': 'energy', 'e_total_discharge': 'energy',
    'e_daily_load': 'energy', 'e_total_load': 'energy',
    'e_monthly': 'energy', 'e_yearly': 'energy',

    # Frequency
    'f_grid': 'frequency', 'f_ac': 'frequency',

    # Temperature
    't_env': 'temperature', 't_inverter': 'temperature',
    't_battery': 'temperature', 't_pv': 'temperature',
    't_heatsink': 'temperature', 't_boost': 'temperature',
    't_cabinet': 'temperature',

    # Battery
    'b_soc': 'battery', 'b_soh': 'battery', 'b_capacity': 'battery',
    'b_charge': 'battery', 'b_discharge': 'battery',
    'b_voltage': 'battery', 'b_current': 'battery', 'b_temp': 'battery',

    # Irradiance
    'i_poa': 'irradiance', 'i_ghi': 'irradiance', 'i_dni': 'irradiance',

    # Status
    's_device': 'status', 's_grid': 'status',
    's_battery': 'status', 's_alarm': 'status',

    # Others
    'cos_phi': 'others', 'thd_v': 'others',
    'thd_c': 'others', 'efficiency': 'others',
}

# ─── Helper Functions ───────────────────────────────────────────
def get_tags(data):
    """Extract tags from telemetry data"""
    site_name = data.get('site', 'unknown')
    tags = {
        'device_id': data.get('deviceId', 'unknown'),
        'tenant': data.get('tenant', 'unknown'),
        'site': site_name,
        'site_tz': SITE_TZ_MAP.get(site_name, 'Asia/Jakarta'),
        'model': data.get('model', 'unknown'),
        'serial': data.get('serialNumber', 'unknown'),
    }

    # Status tags
    telemetry_data = data.get('data', {})
    status_fields = ['s_device', 's_grid', 's_battery', 's_alarm']
    for field in status_fields:
        if field in telemetry_data:
            tags[field] = str(telemetry_data[field])

    return tags

def parse_payload_timestamp(raw_timestamp):
    """Konversi berbagai bentuk timestamp payload menjadi UTC datetime object"""
    if not raw_timestamp:
        return datetime.now(timezone.utc)
    
    try:
        # Jika berupa angka (Epoch integer/float)
        if isinstance(raw_timestamp, (int, float)):
            if raw_timestamp > 1e11:  # Milidetik -> detik
                raw_timestamp /= 1000.0
            return datetime.fromtimestamp(raw_timestamp, tz=timezone.utc)

        # Jika berupa String ISO
        ts_str = str(raw_timestamp).replace('Z', '+00:00')
        dt = datetime.fromisoformat(ts_str)

        # Jika naive (tanpa timezone offset), asumsikan waktu lokal WIB (+07:00) lalu convert ke UTC
        if dt.tzinfo is None:
            wib_tz = timezone(timedelta(hours=7))
            dt = dt.replace(tzinfo=wib_tz).astimezone(timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)

        return dt
    except Exception as e:
        logger.warning(f"⚠️ Gagal parse timestamp '{raw_timestamp}', menggunakan UTC server. Error: {e}")
        return datetime.now(timezone.utc)

def write_to_influxdb(data):
    """Write telemetry data to InfluxDB"""
    try:
        device_id = data.get('deviceId', 'unknown')
        telemetry_data = data.get('data', {})
        
        # Parse timestamp ke UTC
        dt = parse_payload_timestamp(data.get('timestamp'))

        # Get tags
        tags = get_tags(data)

        # Group fields by measurement
        measurements = {}
        for key, value in telemetry_data.items():
            if key.startswith('s_'):
                continue

            measurement = MEASUREMENT_MAP.get(key, 'unknown')
            if measurement not in measurements:
                measurements[measurement] = {}

            try:
                measurements[measurement][key] = float(value)
            except (ValueError, TypeError):
                measurements[measurement][key] = value

        # Write each measurement
        for measurement, fields in measurements.items():
            if not fields:
                continue

            point = Point(measurement)

            # Add tags
            for tag_key, tag_value in tags.items():
                point.tag(tag_key, tag_value)

            # Add fields
            for field_key, field_value in fields.items():
                if isinstance(field_value, (int, float)):
                    point.field(field_key, field_value)
                else:
                    point.field(field_key, str(field_value))

            point.time(dt)

            # Write to InfluxDB
            write_api.write(bucket=INFLUXDB_BUCKET, record=point)

        logger.info(f"💾 Wrote {len(telemetry_data)} fields to InfluxDB for {device_id} [Time: {dt.isoformat()}]")
        return True

    except Exception as e:
        logger.error(f"Error writing to InfluxDB: {e}")
        return False

# ─── Device/Site Validation ────────────────────────────────────
_pg_conn = None

def get_pg_connection():
    """Lazy connection ke PostgreSQL (dibuka sekali, reuse)."""
    global _pg_conn
    if _pg_conn is None or _pg_conn.closed:
        _pg_conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
        )
    return _pg_conn


def validate_device(serial, site_name):
    """Validasi device (serial number) + site name terhadap PostgreSQL.

    Mengembalikan (valid: bool, reason: str).
    """
    if not VALIDATE_DEVICE:
        return True, 'validation disabled'

    if not serial:
        return False, 'missing serialNumber'

    try:
        conn = get_pg_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT s.name
            FROM tbl_devices d
            JOIN tbl_sites s ON d.site_id = s.id
            WHERE d.serial_number = %s
            """,
            (serial,),
        )
        row = cur.fetchone()
        cur.close()

        if row is None:
            return False, f'serial not found in DB: {serial}'

        db_site = row[0]
        if site_name and db_site != site_name:
            return False, f'site mismatch: DB={db_site}, payload={site_name}'

        return True, 'ok'
    except Exception as e:
        logger.error(f"❌ Validation query failed: {e}")
        # Fail-safe: jangan tulis data yang tidak bisa divalidasi
        return False, f'validation error: {e}'


# ─── RabbitMQ Callback ──────────────────────────────────────────
def callback(ch, method, properties, body):
    try:
        payload = json.loads(body)
        logger.info(f"📨 Received from queue: {method.routing_key}")

        serial = payload.get('serialNumber') or payload.get('serial')
        site = payload.get('site')
        valid, reason = validate_device(serial, site)
        if not valid:
            logger.warning(f"⚠️ Telemetry REJECTED: serial={serial}, site={site} — {reason}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        write_to_influxdb(payload)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

# ─── Main ────────────────────────────────────────────────────────
def main():
    logger.info("🚀 Starting MQTT → InfluxDB Consumer...")
    logger.info(f"   RabbitMQ: {RABBITMQ_HOST}:{RABBITMQ_PORT}")
    logger.info(f"   Queue: {RABBITMQ_QUEUE}")
    logger.info(f"   InfluxDB: {INFLUXDB_URL}")
    logger.info(f"   Bucket: {INFLUXDB_BUCKET}")
    logger.info(f"   Org: {INFLUXDB_ORG}")

    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )

    try:
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
        channel.basic_qos(prefetch_count=1)

        channel.basic_consume(
            queue=RABBITMQ_QUEUE,
            on_message_callback=callback,
            auto_ack=False
        )

        logger.info(f"✅ Listening on queue: {RABBITMQ_QUEUE}")
        logger.info("Press CTRL+C to stop")

        channel.start_consuming()

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()
        if _pg_conn is not None and not _pg_conn.closed:
            _pg_conn.close()
        write_api.close()
        influx_client.close()
        logger.info("👋 Consumer stopped")

if __name__ == "__main__":
    main()
