/**
 * Seed tbl_daily_summary — data sintetis DETERMINISTIK untuk Agustus 2026.
 *
 * Tujuan: menyediakan data pemakaian satu bulan penuh untuk 1 tenant,
 * agar alur generate invoice dapat diuji end-to-end.
 *
 * Deterministik: TIDAK memakai Math.random(). Semua nilai dihitung dari
 * formula trigonometri (sin) berbasis indeks hari & site, sehingga hasil
 * identik setiap kali dijalankan.
 *
 * Unit: Wh (watt-hour), konsisten dengan konvensi controller telemetry
 * yang membagi /1000 untuk mendapatkan kWh.
 *
 * Usage: node src/seeders/seed-august-2026-daily-summary.js [tenant_id]
 */
'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_YEAR = 2026;
const TARGET_MONTH = 8; // Agustus (0-indexed di JS: 7)

// ── Helper deterministik: sin mapping ───────────────────────────────────────────
// Mengembalikan nilai dalam [-1, 1] berdasarkan kombinasi indeks.
function wave(day, siteIndex, seed, period = 0.45) {
  return Math.sin((day + siteIndex * seed) * period);
}

// ── Generator nilai harian deterministik per site ───────────────────────────────
function computeDay(dayOfMonth, siteIndex) {
  const capacityKw = 100; // capacity_kwp tiap site (dari tbl_sites)

  // Peak sun hours: ~5.8 - 8.2, bervariasi deterministik per hari & site.
  const psh = 7.0 + 1.2 * wave(dayOfMonth, siteIndex, 2, 0.45);

  const productionWh = Math.round(capacityKw * psh * 1000);

  // Konsumsi: 55-75% dari produksi + variasi kecil.
  const consRatio = 0.65 + 0.08 * wave(dayOfMonth, siteIndex, 1, 0.6);
  const consumptionWh = Math.round(productionWh * consRatio);

  // Ekspor: 45-65% produksi (surplus dikirim ke grid).
  const exportRatio = 0.55 + 0.08 * wave(dayOfMonth, siteIndex, 3, 0.7);
  const exportWh = Math.round(productionWh * exportRatio);

  // Import: kecil (0-5% konsumsi) — deterministik.
  const importWh = Math.round(
    consumptionWh * (0.02 + 0.02 * (wave(dayOfMonth, siteIndex, 5, 0.9) + 1))
  );

  // Storage: 0 (tidak ada baterai dalam skenario ini).
  const storageWh = 0;

  // Daya puncak & rata-rata (W).
  const peakPowerW = Math.round(
    capacityKw * 1000 * (0.82 + 0.10 * wave(dayOfMonth, siteIndex, 4, 0.35))
  );
  const avgPowerW = Math.round(productionWh / 24);

  return {
    totalProduction: String(productionWh),
    totalConsumption: String(consumptionWh),
    totalExport: String(exportWh),
    totalImport: String(importWh),
    totalStorage: String(storageWh),
    peakPower: String(peakPowerW),
    avgPower: String(avgPowerW),
  };
}

function daysInMonth(year, month /* 0-indexed */) {
  return new Date(year, month + 1, 0).getDate();
}

async function seed() {
  const tenantId = process.argv[2];
  console.log('🌱 Seeding tbl_daily_summary — Agustus 2026 (deterministik)...\n');

  const sites = await prisma.site.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { name: 'asc' },
  });

  if (sites.length === 0) {
    console.error('❌ Tidak ada site ditemukan. Berikan tenant_id yang valid.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Tenant filter: ${tenantId || '(semua)'}`);
  console.log(`Site yang diproses: ${sites.length}`);

  const nDays = daysInMonth(TARGET_YEAR, TARGET_MONTH - 1);
  console.log(`Rentang: 2026-08-01 s/d 2026-08-${nDays} (${nDays} hari)\n`);

  // Bersihkan data Agustus 2026 untuk site-site target agar idempotent.
  const siteIds = sites.map((s) => s.id);
  const deleted = await prisma.dailySummary.deleteMany({
    where: {
      siteId: { in: siteIds },
      date: {
        gte: new Date(`${TARGET_YEAR}-08-01T00:00:00Z`),
        lt: new Date(`${TARGET_YEAR}-09-01T00:00:00Z`),
      },
    },
  });
  if (deleted.count > 0) {
    console.log(`🗑️  Hapus ${deleted.count} baris Agustus 2026 lama.\n`);
  }

  let inserted = 0;
  for (let sIdx = 0; sIdx < sites.length; sIdx++) {
    const site = sites[sIdx];
    for (let d = 1; d <= nDays; d++) {
      const date = new Date(Date.UTC(TARGET_YEAR, TARGET_MONTH - 1, d));
      const values = computeDay(d, sIdx);
      await prisma.dailySummary.create({
        data: {
          siteId: site.id,
          date,
          ...values,
        },
      });
      inserted++;
    }
    console.log(`  ✅ ${site.name}: ${nDays} hari`);
  }

  console.log(`\n✅ Selesai. Total baris di-insert: ${inserted}`);
  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error('❌ Seeding gagal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
