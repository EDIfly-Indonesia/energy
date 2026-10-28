/**
 * Aggregator Worker Service
 *
 * Worker untuk sinkronisasi telemetry dari InfluxDB ke PostgreSQL.
 * Dilengkapi dengan Circuit Breaker, Retry Exponential Backoff, dan Pagination.
 *
 * Fitur:
 * - Circuit breaker untuk InfluxDB queries (terbuka saat error berulang)
 * - Retry dengan exponential backoff (max 3 attempt, 500ms base)
 * - Pagination per hari pada historical sync (maks 3 hari, 2000 points/hari)
 * - Prisma logging dimatikan untuk mengurangi I/O overhead
 */

'use strict';

const { InfluxDB } = require('@influxdata/influxdb-client');
const prisma = require('../config/database');
const cron = require('node-cron');

// ─── Measurement Map ───────────────────────────────────────────
const MEASUREMENT_MAP = {
  'p_': 'power',
  'e_': 'energy',
  'v_': 'voltage',
  'c_': 'current',
  't_': 'temperature',
  'b_': 'battery',
  'f_': 'frequency',
  'i_': 'irradiance',
  's_': 'status',
};

const measurements = Object.values(MEASUREMENT_MAP);
const filters = measurements.map(m => `r._measurement == "${m}"`).join(' or ');

// ─── Circuit Breaker ───────────────────────────────────────────
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 menit
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN — InfluxDB unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState() {
    return { state: this.state, failureCount: this.failureCount, nextAttempt: this.nextAttempt };
  }
}

