/**
 * Standalone Aggregator Worker
 *
 * Worker ini berjalan sebagai proses terpisah dari plts-backend API.
 * Dijalankan via PM2 sebagai 'plts-aggregator-worker'.
 *
 * Perintah:
 *   pm2 start ecosystem.config.js --env production --only plts-aggregator-worker
 */

'use strict';

require('dotenv').config();

const AggregatorWorker = require('./services/aggregator-worker.service');

const worker = new AggregatorWorker();
worker.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📦 Aggregator Worker received SIGTERM, shutting down...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📦 Aggregator Worker received SIGINT, shutting down...');
  worker.stop();
  process.exit(0);
});
