/**
 * Raw Data Capture Script
 *
 * Jalankan sekali untuk melihat format payload real dari inverter/rectifier
 * via RabbitMQ (telemetry.raw queue).
 *
 * Usage: node src/scripts/capture-raw-telemetry.js
 */

'use strict';

require('dotenv').config();

const amqp = require('amqplib');

async function captureRawData() {
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
  console.log('🔌 Connecting to RabbitMQ...');

  const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();

  await channel.assertQueue('telemetry.raw', { durable: true });

  console.log('📥 Waiting for messages (Ctrl+C to stop)...\n');

  channel.consume('telemetry.raw', (msg) => {
    if (msg === null) return;

    const payload = JSON.parse(msg.content.toString());

    console.log('='.repeat(60));
    console.log('📦 RAW PAYLOAD RECEIVED:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n📋 KEY FIELDS:');
    console.log(`  device_id: ${payload.device_id}`);
    console.log(`  site_id: ${payload.site_id}`);
    console.log(`  vendor: ${payload.vendor}`);
    console.log(`  timestamp: ${payload.timestamp}`);
    console.log(`  data keys: ${Object.keys(payload).filter(k => k !== 'device_id' && k !== 'site_id' && k !== 'vendor' && k !== 'timestamp' && k !== 'tenant_id').join(', ')}`);
    console.log('\n');

    channel.ack(msg);
  });
}

captureRawData().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});