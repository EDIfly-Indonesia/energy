#!/usr/bin/env python3
"""
MQTT Consumer via RabbitMQ AMQP
Mengambil data dari queue RabbitMQ dan menyimpan ke PostgreSQL
"""

import json
import logging
import os
import sys
import time
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
import pika

load_dotenv()

# ─── Configuration ──────────────────────────────────────────────
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'admin')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD', 'Pltsapp2026**')
RABBITMQ_QUEUE = os.getenv('RABBITMQ_QUEUE', 'telemetry_queue')

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', 5432)
DB_NAME = os.getenv('DB_NAME', 'energy_platform')
DB_USER = os.getenv('DB_USER', 'energy_app')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'Pltsapp2026**')

LOG_FILE = os.getenv('LOG_FILE', './logs/mqtt-consumer.log')

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

# ─── Database Connection ────────────────────────────────────────
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

def save_telemetry(data):
    """Save telemetry data to PostgreSQL"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        
        # Extract data
        device_id = data.get('deviceId')
        timestamp = data.get('timestamp')
        telemetry_data = data.get('data', {})
        quality = data.get('quality', 'GOOD')
        
        # Find device by device_id (INV-xxx)
        cur.execute("""
            SELECT id FROM tbl_devices WHERE serial_number LIKE %s
        """, (f'%{device_id}%',))
        
        device_result = cur.fetchone()
        
        if not device_result:
            logger.warning(f"Device {device_id} not found, skipping...")
            cur.close()
            conn.close()
            return False
        
        device_id_db = device_result[0]
        
        # Insert telemetry data
        for key, value in telemetry_data.items():
            if key.startswith('s_'):
                continue  # Skip status fields for now
            
            if isinstance(value, (int, float)):
                cur.execute("""
                    INSERT INTO tbl_telemetry_data (device_id, standard_key, value, timestamp)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (device_id, standard_key, timestamp) DO NOTHING
                """, (device_id_db, key, float(value), timestamp))
        
        conn.commit()
        cur.close()
        conn.close()
        
        logger.info(f"💾 Saved telemetry for {device_id} ({len(telemetry_data)} fields)")
        return True
        
    except Exception as e:
        logger.error(f"Error saving telemetry: {e}")
        conn.rollback()
        conn.close()
        return False

# ─── RabbitMQ Callback ──────────────────────────────────────────
def callback(ch, method, properties, body):
    try:
        payload = json.loads(body)
        logger.info(f"📨 Received from queue: {method.routing_key}")
        
        # Save to database
        save_telemetry(payload)
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

# ─── Main ────────────────────────────────────────────────────────
def main():
    logger.info("🚀 Starting RabbitMQ Consumer...")
    logger.info(f"   RabbitMQ: {RABBITMQ_HOST}:{RABBITMQ_PORT}")
    logger.info(f"   Queue: {RABBITMQ_QUEUE}")
    logger.info(f"   Database: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    # Connect to RabbitMQ
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
        
        # Declare queue (make sure it exists)
        channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
        
        # Bind queue to exchange if needed
        # channel.queue_bind(exchange='amq.topic', queue=RABBITMQ_QUEUE, routing_key='energy.#')
        
        # Set prefetch count
        channel.basic_qos(prefetch_count=1)
        
        # Start consuming
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
        logger.info("👋 Consumer stopped")

if __name__ == "__main__":
    main()
