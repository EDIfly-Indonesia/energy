'use strict';

/**
 * Telemetry Controller
 * Mengelola telemetry data, aggregates, dan summary untuk dashboard SCADA.
 */
// Import PrismaClient instance — Prisma namespace (Prisma.sql, Prisma.raw)
// is attached to the instance in config/database.js
const prisma = require('../../config/database');
const { Prisma } = require('@prisma/client');
const TelemetryQuery = require('../../services/telemetry-query.service');

const telemetryQuery = new TelemetryQuery();

// ─── GET /telemetry ─────────────────────────────────────────────────────────────
exports.getTelemetry = async (request, reply) => {
  try {
    const { endpoint, deviceId } = request.query ?? {};

    // Route to sites endpoint when requested
    if (endpoint === 'sites') {
      const sites = await prisma.site.findMany({
        include: {
          tenant: { select: { id: true, name: true } },
          _count: { select: { devices: true } },
        },
      });
      return reply.code(200).send({
        success: true,
        data: sites,
        meta: { total: sites.length },
        errors: null,
      });
    }

    // Default: telemetry mappings
    const mappings = await prisma.telemetryMapping.findMany({
      where:   deviceId ? { deviceId } : undefined,
      include: { device: { select: { id: true, serialNumber: true, siteId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.code(200).send({
      success: true,
      data: mappings,
      meta: { total: mappings.length },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getTelemetry error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/summary ─────────────────────────────────────────────────────
// Digunakan oleh stat cards di dashboard: totalDevices, onlineDevices, activeAlarms, totalEnergy
exports.getSummary = async (request, reply) => {
  try {
    const { siteId, startDate, endDate } = request.query ?? {};

    // Default to today if range not provided
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const startStr = start.toISOString();
    const endStr = end.toISOString();

    // Prisma.raw for dynamic SQL fragments (siteClause) + direct interpolation
    // for primitif values (startStr/endStr) to avoid GROUP BY errors.
    const siteClause = siteId
      ? Prisma.sql`d.site_id = ${siteId}::uuid`
      : Prisma.sql`1=1`;

    let summary;
    // Jalur 1: agregat harian (bila worker sudah membentuknya).
    const aggregates = await prisma.telemetryAggregate.findMany({
      where: {
        period: 'daily',
        ...(siteId && { device: { siteId } }),
        periodStart: { gte: start, lte: end },
      },
    });

    if (aggregates.length > 0) {
      summary = [{
        // Energi/produksi harian disimpan pada key e_daily (Wh) → kWh
        todayProduction:  aggregates.filter(a => a.standardKey === 'e_daily').reduce((s,a) => s + Number(a.sumValue||0), 0) / 1000.0,
        todayConsumption: aggregates.filter(a => a.standardKey === 'e_daily_load').reduce((s,a) => s + Number(a.sumValue||0), 0) / 1000.0,
        gridExport:       aggregates.filter(a => a.standardKey === 'e_daily_export').reduce((s,a) => s + Number(a.sumValue||0), 0) / 1000.0,
        gridImport:       aggregates.filter(a => a.standardKey === 'e_daily_import').reduce((s,a) => s + Number(a.sumValue||0), 0) / 1000.0,
        batteryCharging:  aggregates.filter(a => a.standardKey === 'b_charge').reduce((s,a) => s + Number(a.sumValue||0), 0),
        batteryDischarging: aggregates.filter(a => a.standardKey === 'b_discharge').reduce((s,a) => s + Number(a.sumValue||0), 0),
        batteryCapacity: aggregates.filter(a => a.standardKey === 'b_capacity').reduce((s,a) => s + Number(a.avgValue||0), 0),
      }];
    } else {
      // Jalur 2 (fallback): hitung dari data mentah tbl_telemetry_data hari ini.
      // Energi harian device = nilai counter e_daily/e_daily_load terbesar hari itu (Wh).
      // (counter e_daily bertambah sepanjang hari; MAX per device ≈ total energi harian)
      const raw = await prisma.$queryRaw`
        WITH dev_today AS (
          SELECT
            td.device_id AS "device_id",
            MAX(CASE WHEN td.standard_key = 'e_daily' THEN td.value::float END) AS "prod_wh",
            MAX(CASE WHEN td.standard_key = 'e_daily_load' THEN td.value::float END) AS "cons_wh",
            MAX(CASE WHEN td.standard_key = 'e_daily_export' THEN td.value::float END) AS "export_wh",
            MAX(CASE WHEN td.standard_key = 'e_daily_import' THEN td.value::float END) AS "import_wh"
          FROM tbl_telemetry_data td
          JOIN tbl_devices d ON d.id = td.device_id
          WHERE td.timestamp >= ${start}::timestamptz
            AND td.timestamp <= ${end}::timestamptz
            AND ${siteClause}
          GROUP BY td.device_id
        )
        SELECT
          COALESCE(SUM(prod_wh), 0) / 1000.0   AS "todayProduction",
          COALESCE(SUM(cons_wh), 0) / 1000.0   AS "todayConsumption",
          COALESCE(SUM(export_wh), 0) / 1000.0 AS "gridExport",
          COALESCE(SUM(import_wh), 0) / 1000.0 AS "gridImport"
        FROM dev_today
      `;
      summary = [{
        todayProduction:  Number(raw[0]?.todayProduction || 0),
        todayConsumption: Number(raw[0]?.todayConsumption || 0),
        gridExport:       Number(raw[0]?.gridExport || 0),
        gridImport:       Number(raw[0]?.gridImport || 0),
        batteryCharging:  0,
        batteryDischarging: 0,
        batteryCapacity: 0,
      }];
    }

    // Battery SOC query - use Prisma ORM to avoid raw SQL GROUP BY issues
    const batteryAgg = await prisma.telemetryAggregate.findFirst({
      where: {
        standardKey: 'b_soc',
        period: 'hourly',
        ...(siteId && { device: { siteId } }),
      },
      orderBy: { periodStart: 'desc' },
    });
    const batterySoc = batteryAgg ? Number(batteryAgg.avgValue || 0) : 0;

    const data = summary[0] || {};
    return reply.code(200).send({
      success: true,
      data: {
        todayProduction:  Number(data.todayProduction || 0).toFixed(1),
        todayConsumption: Number(data.todayConsumption || 0).toFixed(1),
        gridExport:       Number(data.gridExport || 0).toFixed(1),
        gridImport:       Number(data.gridImport || 0).toFixed(1),
        batterySoc:       batterySoc.toFixed(1),
        batteryCharging:  Number(data.batteryCharging || 0).toFixed(1),
        batteryDischarging: Number(data.batteryDischarging || 0).toFixed(1),
        batteryCapacity: Number(data.batteryCapacity || 0).toFixed(1),
      },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getSummary error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/device/:id ───────────────────────────────────────────────────
exports.getDeviceTelemetry = async (request, reply) => {
  try {
    const mappings = await prisma.telemetryMapping.findMany({
      where: { deviceId: request.params.id },
    });
    return reply.code(200).send({ success: true, data: mappings, errors: null });
  } catch (error) {
    request.log.error({ err: error }, 'getDeviceTelemetry error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/daily-summary ───────────────────────────────────────────────
// Ringkasan harian produksi/konsumsi + KPI turunan:
//   capacityFactor (%)  = totalProduction_kWh / (capacity_kWp × 24) × 100
//   performanceRatio (%) = totalProduction_kWh / (capacity_kWp × PSH) × 100,
//     PSH (peak sun hours, kWh/m²/hari) = Σ i_ghi(W/m²) × Δt(jam) / 1000 per device.
//     PR hanya bermakna bila ada iradiasi (PSH > 0.05) → selain itu null.
exports.getDailySummary = async (request, reply) => {
  try {
    const { siteId, startDate, endDate } = request.query ?? {};

    // Prisma.sql for dynamic SQL fragments; primitive values injected directly.
    const siteClause = siteId
      ? Prisma.sql`AND d.site_id = ${siteId}::uuid`
      : Prisma.sql``;
    const siteFilterSite = siteId
      ? Prisma.sql`AND s.id = ${siteId}::uuid`
      : Prisma.sql``;

    // Jalur 1: agregat harian dari tbl_daily_summary (diisi aggregator worker,
    // per-site). Tanpa siteId: gabungkan semua site per tanggal.
    const siteClauseSummary = siteId
      ? Prisma.sql`AND ds.site_id = ${siteId}::uuid`
      : Prisma.sql``;

    const summaries = await prisma.$queryRaw`
      SELECT
        ds.date AS "date",
        SUM(ds.total_production::float) / 1000.0 AS "totalProduction",
        SUM(ds.total_consumption::float) / 1000.0 AS "totalConsumption",
        SUM(ds.total_export::float) / 1000.0 AS "totalExport",
        SUM(ds.total_import::float) / 1000.0 AS "totalImport",
        AVG(ds.avg_power::float) AS "avgPower",
        MAX(ds.peak_power::float) AS "peakPower"
      FROM tbl_daily_summary ds
      WHERE 1=1
        ${siteClauseSummary}
      GROUP BY ds.date
      ORDER BY ds.date DESC
      LIMIT 30
    `;

    let rows = summaries;

    if (summaries.length === 0) {
      // Jalur 2 (fallback): agregasi dari data mentah tbl_telemetry_data.
      // Energi harian device diambil dari counter e_daily/e_daily_load/e_daily_export
      // (nilai MAX per device per hari = energi kumulatif hari itu, dalam Wh).
      // Daya rata-rata/puncak dari sampel p_active (W).
      const fallback = await prisma.$queryRaw`
        WITH daily_dev AS (
          SELECT
            DATE(td.timestamp)::date AS "date",
            td.device_id AS "device_id",
            td.standard_key AS "standard_key",
            MAX(td.value::float) AS "max_value"
          FROM tbl_telemetry_data td
          JOIN tbl_devices d ON d.id = td.device_id
          WHERE td.standard_key IN ('e_daily', 'e_daily_load', 'e_daily_export', 'e_daily_import')
            AND td.value ~ '^[0-9]+([.][0-9]+)?$'
            ${siteClause}
          GROUP BY DATE(td.timestamp)::date, td.device_id, td.standard_key
        ),
        power_stats AS (
          SELECT
            DATE(td.timestamp)::date AS "date",
            AVG(td.value::float) AS "avg_power",
            MAX(td.value::float) AS "peak_power"
          FROM tbl_telemetry_data td
          JOIN tbl_devices d ON d.id = td.device_id
          WHERE td.standard_key IN ('p_active', 'p_dc', 'p_ac')
            AND td.value ~ '^[0-9]+([.][0-9]+)?$'
            ${siteClause}
          GROUP BY DATE(td.timestamp)::date
        )
        SELECT
          e."date" AS "date",
          COALESCE(SUM(CASE WHEN e.standard_key = 'e_daily' THEN e.max_value END), 0) / 1000.0 AS "totalProduction",
          COALESCE(SUM(CASE WHEN e.standard_key = 'e_daily_load' THEN e.max_value END), 0) / 1000.0 AS "totalConsumption",
          COALESCE(SUM(CASE WHEN e.standard_key = 'e_daily_export' THEN e.max_value END), 0) / 1000.0 AS "totalExport",
          COALESCE(SUM(CASE WHEN e.standard_key = 'e_daily_import' THEN e.max_value END), 0) / 1000.0 AS "totalImport",
          p.avg_power AS "avgPower",
          p.peak_power AS "peakPower"
        FROM daily_dev e
        LEFT JOIN power_stats p ON p.date = e.date
        GROUP BY e.date, p.avg_power, p.peak_power
        ORDER BY e.date DESC
        LIMIT 30
      `;
      rows = fallback;
    }

    // ── KPI turunan: capacity & PSH (iradiasi) per tanggal ──────────────────
    // Kapasitas terpasang (konstan per filter) — query terpisah agar selalu
    // terisi walau i_ghi belum tersedia.
    const capRows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(s.capacity_kwp), 0) AS "capacity_kwp"
      FROM tbl_sites s
      WHERE 1=1 ${siteFilterSite}
    `;
    const capacityKwp = Number(capRows[0]?.capacity_kwp) || 0;

    // PSH = Σ i_ghi(W/m²) × Δt(jam) / 1000 per device per hari (Δt publish = 180s)
    const pshRows = await prisma.$queryRaw`
      WITH psh_dev AS (
        SELECT
          DATE(td.timestamp)::date AS "date",
          td.device_id AS "device_id",
          SUM(td.value::float) * (180.0 / 3600.0) / 1000.0 AS "psh"
        FROM tbl_telemetry_data td
        JOIN tbl_devices d ON d.id = td.device_id
        WHERE td.standard_key = 'i_ghi'
          AND td.value ~ '^[0-9]+([.][0-9]+)?$'
          ${siteClause}
        GROUP BY DATE(td.timestamp)::date, td.device_id
      )
      SELECT
        p."date" AS "date",
        AVG(p.psh) AS "psh"
      FROM psh_dev p
      GROUP BY p."date"
    `;
    const pshByDate = {};
    for (const m of pshRows) {
      pshByDate[new Date(m.date).toISOString().slice(0, 10)] = Number(m.psh) || 0;
    }

    const data = rows.map((r) => {
      const dateStr = new Date(r.date).toISOString().slice(0, 10);
      const psh = pshByDate[dateStr] ?? 0;
      const prodKwh = Number(r.totalProduction) || 0;
      const cap = capacityKwp;
      return {
        ...r,
        totalProduction: Math.round(prodKwh * 10) / 10,
        totalConsumption: Math.round((Number(r.totalConsumption) || 0) * 10) / 10,
        capacityKwp: cap,
        psh: Math.round(psh * 100) / 100,
        // Capacity Factor harian: energi / (kapasitas × 24 jam)
        capacityFactor: cap > 0 ? Math.round((prodKwh / (cap * 24)) * 1000) / 10 : null,
        // Performance Ratio: energi / (kapasitas × jam puncak matahari)
        performanceRatio: cap > 0 && psh > 0.05 ? Math.round((prodKwh / (cap * psh)) * 1000) / 10 : null,
      };
    });

    return reply.code(200).send({
      success: true,
      data,
      meta: { isFallback: summaries.length === 0, capacityKwp },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getDailySummary error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/aggregates/latest ─────────────────────────────────────────────
// Returns the latest aggregate values for all devices (latest hourly period)
exports.getLatestAggregates = async (request, reply) => {
  try {
    const { siteId, period = 'hourly' } = request.query ?? {};

    const where = { period };
    if (siteId) where.device = { siteId };

    // Cari bucket periodStart terbaru dulu, lalu ambil hanya baris pada bucket
    // tersebut. Query lama mengambil SEMUA baris untuk period (ratusan ribu)
    // lalu dedupe di JS — ini OOM/lambat dan mematikan backend.
    const latestBucket = await prisma.telemetryAggregate.findFirst({
      where,
      orderBy: { periodStart: 'desc' },
      select: { periodStart: true },
    });

    if (!latestBucket) {
      return reply.code(200).send({
        success: true,
        data: {},
        meta: { period, count: 0 },
        errors: null,
      });
    }

    const latestAggregates = await prisma.telemetryAggregate.findMany({
      where: {
        ...where,
        // periodStart tersimpan presisi mikrodetik (.006222) yang tidak bisa
        // direpresentasikan Date JS (milis). Cocokkan dengan toleransi ±2 detik
        // (bucket hourly/daily berjarak jauh, tidak akan tumpang tindih).
        periodStart: {
          gte: new Date(latestBucket.periodStart.getTime() - 2000),
          lte: new Date(latestBucket.periodStart.getTime() + 2000),
        },
      },
      orderBy: [{ deviceId: 'asc' }, { periodStart: 'desc' }],
    });

    // Deduplicate by device, keep only latest
    const seen = new Set();
    const uniqueLatest = latestAggregates.filter(row => {
      if (seen.has(row.deviceId)) return false;
      seen.add(row.deviceId);
      return true;
    });

    // Group by standardKey for easy access
    const grouped = {};
    for (const row of uniqueLatest) {
      const key = row.standardKey;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        deviceId: row.deviceId,
        value: Number(row.avgValue),
        timestamp: row.periodStart.toISOString(),
      });
    }

    return reply.code(200).send({
      success: true,
      data: grouped,
      meta: { period, count: uniqueLatest.length },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getLatestAggregates error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/aggregates/latest/:deviceId ───────────────────────────────────
// Returns the latest aggregate values for a specific device
exports.getLatestAggregatesByDevice = async (request, reply) => {
  try {
    const { deviceId } = request.params;
    const { period = 'hourly' } = request.query ?? {};

    // Get the latest aggregate record for this device
    const latest = await prisma.telemetryAggregate.findFirst({
      where: { deviceId, period },
      orderBy: { periodStart: 'desc' },
      include: { device: { select: { id: true, serialNumber: true, modelName: true } } },
    });

    if (!latest) {
      return reply.code(404).send({
        success: false,
        message: `No aggregate data found for device ${deviceId}`,
      });
    }

    return reply.code(200).send({
      success: true,
      data: {
        deviceId: latest.deviceId,
        device: latest.device,
        standardKey: latest.standardKey,
        value: Number(latest.avgValue),
        timestamp: latest.periodStart.toISOString(),
        min: Number(latest.minValue),
        max: Number(latest.maxValue),
        sum: Number(latest.sumValue),
        count: Number(latest.count),
      },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: request.params.deviceId }, 'getLatestAggregatesByDevice error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/aggregates ───────────────────────────────────────────────────
// Returns tabular aggregates + chart-ready series data
exports.getTelemetryAggregates = async (request, reply) => {
  try {
    const {
      deviceId, standardKey, period = 'hourly',
      startDate, endDate, limit = 200, chartMode,
    } = request.query ?? {};

    // Build where clause
    const where = {};
    if (deviceId)    where.deviceId    = deviceId;
    if (standardKey) where.standardKey = standardKey;
    if (period)      where.period      = period;

    // Default: last 24h untuk hourly, last 7 hari untuk daily
    const defaultStart = period === 'daily'
      ? new Date(Date.now() - 7 * 86_400_000)
      : new Date(Date.now() - 24 * 3_600_000);

    where.periodStart = { gte: startDate ? new Date(startDate) : defaultStart };
    if (endDate) where.periodEnd = { lte: new Date(endDate) };

    const aggregates = await prisma.telemetryAggregate.findMany({
      where,
      include: {
        device: { select: { id: true, serialNumber: true, modelName: true } },
      },
      orderBy: [{ periodStart: 'asc' }],
      take: parseInt(limit, 10),
    });

    // ── Chart-ready format ──
    // Group by standardKey → each key becomes one dataset
    // Labels = unique periodStart timestamps
    const chartSeries = {};
    const labelSet    = new Set();

    for (const a of aggregates) {
      const key = a.standardKey;
      const ts  = a.periodStart.toISOString();
      labelSet.add(ts);

      if (!chartSeries[key]) {
        chartSeries[key] = { key, data: {} };
      }
      // If multiple devices: sum the avgValues per timestamp
      chartSeries[key].data[ts] = (chartSeries[key].data[ts] ?? 0) + (a.avgValue ?? 0);
    }

    const labels  = Array.from(labelSet).sort();
    const series  = Object.values(chartSeries).map(s => ({
      key:    s.key,
      values: labels.map(l => s.data[l] ?? null),
    }));

    return reply.code(200).send({
      success: true,
      data:    aggregates,
      chart: {
        labels,
        series,
      },
      meta: {
        total:  aggregates.length,
        period,
        from:   where.periodStart.gte,
        to:     endDate ?? null,
      },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getTelemetryAggregates error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/data ─────────────────────────────────────────────────────────
// Mengambil data dari InfluxDB untuk recent telemetry
exports.getTelemetryData = async (request, reply) => {
  try {
    const { deviceId, standardKey, startDate, endDate, limit } = request.query ?? {};

    const dataPoints = await telemetryQuery.getRecentTelemetry({
      deviceId,
      standardKey,
      startDate,
      endDate,
      limit
    });

    return reply.code(200).send({
      success: true,
      data: dataPoints,
      meta: { total: dataPoints.length },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getTelemetryData error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── Helper: Resolve device identifier to UUID ──────────────────
async function resolveDeviceId(identifier) {
  if (!identifier) return null;
  
  // Check if already UUID format
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUuid) return identifier;
  
  // Try serialNumber
  const bySerial = await prisma.device.findFirst({
    where: { serialNumber: identifier },
    select: { id: true }
  });
  if (bySerial) return bySerial.id;
  
  // Try modelName (device name)
  const byName = await prisma.device.findFirst({
    where: { modelName: identifier },
    select: { id: true }
  });
  if (byName) return byName.id;
  
  return null;
}

// ─── GET /telemetry/realtime/:deviceId ─────────────────────────────────────────────
// Returns latest real-time values from InfluxDB for a specific device
// Accepts: UUID, serialNumber (SN-XXXXX), or modelName
exports.getRealtimeTelemetry = async (request, reply) => {
  try {
    const { deviceId: identifier } = request.params;
    const { range = '1h' } = request.query ?? {};
    
    // Resolve to UUID
    const deviceId = await resolveDeviceId(identifier);
    if (!deviceId) {
      return reply.code(404).send({
        success: false,
        message: `Device not found: ${identifier}`,
        hint: 'Use UUID, serialNumber (SN-XXXXX), or modelName'
      });
    }

    // Get latest battery data
    const queryBattery = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "battery")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const batteryResult = await telemetryQuery.queryApi.collectRows(queryBattery);
    const latestBattery = telemetryQuery.formatResult(batteryResult);

    // Get latest voltage data
    const queryVoltage = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "voltage")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const voltageResult = await telemetryQuery.queryApi.collectRows(queryVoltage);
    const latestVoltage = telemetryQuery.formatResult(voltageResult);

    // Get latest current data
    const queryCurrent = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "current")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const currentResult = await telemetryQuery.queryApi.collectRows(queryCurrent);
    const latestCurrent = telemetryQuery.formatResult(currentResult);

    // Get latest status data
    const status = await telemetryQuery.getDeviceStatus(deviceId);

    // Get latest energy data
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const latestEnergy = await telemetryQuery.getEnergyData(deviceId, start.toISOString(), now.toISOString());

    // Get latest temperature data
    const queryTemp = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "temperature")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const tempResult = await telemetryQuery.queryApi.collectRows(queryTemp);
    const latestTemp = telemetryQuery.formatResult(tempResult);

    // Get latest frequency data
    const queryFreq = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "frequency")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const freqResult = await telemetryQuery.queryApi.collectRows(queryFreq);
    const latestFreq = telemetryQuery.formatResult(freqResult);

    // Get latest irradiance data
    const queryIrrad = `
      from(bucket: "${telemetryQuery.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "irradiance")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> last()
    `;
    const irradResult = await telemetryQuery.queryApi.collectRows(queryIrrad);
    const latestIrrad = telemetryQuery.formatResult(irradResult);

    return reply.code(200).send({
      success: true,
      data: {
        power: latestPower,
        battery: latestBattery,
        voltage: latestVoltage,
        current: latestCurrent,
        status,
        energy: latestEnergy,
        temperature: latestTemp,
        frequency: latestFreq,
        irradiance: latestIrrad,
      },
      meta: { deviceId, range, timestamp: new Date().toISOString() },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: request.params.deviceId }, 'getRealtimeTelemetry error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/realtime/summary ───────────────────────────────────────────────
// Returns real-time summary for all devices in a site (for dashboard stat cards)
exports.getRealtimeSummary = async (request, reply) => {
  try {
    const { siteId, range = '1h' } = request.query ?? {};

    // Get all devices for the site, including site name
    const where = {};
    if (siteId) where.siteId = siteId;

    const devices = await prisma.device.findMany({
      where,
      select: {
        id: true,
        serialNumber: true,
        modelName: true,
        status: true,
        site: { select: { name: true } },
      },
    });

    if (devices.length === 0) {
      return reply.code(200).send({
        success: true,
        data: { totalProduction: 0, totalConsumption: 0, gridExport: 0, gridImport: 0, batterySoc: 0, devices: [] },
        errors: null,
      });
    }

    // Load lookup error codes sekali (hindari N+1 query per device)
    const errorCodes = await prisma.errorCode.findMany({ where: { isActive: true } });
    const errorCodeMap = new Map(errorCodes.map(c => [c.code, c]));

    // For each device, fetch telemetry from all relevant InfluxDB measurements
    // Use serialNumber (from PostgreSQL) to match InfluxDB serial tag
    const deviceData = await Promise.all(devices.map(async (device) => {
      const [power, voltage, current, temperature, frequency, battery, energy, others, status] = await Promise.all([
        telemetryQuery.getLatestPower(device.serialNumber, device.id),
        telemetryQuery.getLatestVoltage(device.serialNumber, device.id),
        telemetryQuery.getLatestCurrent(device.serialNumber, device.id),
        telemetryQuery.getLatestTemperature(device.serialNumber, device.id),
        telemetryQuery.getLatestFrequency(device.serialNumber, device.id),
        telemetryQuery.getLatestBattery(device.serialNumber, device.id),
        telemetryQuery.getEnergyData(device.serialNumber, device.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), new Date().toISOString()),
        telemetryQuery.getLatestOthers(device.serialNumber, device.id),
        telemetryQuery.getDeviceStatus(device.serialNumber, device.id),
      ]);

      const siteName = device.site?.name || null;
      const { site, ...deviceWithoutSite } = device;

      // Sumber error code berurut: s_alarm (InfluxDB) → fallback DEVICE OFFLINE
      const alarmCode = status.s_alarm && status.s_alarm !== 'NONE' ? status.s_alarm : null;
      const errorCode = alarmCode || (device.status === 'OFFLINE' ? 'E-001' : null);
      const lookup = errorCode ? errorCodeMap.get(errorCode) : null;

      // Pengaman tampilan: device OFFLINE TIDAK boleh menampilkan telemetry
      // (data lama mungkin masih ada di InfluxDB sebelum retensi berakhir).
      // Paksa realtime kosong agar UI konsisten dengan status.
      const realtime = device.status === 'OFFLINE'
        ? {
            power: {}, voltage: {}, current: {}, temperature: {}, frequency: {},
            battery: {}, energy: {}, efficiency: null, cosPhi: null,
          }
        : {
            power: {
              p_ac: power.p_active,
              p_dc: power.p_dc || power.p_pv1 || power.p_pv2 || power.p_pv3 || power.p_pv4,
            },
            voltage: { v_ac: voltage.v_ac, v_dc: voltage.v_dc },
            // InfluxDB memakai field `c_ac`/`c_dc` (bukan `i_ac`/`i_dc`)
            current: { i_ac: current.c_ac, i_dc: current.c_dc },
            // InfluxDB memakai field `t_env`/`t_inverter` (bukan `t_inv`)
            temperature: { t_inv: temperature.t_inverter, t_env: temperature.t_env },
            // InfluxDB memakai field `f_grid` (bukan `f_ac`)
            frequency: { f_ac: frequency.f_grid },
            battery: { b_soc: battery.b_soc, b_charge: battery.b_charge, b_discharge: battery.b_discharge },
            energy: { e_daily: energy.e_daily, e_total: energy.e_total },
            // Efficiency & cos_phi datang dari measurement `others`
            efficiency: others.efficiency,
            cosPhi: others.cos_phi,
          };

      return {
        ...deviceWithoutSite,
        siteName,
        // Konvensi dari alarm.controller.js: device OFFLINE disintesiskan
        // sebagai errorCode DEVICE_OFFLINE (tbl_devices tidak punya kolom error_code).
        errorCode,
        errorLabel: lookup ? lookup.descriptionId : null,
        errorSeverity: lookup ? lookup.severity : null,
        realtime,
      };
    }));

    // Aggregate totals
    let totalProduction = 0;
    let totalConsumption = 0;
    let totalExport = 0;
    let totalImport = 0;
    let totalBatterySoc = 0;
    let onlineCount = 0;

    for (const d of deviceData) {
      const p_ac = d.realtime?.power?.p_ac || 0;
      totalProduction += Number(p_ac);
      totalConsumption += Number(d.realtime?.power?.p_load || 0);
      totalExport += Number(d.realtime?.power?.p_export || 0);
      totalImport += Number(d.realtime?.power?.p_import || 0);
      if (d.realtime?.battery?.b_soc !== undefined && d.realtime?.battery?.b_soc !== null)
        totalBatterySoc += Number(d.realtime.battery.b_soc);
      if (d.status === 'ONLINE') onlineCount++;
    }

    const avgBatterySoc = deviceData.length > 0 ? totalBatterySoc / deviceData.length : 0;

    return reply.code(200).send({
      success: true,
      data: {
        totalProduction: totalProduction.toFixed(1),
        totalConsumption: totalConsumption.toFixed(1),
        gridExport: totalExport.toFixed(1),
        gridImport: totalImport.toFixed(1),
        batterySoc: avgBatterySoc.toFixed(1),
        onlineDevices: onlineCount,
        totalDevices: devices.length,
        devices: deviceData,
      },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getRealtimeSummary error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/realtime/timeseries/:deviceId ──────────────────────────────────
// Returns time series data for charting
exports.getRealtimeTimeSeries = async (request, reply) => {
  try {
    const { deviceId } = request.params;
    const { field = 'p_active', range = '1h', interval = '5m' } = request.query ?? {};

    const data = await telemetryQuery.getTimeSeries(deviceId, field, `-${range}`, '-0s', interval);

    return reply.code(200).send({
      success: true,
      data: data,
      meta: { deviceId, field, range, interval },
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error, deviceId: request.params.deviceId }, 'getRealtimeTimeSeries error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /telemetry/error-codes ────────────────────────────────────────────────────
// Mengembalikan daftar lookup kode error standar (tbl_error_codes) untuk frontend.
exports.getErrorCodes = async (request, reply) => {
  try {
    const { category, severity } = request.query ?? {};
    const where = { isActive: true };
    if (category) where.category = category;
    if (severity) where.severity = severity;

    const codes = await prisma.errorCode.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return reply.code(200).send({
      success: true,
      data: codes,
      errors: null,
    });
  } catch (error) {
    request.log.error({ err: error }, 'getErrorCodes error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};
