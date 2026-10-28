/**
 * Seed tbl_telemetry_aggregates — data konsumsi per JAM deterministik untuk
 * Agustus 2026 (1 tenant).
 *
 * Kenapa dibutuhkan: skenario PEAK_OFF_PEAK harus tahu energi yang jatuh pada
 * jam WBP (17:00-22:00) vs LWBP (selainnya). tbl_daily_summary hanya harian,
 * jadi kita perlukan granularity per jam.
 *
 * Deterministik & konsisten: konsumsi harian tiap site diambil dari
 * tbl_daily_summary (sudah di-seed), lalu dipecah ke device-nya dan disebar
 * ke 24 jam memakai profil beban tetap (normalized, sum=1). Hasilnya, total
 * konsumsi per jam per site == total konsumsi harian di daily summary.
 *
 * Unit: Wh (konsisten dengan daily summary).
 * Usage: node src/seeders/seed-august-2026-hourly.js [tenant_id]
 */
'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_YEAR = 2026;
const TARGET_MONTH = 8; // Agustus (0-indexed di JS: 7)

// Profil beban harian per jam (fraction, dinormalisasi jadi sum=1).
// Puncak malam 17:00-22:00 (WBP), landai dini hari, naik siang.
const LOAD_PROFILE = [
  /* 0 */ 0.020, /* 1 */ 0.015, /* 2 */ 0.015, /* 3 */ 0.015, /* 4 */ 0.015, /* 5 */ 0.020,
  /* 6 */ 0.030, /* 7 */ 0.040, /* 8 */ 0.050, /* 9 */ 0.055, /* 10 */ 0.055, /* 11 */ 0.055,
  /* 12 */ 0.050, /* 13 */ 0.050, /* 14 */ 0.050, /* 15 */ 0.050, /* 16 */ 0.055,
  /* 17 */ 0.060, /* 18 */ 0.065, /* 19 */ 0.070, /* 20 */ 0.065, /* 21 */ 0.055,
  /* 22 */ 0.040, /* 23 */ 0.030,
];
const PROFILE_SUM = LOAD_PROFILE.reduce((a, b) => a + b, 0);
const NORMALIZED = LOAD_PROFILE.map((v) => v / PROFILE_SUM);

// Bobot pembagian konsumsi antar device dalam satu site (deterministik, sum=1).
const DEVICE_WEIGHTS = [0.40, 0.35, 0.25];

const TZ_OFFSET_HOURS = 7; // Asia/Jakarta

async function seed() {
  const tenantId = process.argv[2];
  console.log('🌱 Seeding hourly consumption — Agustus 2026 (deterministik)...\n');

  const sites = await prisma.site.findMany({
    where: tenantId ? { tenantId } : {},
    include: { devices: { orderBy: { serialNumber: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  if (sites.length === 0) {
    console.error('❌ Tidak ada site ditemukan.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Ambil daily summary Agustus untuk site-site target.
  const dailyRows = await prisma.dailySummary.findMany({
    where: {
      siteId: { in: sites.map((s) => s.id) },
      date: { gte: new Date(`${TARGET_YEAR}-08-01T00:00:00Z`), lt: new Date(`${TARGET_YEAR}-09-01T00:00:00Z`) },
    },
  });
  const dailyBySiteDate = {};
  for (const r of dailyRows) {
    const key = `${r.siteId}|${r.date.toISOString().slice(0, 10)}`;
    dailyBySiteDate[key] = Number(r.totalConsumption);
  }

  // Bersihkan hourly Agustus untuk device target (idempotent).
  const deviceIds = sites.flatMap((s) => s.devices.map((d) => d.id));
  const deleted = await prisma.telemetryAggregate.deleteMany({
    where: {
      deviceId: { in: deviceIds },
      standardKey: 'p_load',
      period: 'hourly',
      periodStart: {
        gte: new Date(`${TARGET_YEAR}-08-01T00:00:00Z`),
        lt: new Date(`${TARGET_YEAR}-09-01T00:00:00Z`),
      },
    },
  });
  if (deleted.count > 0) console.log(`🗑️  Hapus ${deleted.count} baris hourly lama.\n`);

  let inserted = 0;
  const nDays = new Date(TARGET_YEAR, TARGET_MONTH, 0).getDate();
  const rows = [];

  for (const site of sites) {
    const devices = site.devices;
    if (devices.length === 0) continue;

    for (let d = 1; d <= nDays; d++) {
      const dateStr = `${TARGET_YEAR}-08-${String(d).padStart(2, '0')}`;
      const siteDailyWh = dailyBySiteDate[`${site.id}|${dateStr}`] || 0;

      for (let di = 0; di < devices.length; di++) {
        const device = devices[di];
        const deviceDailyWh = siteDailyWh * DEVICE_WEIGHTS[di % DEVICE_WEIGHTS.length];

        for (let h = 0; h < 24; h++) {
          const hourWh = Math.round(deviceDailyWh * NORMALIZED[h]);
          // periodStart dalam UTC: jam lokal Jakarta (h) = UTC (h - 7).
          const utcHour = (h - TZ_OFFSET_HOURS + 24) % 24;
          const periodStart = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH - 1, d, utcHour, 0, 0));
          const periodEnd = new Date(periodStart.getTime() + 3600_000);

          rows.push({
            deviceId: device.id,
            standardKey: 'p_load',
            period: 'hourly',
            minValue: String(hourWh),
            maxValue: String(hourWh),
            avgValue: String(hourWh),
            sumValue: String(hourWh),
            count: 1,
            periodStart,
            periodEnd,
          });
        }
      }
    }
    console.log(`  ✅ ${site.name}: ${nDays} hari × ${devices.length} device × 24 jam`);
  }

  // Batch insert agar cepat (hindari round-trip per baris).
  const BATCH = 2000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.telemetryAggregate.createMany({ data: rows.slice(i, i + BATCH) });
  }
  inserted = rows.length;

  console.log(`\n✅ Selesai. Total baris hourly di-insert: ${inserted}`);
  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error('❌ Seeding gagal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
