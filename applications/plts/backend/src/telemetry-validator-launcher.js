/**
 * Standalone Telemetry Validator Worker
 *
 * Proses terpisah dari plts-backend API.
 * Dijalankan via PM2 sebagai 'plts-telemetry-validator'.
 *
 * Perintah:
 *   pm2 start ecosystem.config.js --env production --only plts-telemetry-validator
 *
 * Flow:
 *   MQTT Gateway → RabbitMQ (telemetry.raw)
 *      ↓ this worker (validates DeviceID + SiteID)
 *   Telemetry OK → RabbitMQ (telemetry.validated) → InfluxDB
 *   Telemetry Invalid → RabbitMQ (telemetry.invalid) + Alarm di DB
 */

'use strict';

require('dotenv').config();

const TelemetryValidator = require('./services/telemetry-validator.service');

const MAX_CONNECT_ATTEMPTS = 10;
const BASE_RETRY_DELAY_MS = 2000; // 2s base

const validator = new TelemetryValidator();

async function connectWithRetry(attempt = 1) {
  try {
    await validator.connect();
    validator.start();
    console.log(`✅ Validator connected on attempt #${attempt}`);
  } catch (err) {
    if (attempt >= MAX_CONNECT_ATTEMPTS) {
      console.error(`❌ Failed after ${MAX_CONNECT_ATTEMPTS} attempts:`, err.message);
      process.exit(1);
    }
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(`⚠️ Connection attempt #${attempt} failed: ${err.message}. Retry in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return connectWithRetry(attempt + 1);
  }
}

connectWithRetry();

// Graceful shutdown
process.on('SIGTERM', () => validator.shutdown());
process.on('SIGINT', () => validator.shutdown());
