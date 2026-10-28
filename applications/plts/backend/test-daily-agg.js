#!/usr/bin/env node
/**
 * Direct trigger for daily aggregation for a specific date.
 * Bypasses the "yesterday" logic to test with a specific date.
 */
const AggregatorWorker = require('./src/services/aggregator-worker.service');
const prisma = require('./src/config/database');

async function main() {
  const worker = new AggregatorWorker();
  
  // Temporarily expose a method to test with a specific date
  const dateStr = process.argv[2] || '2026-08-20'; // Default to the date with mock data
  
  console.log(`📊 Testing daily aggregation for ${dateStr}...`);
  
  const query = `
    from(bucket: "${worker.bucket}")
      |> range(start: ${dateStr}T00:00:00Z, stop: ${dateStr}T23:59:59Z)
      |> filter(fn: (r) => r._measurement == "power" or r._measurement == "energy")
      |> filter(fn: (r) => r._field == "p_active" or r._field == "p_load" or r._field == "p_export" or r._field == "p_import" or r._field == "e_daily")
      |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
      |> group()
  `;
  
  try {
    const rows = await worker.queryApi.collectRows(query);
    console.log(`Found ${rows.length} data points for ${dateStr}`);
    
    if (rows.length > 0) {
      for (const row of rows.slice(0, 3)) {
        console.log(`  Device: ${row.device_id}, Field: ${row._field}, Value: ${row._value}`);
      }
      
      // Now simulate the summary insertion
      console.log("\nInserting daily summary...");
      const summaryMap = {};
      
      for (const row of rows) {
        const device = await prisma.device.findFirst({
          where: {
            OR: [
              { serialNumber: row.device_id },
              { id: row.device_id }
            ]
          },
          include: { site: { select: { id: true } } }
        });
        if (!device || !device.site) {
          console.log(`  No device/site found for device_id: ${row.device_id}`);
          continue;
        }
        
        const key = device.site.id;
        if (!summaryMap[key]) summaryMap[key] = { 
          siteId: device.site.id, 
          date: new Date(dateStr), 
          totalProduction: 0, totalConsumption: 0, totalExport: 0, 
          totalImport: 0, totalStorage: 0, peakPower: 0, avgPower: 0 
        };
        
        const val = Number(row._value) || 0;
        switch (row._field) {
          case 'p_active': summaryMap[key].totalProduction += val; break;
          case 'p_load': summaryMap[key].totalConsumption += val; break;
          case 'p_export': summaryMap[key].totalExport += val; break;
          case 'p_import': summaryMap[key].totalImport += val; break;
          case 'e_daily': summaryMap[key].totalStorage += val; break;
        }
        summaryMap[key].peakPower = Math.max(summaryMap[key].peakPower, val);
      }
      
      for (const [_, s] of Object.entries(summaryMap)) {
        const data = {
          siteId: s.siteId,
          date: s.date,
          totalProduction: String(s.totalProduction),
          totalConsumption: String(s.totalConsumption),
          totalExport: String(s.totalExport),
          totalImport: String(s.totalImport),
          totalStorage: String(s.totalStorage),
          peakPower: String(s.peakPower),
          avgPower: String(s.totalProduction),
        };
        await prisma.dailySummary.create({ data });
        console.log(`✅ Created daily summary for site ${s.siteId}`);
      }
      
      console.log(`✅ Daily aggregation completed for ${dateStr} (${Object.keys(summaryMap).length} sites updated)`);
    } else {
      console.log("No data found to aggregate");
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
    await worker.cleanup();
  }
}

main().catch(console.error);
