'use strict';
const crypto = require('crypto');
const prisma = require('../../config/database');
const { Prisma } = require('@prisma/client');

exports.getInvoices = async (request, reply) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { tenant: { select: { id: true, name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.code(200).send({ success: true, data: invoices, meta: { total: invoices.length } });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.getInvoiceById = async (request, reply) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      include: { tenant: true, items: true },
    });
    if (!invoice) return reply.code(404).send({ success: false, message: 'Invoice tidak ditemukan.' });
    return reply.code(200).send({ success: true, data: invoice });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.createInvoice = async (request, reply) => {
  try {
    const invoice = await prisma.invoice.create({ data: request.body });
    return reply.code(201).send({ success: true, data: invoice });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.updateInvoice = async (request, reply) => {
  try {
    const invoice = await prisma.invoice.update({ where: { id: request.params.id }, data: request.body });
    return reply.code(200).send({ success: true, data: invoice });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

exports.deleteInvoice = async (request, reply) => {
  try {
    await prisma.invoice.delete({ where: { id: request.params.id } });
    return reply.code(200).send({ success: true, message: 'Invoice berhasil dihapus.' });
  } catch (error) {
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Konversi UTC Date ke jam lokal (0-23) menurut timezone IANA.
 * Memakai Intl.DateTimeFormat agar akurat (termasuk DST, walau Jakarta no-DST).
 */
function localHour(utcDate, timeZone = 'Asia/Jakarta') {
  return Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone }).format(utcDate)
  );
}

/**
 * Konversi UTC Date ke tanggal lokal (string YYYY-MM-DD) menurut timezone IANA.
 */
function localDateStr(utcDate, timeZone = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).formatToParts(utcDate);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Agregasi konsumsi per jam (tbl_telemetry_aggregates, p_load, hourly) untuk
 * site-site tenant, diklasifikasikan ke peak/off-peak memakai jendela WBP dari
 * rate. Filter bulan dilakukan pada TANGGAL LOKAL (bukan UTC) agar konsisten
 * dengan tbl_daily_summary yang memakai tanggal kalender lokal.
 * Mengembalikan { peakWh, offPeakWh }.
 */
async function computePeakOffPeak(siteIds, year, monthIdx, peakStartHour, peakEndHour) {
  const devices = await prisma.device.findMany({
    where: { siteId: { in: siteIds } },
    select: { id: true, site: { select: { id: true, timezone: true } } },
  });
  const deviceTz = {};
  for (const d of devices) deviceTz[d.id] = d.site?.timezone || 'Asia/Jakarta';

  // Rentang UTC lebar (buffer ±2 hari) untuk menampung semua jam lokal bulan ini.
  const startUtc = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));

  const aggregates = await prisma.telemetryAggregate.findMany({
    where: {
      deviceId: { in: Object.keys(deviceTz) },
      standardKey: 'p_load',
      period: 'hourly',
      periodStart: { gte: new Date(startUtc.getTime() - 2 * 86_400_000), lt: new Date(endUtc.getTime() + 2 * 86_400_000) },
    },
    select: { deviceId: true, periodStart: true, sumValue: true },
  });

  const monthPrefix = `${String(year).padStart(4, '0')}-${String(monthIdx + 1).padStart(2, '0')}`;

  let peakWh = 0;
  let offPeakWh = 0;
  for (const row of aggregates) {
    const tz = deviceTz[row.deviceId];
    if (!localDateStr(row.periodStart, tz).startsWith(monthPrefix)) continue;

    const h = localHour(row.periodStart, tz);
    const wh = Number(row.sumValue) || 0;
    if (h >= peakStartHour && h < peakEndHour) {
      peakWh += wh;
    } else {
      offPeakWh += wh;
    }
  }
  return { peakWh, offPeakWh };
}

/**
 * Agregasi konsumsi harian (tbl_daily_summary) untuk site-site tenant dalam
 * rentang tanggal. Mengembalikan totalWh.
 */
async function computeDailyConsumption(siteIds, start, end) {
  const rows = await prisma.dailySummary.findMany({
    where: { siteId: { in: siteIds }, date: { gte: start, lt: end } },
    select: { totalConsumption: true },
  });
  return rows.reduce((acc, r) => acc + (Number(r.totalConsumption) || 0), 0);
}

// ─── POST /invoices/generate ───────────────────────────────────────────────────

/**
 * Generate invoice bulanan untuk satu tenant berdasarkan rate.
 *
 * Body: { tenantId, month ('YYYY-MM'), rateId (opsional) }
 *  - rateId kosong -> pakai rate aktif pertama milik tenant (atau global).
 *  - FIXED         -> 1 item: total konsumsi (kWh) × fixedAmount.
 *  - PEAK_OFF_PEAK -> 2 item: energi peak × peakRate + off-peak × offPeakRate.
 *
 * Sumber energi:
 *  - FIXED         : tbl_daily_summary.total_consumption (Wh -> kWh).
 *  - PEAK_OFF_PEAK : tbl_telemetry_aggregates p_load hourly (Wh -> kWh),
 *                    diklasifikasikan per jam lokal memakai jendela WBP rate.
 */
exports.generateInvoice = async (request, reply) => {
  try {
    const { tenantId, month, rateId } = request.body ?? {};

    if (!tenantId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.code(400).send({
        success: false,
        message: 'tenantId dan month (format YYYY-MM) wajib diisi.',
      });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    if (monthIdx < 0 || monthIdx > 11) {
      return reply.code(400).send({ success: false, message: 'month tidak valid.' });
    }
    const start = new Date(Date.UTC(year, monthIdx, 1));
    const end = new Date(Date.UTC(year, monthIdx + 1, 1));

    // 1. Tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return reply.code(404).send({ success: false, message: 'Tenant tidak ditemukan.' });
    }

    // 2. Rate
    let rate = null;
    if (rateId) {
      rate = await prisma.rate.findUnique({ where: { id: rateId } });
    } else {
      rate = await prisma.rate.findFirst({
        where: {
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }],
        },
        orderBy: [{ tenantId: 'desc' }, { createdAt: 'desc' }],
      });
    }
    if (!rate) {
      return reply.code(404).send({ success: false, message: 'Rate tidak ditemukan untuk tenant ini.' });
    }

    // 3. Site-site tenant
    const sites = await prisma.site.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    if (sites.length === 0) {
      return reply.code(400).send({ success: false, message: 'Tenant tidak memiliki site.' });
    }
    const siteIds = sites.map((s) => s.id);

    // 4. Hitung energi & pecah item
    const currency = rate.currency || 'IDR';
    let items = [];
    let subtotal = 0;
    let peakStart = null;
    let peakEnd = null;

    if (rate.rateType === 'PEAK_OFF_PEAK') {
      peakStart = rate.peakStartHour ?? 17;
      peakEnd = rate.peakEndHour ?? 22;
      const { peakWh, offPeakWh } = await computePeakOffPeak(siteIds, year, monthIdx, peakStart, peakEnd);

      const peakKwh = peakWh / 1000;
      const offPeakKwh = offPeakWh / 1000;
      const peakAmount = new Prisma.Decimal(rate.peakRate).mul(peakKwh);
      const offPeakAmount = new Prisma.Decimal(rate.offPeakRate).mul(offPeakKwh);

      items = [
        {
          qty: String(Math.round(peakKwh * 100) / 100),
          unit: `kWh WBP (${peakStart}:00-${peakEnd}:00)`,
          rate: String(rate.peakRate),
        },
        {
          qty: String(Math.round(offPeakKwh * 100) / 100),
          unit: `kWh LWBP`,
          rate: String(rate.offPeakRate),
        },
      ];
      subtotal = peakAmount.plus(offPeakAmount);
    } else {
      const totalWh = await computeDailyConsumption(siteIds, start, end);
      const totalKwh = totalWh / 1000;
      const amount = new Prisma.Decimal(rate.fixedAmount).mul(totalKwh);
      items = [
        {
          qty: String(Math.round(totalKwh * 100) / 100),
          unit: 'kWh',
          rate: String(rate.fixedAmount),
        },
      ];
      subtotal = amount;
    }

    // 5. Buat invoice + items
    // Nomor invoice: INV-YYYYMM-TENANT-<8-char hash> agar unik walau
    // tenant+bulan sama. Hash dari (tenantId, month, timestamp) — stabil
    // per generate, tapi tak akan bentrok antar generate dalam milidetik yang
    // berbeda. Dipakai SHA-256, diambil 8 char pertama (uppercase).
    const numberHash = crypto
      .createHash('sha256')
      .update(`${tenantId}:${month}:${Date.now()}`)
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();

    const invoice = await prisma.invoice.create({
      data: {
        number: `INV-${year}${monthStr}-${tenant.name.replace(/\s+/g, '').toUpperCase()}-${numberHash}`,
        date: new Date(),
        dueDate: new Date(Date.now() + 14 * 86_400_000),
        currency,
        status: 'DRAFT',
        tenantId: tenant.id,
        tenantName: tenant.name,
        billingPeriod: month,
        peakStartHour: peakStart,
        peakEndHour: peakEnd,
        subtotal: subtotal.toFixed(2),
        totalTax: '0',
        total: subtotal.toFixed(2),
        discountTotal: '0',
        adjustment: '0',
        items: {
          create: items.map((it) => ({ ...it, rate: String(it.rate) })),
        },
      },
      include: { items: true, tenant: true },
    });

    return reply.code(201).send({ success: true, data: invoice });
  } catch (error) {
    request.log.error({ err: error }, 'generateInvoice error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};

// ─── GET /invoices/:id/usage ────────────────────────────────────────────────────

/**
 * Rincian pemakaian harian untuk invoice, diturunkan on-demand dari
 * tbl_daily_summary (konsumsi per site per hari) untuk billing_period invoice.
 *
 * Query:
 *  - groupBy=site (opsional): pecah per site, kalau tidak: agregat per tanggal.
 *
 * Untuk PEAK_OFF_PEAK, split WBP/LWBP per hari dihitung dari hourly p_load
 * memakai jendela yang di-snapshot di header invoice (peakStartHour/peakEndHour).
 * Untuk FIXED, hanya kolom konsumsi total.
 *
 * Response: { success, data: { period, groupBy, rows: [...] } }
 *   baris = { date, totalKwh, [peakKwh, offPeakKwh], [siteId, siteName] }
 */
exports.getInvoiceUsage = async (request, reply) => {
  try {
    const { id } = request.params;
    const { groupBy } = request.query ?? {};

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) {
      return reply.code(404).send({ success: false, message: 'Invoice tidak ditemukan.' });
    }

    const billingPeriod = invoice.billingPeriod;
    if (!billingPeriod || !/^\d{4}-\d{2}$/.test(billingPeriod)) {
      return reply.code(400).send({ success: false, message: 'Invoice tidak memiliki billing_period.' });
    }

    const [yearStr, monthStr] = billingPeriod.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, monthIdx, 1));
    const end = new Date(Date.UTC(year, monthIdx + 1, 1));

    const sites = await prisma.site.findMany({
      where: { tenantId: invoice.tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    if (sites.length === 0) {
      return reply.code(200).send({ success: true, data: { period: billingPeriod, groupBy: groupBy || 'date', rows: [] } });
    }
    const siteIds = sites.map((s) => s.id);

    // Konsumsi harian per site dari tbl_daily_summary.
    const dailyRows = await prisma.dailySummary.findMany({
      where: { siteId: { in: siteIds }, date: { gte: start, lt: end } },
      select: { siteId: true, date: true, totalConsumption: true },
    });

    const isPeakOffPeak = invoice.peakStartHour !== null && invoice.peakEndHour !== null;
    let peakBySiteDate = new Map();
    let offPeakBySiteDate = new Map();

    if (isPeakOffPeak) {
      const peakStart = invoice.peakStartHour;
      const peakEnd = invoice.peakEndHour;
      const devices = await prisma.device.findMany({
        where: { siteId: { in: siteIds } },
        select: { id: true, siteId: true, site: { select: { timezone: true } } },
      });
      const deviceSite = {};
      const deviceTz = {};
      for (const d of devices) {
        deviceSite[d.id] = d.siteId;
        deviceTz[d.id] = d.site?.timezone || 'Asia/Jakarta';
      }

      const aggregates = await prisma.telemetryAggregate.findMany({
        where: {
          deviceId: { in: Object.keys(deviceSite) },
          standardKey: 'p_load',
          period: 'hourly',
          periodStart: { gte: new Date(start.getTime() - 2 * 86_400_000), lt: new Date(end.getTime() + 2 * 86_400_000) },
        },
        select: { deviceId: true, periodStart: true, sumValue: true },
      });

      const monthPrefix = `${String(year).padStart(4, '0')}-${String(monthIdx + 1).padStart(2, '0')}`;
      for (const row of aggregates) {
        const siteId = deviceSite[row.deviceId];
        const tz = deviceTz[row.deviceId];
        if (!localDateStr(row.periodStart, tz).startsWith(monthPrefix)) continue;
        const dateKey = localDateStr(row.periodStart, tz);
        const key = `${siteId}|${dateKey}`;
        const h = localHour(row.periodStart, tz);
        const wh = Number(row.sumValue) || 0;
        if (h >= peakStart && h < peakEnd) {
          peakBySiteDate.set(key, (peakBySiteDate.get(key) || 0) + wh);
        } else {
          offPeakBySiteDate.set(key, (offPeakBySiteDate.get(key) || 0) + wh);
        }
      }
    }

    // Bentuk baris hasil.
    if (groupBy === 'site') {
      // Agregat per site (seluruh bulan).
      const bySite = new Map();
      for (const s of sites) {
        bySite.set(s.id, { siteId: s.id, siteName: s.name, totalKwh: 0, peakKwh: 0, offPeakKwh: 0 });
      }
      for (const r of dailyRows) {
        const e = bySite.get(r.siteId);
        if (!e) continue;
        e.totalKwh += (Number(r.totalConsumption) || 0) / 1000;
      }
      if (isPeakOffPeak) {
        for (const [key, wh] of peakBySiteDate) {
          const sid = key.split('|')[0];
          const e = bySite.get(sid);
          if (e) e.peakKwh += wh / 1000;
        }
        for (const [key, wh] of offPeakBySiteDate) {
          const sid = key.split('|')[0];
          const e = bySite.get(sid);
          if (e) e.offPeakKwh += wh / 1000;
        }
      }
      const rows = [...bySite.values()].map((e) => {
        const peak = Math.round(e.peakKwh * 100) / 100;
        const offPeak = Math.round(e.offPeakKwh * 100) / 100;
        return {
          siteId: e.siteId,
          siteName: e.siteName,
          totalKwh: isPeakOffPeak ? Math.round((peak + offPeak) * 100) / 100 : Math.round(e.totalKwh * 100) / 100,
          ...(isPeakOffPeak ? { peakKwh: peak, offPeakKwh: offPeak } : {}),
        };
      });
      return reply.code(200).send({ success: true, data: { period: billingPeriod, groupBy: 'site', rows } });
    }

    // Default: agregat per tanggal.
    const byDate = new Map();
    for (const r of dailyRows) {
      const dk = r.date.toISOString().slice(0, 10);
      if (!byDate.has(dk)) byDate.set(dk, { date: dk, totalKwh: 0, peakKwh: 0, offPeakKwh: 0 });
      byDate.get(dk).totalKwh += (Number(r.totalConsumption) || 0) / 1000;
    }
    if (isPeakOffPeak) {
      for (const [key, wh] of peakBySiteDate) {
        const dk = key.split('|')[1];
        if (byDate.has(dk)) byDate.get(dk).peakKwh += wh / 1000;
      }
      for (const [key, wh] of offPeakBySiteDate) {
        const dk = key.split('|')[1];
        if (byDate.has(dk)) byDate.get(dk).offPeakKwh += wh / 1000;
      }
    }
    const rows = [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const peak = Math.round(e.peakKwh * 100) / 100;
        const offPeak = Math.round(e.offPeakKwh * 100) / 100;
        return {
          date: e.date,
          // Untuk PEAK_OFF_PEAK, total harus sama dengan peak+offPeak agar
          // rincian rekonsiliasi dengan jumlah yang ditagih (bukan daily-summary
          // yang bisa beda ~0.4% akibat pembulatan integer per jam saat seed).
          totalKwh: isPeakOffPeak ? Math.round((peak + offPeak) * 100) / 100 : Math.round(e.totalKwh * 100) / 100,
          ...(isPeakOffPeak ? { peakKwh: peak, offPeakKwh: offPeak } : {}),
        };
      });

    return reply.code(200).send({ success: true, data: { period: billingPeriod, groupBy: 'date', rows } });
  } catch (error) {
    request.log.error({ err: error }, 'getInvoiceUsage error');
    return reply.code(500).send({ success: false, message: error.message });
  }
};