// ─── Retry with Exponential Backoff ────────────────────────────
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 500) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`  ⚠️ Retry ${attempt}/${maxRetries} after ${delay}ms — ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// ─── Device Cache ──────────────────────────────────────────────
const deviceCache = new Map();
const CACHE_TTL = 60000; // 1 menit

class AggregatorWorker {
  constructor() {
    this.influxDB = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUXDB_TOKEN,
      timeout: 30000
    });
    this.queryApi = this.influxDB.getQueryApi(process.env.INFLUXDB_ORG);
    this.bucket = process.env.INFLUXDB_BUCKET || 'telemetry';
    this.isRunning = false;
    this.batchSize = parseInt(process.env.AGGREGATOR_BATCH_SIZE) || 500;
    this.syncEnabled = process.env.AGGREGATOR_ENABLED !== 'false';
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
  }

  // ─── Cache Methods ────────────────────────────────────────────
  async getCachedDevice(identifier) {
    if (!identifier) return null;

    const cacheKey = `device_${identifier}`;
    if (deviceCache.has(cacheKey)) {
      const entry = deviceCache.get(cacheKey);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.device;
      }
      deviceCache.delete(cacheKey);
    }

    // Tentukan apakah identifier adalah UUID atau serial number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const isSerial = /^SN-\d+$/.test(identifier);

    let device;
    if (isUuid) {
      device = await prisma.device.findFirst({
        where: { id: identifier },
        include: { site: { select: { id: true } } }
      });
    } else if (isSerial) {
      device = await prisma.device.findFirst({
        where: { serialNumber: identifier },
        include: { site: { select: { id: true } } }
      });
    } else {
      // Fallback: coba kedua field
      device = await prisma.device.findFirst({
        where: {
          OR: [
            { serialNumber: identifier },
            { id: identifier }
          ]
        },
        include: { site: { select: { id: true } } }
      });
    }

    if (device) {
      deviceCache.set(cacheKey, { device, timestamp: Date.now() });
    }

    return device;
  }

  invalidateDeviceCache(identifier) {
    deviceCache.delete(`device_${identifier}`);
  }

  // ─── InfluxDB Query Helper (circuit breaker + retry) ──────────
  async runQuery(query) {
    return await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff(() =>
        this.queryApi.collectRows(query)
      );
    });
  }

  // ─── Sinkronisasi Raw Telemetry (Optimasi) ────────────────────
  async syncRawTelemetry() {
    if (!this.syncEnabled) {
      console.log('ℹ️ Aggregator disabled by environment');
      return;
    }

    console.log('🔄 Syncing raw telemetry from InfluxDB...');
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${fiveMinutesAgo})
        |> filter(fn: (r) => ${filters})
        |> limit(n: ${this.batchSize * 2})
    `;

    let rows;
    try {
      rows = await this.runQuery(query);
    } catch (e) {
      console.error('❌ InfluxDB query failed (circuit breaker / retry exhausted):', e.message);
      return;
    }

    if (rows.length === 0) {
      console.log('ℹ️ No new telemetry to sync');
      return;
    }

    console.log(`📡 Found ${rows.length} new records to sync`);

    // Group rows by device to reduce database calls
    // InfluxDB memiliki tag: device_id (UUID simulator) dan serial (SN-000001)
    // Prioritaskan serial karena cocok dengan serialNumber di PostgreSQL
    const groupedByDevice = {};
    for (const row of rows) {
      const deviceId = row.serial || row.device_id;
      if (!groupedByDevice[deviceId]) {
        groupedByDevice[deviceId] = [];
      }
      groupedByDevice[deviceId].push(row);
    }

    let totalSynced = 0;

    for (const [deviceId, deviceRows] of Object.entries(groupedByDevice)) {
      const device = await this.getCachedDevice(deviceId);
      if (!device) continue;

      const upserts = [];
      for (const row of deviceRows) {
        upserts.push(prisma.telemetryData.upsert({
          where: {
            device_id_standard_key_timestamp: {
              deviceId: device.id,
              standardKey: row._field,
              timestamp: row._time
            }
          },
          update: {
            value: String(row._value),
            quality: row._value !== null ? 'GOOD' : 'BAD'
          },
          create: {
            deviceId: device.id,
            standardKey: row._field,
            value: String(row._value),
            quality: row._value !== null ? 'GOOD' : 'BAD',
            timestamp: row._time,
            createdAt: new Date()
          }
        }));
      }

      if (upserts.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < upserts.length; i += batchSize) {
          const batch = upserts.slice(i, i + batchSize);
          await prisma.$transaction(batch);
          totalSynced += batch.length;
        }
      }
    }

    console.log(`✅ Synced ${totalSynced} telemetry points`);
  }

  // ─── Daily Aggregation (dari PostgreSQL — sumber terlengkap) ────
  // Data InfluxDB untuk hari kemarin bisa terhapus/absent (mis. device_id
  // stale sudah dibersihkan), sehingga agregasi harian dihitung ulang dari
  // tbl_telemetry_data yang sudah tersinkron. Energi = counter e_daily (Wh).
  async runDailyAggregation(days = 3) {
    if (!this.syncEnabled) return;

    console.log(`📊 Running daily aggregation from PostgreSQL (last ${days} days)...`);

    const rows = await prisma.$queryRaw`
      WITH dev_day AS (
        SELECT
          DATE(td.timestamp)::date AS "date",
          d.site_id AS "site_id",
          td.device_id AS "device_id",
          MAX(CASE WHEN td.standard_key = 'e_daily'
                   AND td.value ~ '^[0-9]+([.][0-9]+)?$' THEN td.value::float END) AS "prod_wh",
          MAX(CASE WHEN td.standard_key = 'e_daily_load'
                   AND td.value ~ '^[0-9]+([.][0-9]+)?$' THEN td.value::float END) AS "cons_wh",
          MAX(CASE WHEN td.standard_key = 'e_daily_export'
                   AND td.value ~ '^[0-9]+([.][0-9]+)?$' THEN td.value::float END) AS "exp_wh",
          MAX(CASE WHEN td.standard_key = 'e_daily_import'
                   AND td.value ~ '^[0-9]+([.][0-9]+)?$' THEN td.value::float END) AS "imp_wh"
        FROM tbl_telemetry_data td
        JOIN tbl_devices d ON d.id = td.device_id
        WHERE td.standard_key IN ('e_daily','e_daily_load','e_daily_export','e_daily_import')
          AND td.timestamp >= NOW() - make_interval(days => ${days}::int)
        GROUP BY DATE(td.timestamp)::date, d.site_id, td.device_id
      ),
      power_day AS (
        SELECT
          DATE(td.timestamp)::date AS "date",
          d.site_id AS "site_id",
          AVG(td.value::float) AS "avg_w",
          MAX(td.value::float) AS "peak_w"
        FROM tbl_telemetry_data td
        JOIN tbl_devices d ON d.id = td.device_id
        WHERE td.standard_key IN ('p_active','p_dc','p_ac')
          AND td.value ~ '^[0-9]+([.][0-9]+)?$'
          AND td.timestamp >= NOW() - make_interval(days => ${days}::int)
        GROUP BY DATE(td.timestamp)::date, d.site_id
      )
      SELECT
        e."date" AS "date",
        e."site_id" AS "site_id",
        COALESCE(SUM(e.prod_wh),0) AS "prod_wh",
        COALESCE(SUM(e.cons_wh),0) AS "cons_wh",
        COALESCE(SUM(e.exp_wh),0) AS "exp_wh",
        COALESCE(SUM(e.imp_wh),0) AS "imp_wh",
        p.avg_w AS "avg_w",
        p.peak_w AS "peak_w"
      FROM dev_day e
      LEFT JOIN power_day p ON p.date = e.date AND p.site_id = e.site_id
      GROUP BY e.date, e.site_id, p.avg_w, p.peak_w
      ORDER BY e.date DESC
    `;

    let updated = 0;
    for (const r of rows) {
      const data = {
        totalProduction: String(Math.round(Number(r.prod_wh) || 0)),
        totalConsumption: String(Math.round(Number(r.cons_wh) || 0)),
        totalExport: String(Math.round(Number(r.exp_wh) || 0)),
        totalImport: String(Math.round(Number(r.imp_wh) || 0)),
        totalStorage: '0',
        peakPower: r.peak_w ? String(Math.round(Number(r.peak_w) || 0)) : '0',
        avgPower: r.avg_w ? String(Math.round(Number(r.avg_w) || 0)) : '0',
      };

      const existing = await prisma.dailySummary.findFirst({
        where: { siteId: r.site_id, date: r.date }
      });

      if (existing) {
        await prisma.dailySummary.update({
          where: { id: existing.id },
          data
        });
      } else {
        await prisma.dailySummary.create({
          data: { ...data, siteId: r.site_id, date: r.date }
        });
      }
      updated++;
    }

    console.log(`✅ Daily aggregation from PostgreSQL completed (${updated} site-days)`);
  }

  // ─── Hourly Aggregation ───────────────────────────────────────
  async runHourlyAggregation() {
    if (!this.syncEnabled) return;

    console.log('📊 Running hourly aggregation...');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const twoHoursAgoStr = twoHoursAgo.toISOString();

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${twoHoursAgoStr})
        |> filter(fn: (r) => r._measurement == "power" or r._measurement == "energy")
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        |> limit(n: ${this.batchSize})
    `;

    let rows;
    try {
      rows = await this.runQuery(query);
    } catch (e) {
      console.error('❌ Hourly aggregation — InfluxDB query failed:', e.message);
      return;
    }

    if (rows.length === 0) return;

    let count = 0;
    for (const row of rows) {
      const device = await this.getCachedDevice(row.device_id);
      if (!device) continue;

      const existing = await prisma.telemetryAggregate.findFirst({
        where: {
          deviceId: device.id,
          standardKey: row._field,
          period: 'hourly',
          periodStart: row._time
        }
      });

      const data = {
        avgValue: String(row._value),
        minValue: String(row._value),
        maxValue: String(row._value),
        sumValue: String(row._value),
        count: 1,
        periodStart: row._time,
        periodEnd: new Date(new Date(row._time).getTime() + 3600000)
      };

      if (existing) {
        await prisma.telemetryAggregate.update({
          where: { id: existing.id },
          data
        });
      } else {
        await prisma.telemetryAggregate.create({
          data: {
            ...data,
            deviceId: device.id,
            standardKey: row._field,
            period: 'hourly'
          }
        });
      }
      count++;
    }

    console.log(`✅ Hourly aggregation completed (${count} records)`);
  }

  // ─── Initialize Historical Data ───────────────────────────────
  async initializeHistoricalData() {
    console.log('🚀 Initializing historical aggregation...');

    try {
      const recentCount = await prisma.telemetryData.count({
        where: { timestamp: { gte: new Date(Date.now() - 3 * 24 * 3600 * 1000) } }
      });

      if (recentCount === 0) {
        console.log('📡 No recent raw telemetry in PostgreSQL. Limited sync initiated...');
        await this.fullHistoricalSync(3);
      } else {
        console.log(`📊 Found ${recentCount} recent telemetry points in PostgreSQL`);
      }

      const aggCount = await prisma.telemetryAggregate.count();
      if (aggCount === 0) {
        console.log('📊 No aggregates found. Running initial hourly aggregation...');
        await this.runHourlyAggregation();
      }

      const dailyCount = await prisma.dailySummary.count();
      if (dailyCount === 0) {
        console.log('📅 No daily summary found. Running initial daily aggregation...');
        await this.runDailyAggregation();
      }

      console.log('✅ Historical initialization complete.');
    } catch (e) {
      console.error('❌ Initialization failed:', e.message);
    }
  }

  // ─── Full Historical Sync (Paginasi per Hari) ─────────────────
  async fullHistoricalSync(days = 3) {
    console.log(`🔄 Limited historical sync from InfluxDB (${days} days, paginated)...`);

    const totalPoints = await this.getCountFromInflux(days);
    console.log(`🔍 Total points in InfluxDB for ${days} days: ${totalPoints || 'unknown'}`);

    // Paginasi: 2000 points per batch
    const BATCH_PER_DAY = 2000;
    let totalSynced = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: ${new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()})
          |> filter(fn: (r) => ${filters})
          |> limit(n: ${BATCH_PER_DAY}, offset: ${offset})
      `;

      let rows;
      try {
        rows = await this.runQuery(query);
      } catch (e) {
        if (e.message.includes('Circuit breaker is OPEN')) {
          console.warn('⚠️ Circuit breaker OPEN — pausing historical sync');
          hasMore = false;
          break;
        }
        console.error('❌ Historical sync query failed:', e.message);
        hasMore = false;
        break;
      }

      if (rows.length === 0 || rows.length < BATCH_PER_DAY) {
        hasMore = false;
      }

      if (rows.length > 0) {
        const upserts = [];
        for (const row of rows) {
          const device = await this.getCachedDevice(row.device_id);
          if (!device) continue;

          upserts.push(prisma.telemetryData.upsert({
            where: {
              device_id_standard_key_timestamp: {
                deviceId: device.id,
                standardKey: row._field,
                timestamp: row._time
              }
            },
            update: { value: String(row._value), quality: row._value !== null ? 'GOOD' : 'BAD' },
            create: {
              deviceId: device.id,
              standardKey: row._field,
              value: String(row._value),
              quality: row._value !== null ? 'GOOD' : 'BAD',
              timestamp: row._time,
              createdAt: new Date()
            }
          }));
        }

        if (upserts.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < upserts.length; i += batchSize) {
            const batch = upserts.slice(i, i + batchSize);
            await prisma.$transaction(batch);
            totalSynced += batch.length;
          }
          console.log(`  ✅ Synced ${totalSynced} points (offset: ${offset})...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      offset += BATCH_PER_DAY;
    }

    console.log(`✅ Historical sync completed (${totalSynced} points)`);
  }

  // ─── Helper: Get count of points from InfluxDB ────────────────
  async getCountFromInflux(days) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()})
        |> filter(fn: (r) => ${filters})
        |> count()
        |> group()
    `;
    try {
      const rows = await this.runQuery(query);
      return rows.length > 0 ? Number(rows[0]._value) : 0;
    } catch (e) {
      console.warn('⚠️ Could not get count from InfluxDB:', e.message);
      return 0;
    }
  }

  // ─── Start Service ─────────────────────────────────────────────
  start() {
    if (this.isRunning) {
      console.log('⚠️ Aggregator worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Aggregator Worker...');

    // Jalankan inisialisasi data historis sekali (dengan timeout)
    setImmediate(async () => {
      try {
        await this.initializeHistoricalData();
      } catch (e) {
        console.error('❌ Initialization failed:', e.message);
      }
    });

    // Sinkronisasi mentah setiap 5 menit
    cron.schedule('*/5 * * * *', () => {
      if (this.syncEnabled) {
        this.syncRawTelemetry();
      }
    });

    // Agregasi hourly: jalankan berkala (data InfluxDB, upsert idempotent) supaya
    // tbl_telemetry_aggregates period hourly terisi → sumber aggregates/latest,
    // heatmap konsumsi, dan agregasi harian. Backfill awal terjadi otomatis saat
    // start (initializeHistoricalData → runHourlyAggregation saat aggCount === 0).
    cron.schedule('25 * * * *', () => this.runHourlyAggregation());

    // Agregasi harian: refresh berkala (data dari PostgreSQL raw, bukan InfluxDB)
    // agar nilai "hari ini" ikut ter-update; backfill 3 hari saat start otomatis
    // via initializeHistoricalData → runDailyAggregation() (dailyCount === 0).
    cron.schedule('15 */6 * * *', () => this.runDailyAggregation());

    // Agregasi mingguan pada Senin jam 1:0
    cron.schedule('0 1 * * 1', () => this.runWeeklyAggregation());

    // Agregasi bulanan pada hari pertama tiap bulan jam 2:0
    cron.schedule('0 2 1 * *', () => this.runMonthlyAggregation());

    console.log('✅ Aggregator Worker started successfully!');
  }

  // ─── Stop Service ──────────────────────────────────────────────
  stop() {
    this.isRunning = false;
    console.log('🛑 Aggregator Worker stopped');
  }

  // ─── Placeholder methods for weekly/monthly ────────────────────
  async runWeeklyAggregation() {
    console.log('📈 Weekly aggregation - placeholder');
  }

  async runMonthlyAggregation() {
    console.log('📊 Monthly aggregation - placeholder');
  }
}

module.exports = AggregatorWorker;
