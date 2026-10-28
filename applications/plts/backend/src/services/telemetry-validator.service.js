/**
 * RabbitMQ Telemetry Validator Worker
 *
 * Worker yang memvalidasi data telemetry dari RabbitMQ sebelum
 * ditulis ke InfluxDB. Mencegah data orphaned dengan DeviceID/SiteID
 * yang tidak terdaftar di PostgreSQL.
 *
 * Flow:
 *   Simulator (MQTT) → RabbitMQ (telemetry_queue)
 *      ↓ this worker
 *   Validasi DeviceID (UUID) + SiteID di PostgreSQL
 *      ├── valid  → InfluxDB via TelemetryWriter
 *      └── invalid → RabbitMQ (telemetry.invalid) + alarm di DB
 */

'use strict';

require('dotenv').config();

const amqp = require('amqplib');
const prisma = require('../config/database');
const TelemetryWriter = require('./telemetry-writer.service');

class TelemetryValidator {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.writer = null;
    this.isValidating = false;
    this.batch = [];
    this.batchSize = parseInt(process.env.VALIDATOR_BATCH_SIZE) || 100;
    this.batchIntervalMs = parseInt(process.env.VALIDATOR_BATCH_INTERVAL_MS) || 5000;
    this.reconnecting = false;
    this.processedCount = 0;
  }

  // ─── Connect to RabbitMQ ──────────────────────────────────────
  async connect() {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    console.log('🔌 Connecting to RabbitMQ...');
    this.connection = await amqp.connect(amqpUrl, {
      heartbeat: 30,
    });
    this.channel = await this.connection.createChannel();
    this.channel.prefetch(this.batchSize);

    // Declare queues - gunakan queue yang DIPAKAI oleh simulator: telemetry_queue
    await this.channel.assertQueue('telemetry_queue', { durable: true });
    await this.channel.assertQueue('telemetry.validated', { durable: true });
    await this.channel.assertQueue('telemetry.invalid', { durable: true });

    this.connection.on('error', (err) => {
      console.error('❌ RabbitMQ Connection Error:', err.message);
      this.reconnect();
    });

    this.connection.on('close', () => {
      console.warn('⚠️ RabbitMQ Connection Closed');
      this.reconnect();
    });

    this.writer = new TelemetryWriter();
    console.log('✅ Connected to RabbitMQ — consuming telemetry_queue');
  }

  async reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    console.log('🔄 Attempting to reconnect to RabbitMQ in 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await this.connect();
      this.start();
      this.reconnecting = false;
    } catch (err) {
      console.error('❌ Reconnection failed:', err.message);
      this.reconnecting = false;
      this.reconnect();
    }
  }

  // ─── Start consuming ──────────────────────────────────────────
  start() {
    if (!this.channel) {
      throw new Error('RabbitMQ channel belum terhubung');
    }

    this.channel.consume('telemetry_queue', async (msg) => {
      if (msg === null) return;

      try {
        const payload = JSON.parse(msg.content.toString());

        // Extract DeviceID (UUID) dari payload simulator: payload.deviceId
        // Simulator mengirim: { deviceId, serialNumber, tenant, site, timestamp, data, ... }
        const deviceId = payload.deviceId || payload.device_id;
        const serialNumber = payload.serialNumber;
        const siteName = payload.site;
        const tenant = payload.tenant;

        if (!deviceId && !serialNumber) {
          console.warn('⚠️ Payload missing deviceId and serialNumber, rejecting');
          this.channel.sendToQueue(
            'telemetry.invalid',
            Buffer.from(JSON.stringify({
              payload,
              error: 'Missing deviceId/serialNumber in payload',
              timestamp: new Date().toISOString(),
            })),
            { persistent: true }
          );
          this.channel.ack(msg);
          return;
        }

        // Validate DeviceID: prefer serialNumber if available, fallback to deviceId
        const lookupKey = serialNumber || deviceId;
        const isValid = await this.validateDevice(lookupKey, siteName, payload);

        if (isValid) {
          this.batch.push({ msg, payload });
          if (this.batch.length >= this.batchSize) {
            await this.flushBatch();
          }
        } else {
          // Push ke queue invalid
          this.channel.sendToQueue(
            'telemetry.invalid',
            Buffer.from(JSON.stringify({
              payload,
              error: 'DeviceID or Site not found in PostgreSQL',
              timestamp: new Date().toISOString(),
            })),
            { persistent: true }
          );

          // Log alarm
          await this.logAlarm(payload);

          // Ack message
          this.channel.ack(msg);
        }
      } catch (err) {
        console.error('❌ Failed to process telemetry message:', err.message);
        this.channel.nack(msg, false, false); // dead-letter
      }
    });

    // Auto-flush batch periode
    setInterval(() => {
      if (this.batch.length > 0) {
        this.flushBatch().catch(err =>
          console.error('❌ Batch flush failed:', err.message)
        );
      }
    }, this.batchIntervalMs);

    console.log('🎯 Telemetry Validator started — consuming from telemetry_queue');
  }

  // ─── Validate DeviceID + SiteName di PostgreSQL ────────────────
  async validateDevice(deviceId, siteName, payload) {
    try {
      if (!deviceId) return false;

      // Cari device berdasarkan serialNumber dari payload
      // Payload simulator mengandung serialNumber (e.g., "SN-000051")
      // UUID di payload (deviceId) TIDAK cocok dengan UUID di DB
      const device = await prisma.device.findFirst({
        where: { serialNumber: deviceId }, // Try UUID first (backwards compat)
        select: { id: true, siteId: true, status: true, site: { select: { name: true } }, serialNumber: true },
      });

      // Jika tidak ketemu by UUID, coba by serialNumber
      let foundDevice = device;
      if (!foundDevice) {
        // Extract serialNumber from payload if available
        // This is handled at caller level - we'll also try site-based lookup
        console.warn(`⚠️ Device UUID not found in DB: ${deviceId}`);
        return false;
      }
      
      // Validasi site name match
      if (siteName && foundDevice.site && foundDevice.site.name !== siteName) {
        console.warn(`⚠️ Site mismatch: DB=${foundDevice.site.name}, Payload=${siteName}`);
        return false;
      }

      // ── Sinkronkan last_seen_at & status dari telemetry masuk ──
      // Device yang mengirim telemetry = hidup. Update last_seen_at dan
      // kembalikan status ke ONLINE bila sebelumnya OFFLINE (atau FAULT
      // bila payload s_device melaporkan FAULT).
      await this.syncDeviceStatus(foundDevice, payload);
      return true;
    } catch (err) {
      console.error('❌ Prisma device validation error:', err.message);
      return false;
    }
  }

  // ─── Update last_seen_at & status device dari telemetry valid ──
  async syncDeviceStatus(device, payload) {
    try {
      const sDevice = payload?.data?.s_device;
      const updateData = { lastSeenAt: new Date() };

      // s_device simulator: ONLINE / WARNING / FAULT (tidak pernah OFFLINE).
      // FAULT → status FAULT; selain itu device hidup → ONLINE.
      // Catatan: status OFFLINE TIDAK diset otomatis dari self-report, karena
      // deteksi offline yang benar adalah heartbeat-timeout (watchdog terpisah),
      // bukan laporan perangkat sendiri (hindari device "terjebak" offline).
      if (sDevice === 'FAULT') {
        updateData.status = 'FAULT';
      } else if (device.status !== 'ONLINE') {
        updateData.status = 'ONLINE';
      }

      await prisma.device.update({
        where: { id: device.id },
        data: updateData,
      });
    } catch (err) {
      // Gagal update metadata tidak boleh menolak telemetry valid.
      console.warn(`⚠️ Gagal sync status device ${device.serialNumber}: ${err.message}`);
    }
  }

  // ─── Flush batch to InfluxDB via TelemetryWriter ─────────────
  async flushBatch() {
    // Cegah eksekusi ganda: flushBatch dipanggil dari consume (batch penuh) DAN
    // dari interval auto-flush — tanpa guard, dua flush berjalan bersamaan dan
    // meng-ack delivery tag yang sama → channel ditutup server (406).
    if (this.isValidating) return;
    this.isValidating = true;
    try {
      if (this.batch.length === 0) return;

      const toAck = [];
      for (const item of this.batch) {
        try {
          // Gunakan deviceId dari payload simulator (payload.deviceId)
          const deviceId = item.payload.deviceId || item.payload.device_id;
          await this.writer.writeTelemetry(deviceId, item.payload);
          toAck.push(item.msg);
        } catch (err) {
          console.error('❌ Failed to write telemetry:', err.message);
          // Requeue ke queue invalid
          this.channel.sendToQueue(
            'telemetry.invalid',
            Buffer.from(JSON.stringify({
              payload: item.payload,
              error: err.message,
              timestamp: new Date().toISOString(),
            })),
            { persistent: true }
          );
        }
      }

      // Ack all successful messages
      for (const msg of toAck) {
        this.channel.ack(msg);
      }

      this.processedCount += toAck.length;
      console.log(`📥 Flushed ${toAck.length}/${this.batch.length} valid telemetry points to InfluxDB (Total: ${this.processedCount})`);
      this.batch = [];
    } finally {
      this.isValidating = false;
    }
  }

  // ─── Log alarm untuk data invalid ────────────────────────────
  async logAlarm(payload) {
    try {
      // deviceId di tbl_alarms adalah required FK - tidak bisa NULL
      // Kita skip alarm creation untuk data invalid
      // (device tidak ditemukan di DB = tidak valid sebagai FK)
      console.warn(
        `⚠️ Telemetry INVALID: ` +
        `Device=${payload.device_id || payload.deviceId}, ` +
        `Serial=${payload.serialNumber}, ` +
        `Site=${payload.site} — dikirim ke telemetry.invalid queue`
      );
    } catch (err) {
      console.error('❌ Failed to log alarm:', err.message);
    }
  }

  // ─── Graceful shutdown ───────────────────────────────────────
  async shutdown() {
    console.log('\n🛑 Telemetry Validator shutting down...');
    try {
      await this.flushBatch();
      await this.writer?.close();
      await this.channel?.close();
      await this.connection?.close();
      await prisma.$disconnect();
      console.log('✅ Telemetry Validator shutdown complete');
    } catch (err) {
      console.error('❌ Error during shutdown:', err.message);
    }
    process.exit(0);
  }
}

module.exports = TelemetryValidator;