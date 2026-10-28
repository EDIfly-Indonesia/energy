// Run daily aggregation for 2026-08-19
require('dotenv').config();

const { InfluxDB } = require('@influxdata/influxdb-client');
const prisma = require('./src/config/database');

async function runDailyAggregationForDate(targetDate) {
  const influxDB = new InfluxDB({
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG,
    timeout: 30000
  });
  const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);
  
  const query = `
    from(bucket: "${process.env.INFLUXDB_BUCKET}")
      |> range(start: ${targetDate}T00:00:00Z, stop: ${targetDate}T23:59:59Z)
      |> filter(fn: (r) => r._measurement == "power" or r._measurement == "energy")
      |> filter(fn: (r) => r._field == "p_active" or r._field == "p_load" or r._field == "p_export" or r._field == "p_import" or r._field == "e_daily")
      |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
      |> group()
  `;
  
  const rows = await queryApi.collectRows(query);
  console.log('Found ' + rows.length + ' rows for ' + targetDate);
  
  if (rows.length > 0) {
    // Show sample
    console.log('Sample row:', JSON.stringify({device_id: rows[0].device_id, _field: rows[0]._field, _value: rows[0]._value, serial: rows[0].serial}));
    
    // Now do the aggregation logic
    const summaryMap = {};
    for (const row of rows) {
      // FIX: Use serial number to look up device
      const device = await prisma.device.findFirst({
        where: { serialNumber: row.serial },
        include: { site: { select: { id: true } } }
      });
      if (!device || !device.site) {
        if (rows.indexOf(row) < 3) console.log('No device found for serial:', row.serial, '-> device_id:', row.device_id);
        continue;
      }
      
      const key = device.site.id;
      if (!summaryMap[key]) summaryMap[key] = { 
        siteId: device.site.id, 
        date: new Date(targetDate), 
        totalProduction: 0, totalConsumption: 0, totalExport: 0, 
        totalImport: 0, totalStorage: 0, peakPower: 0, avgPower: 0 
      };
      
      const val = Number(row._value) || 0;
      switch (row._field) {
        case 'p_active': summaryMap[key].totalProduction += val; break;
        case 'p_load':   summaryMap[key].totalConsumption += val; break;
        case 'p_export': summaryMap[key].totalExport += val; break;
        case 'p_import': summaryMap[key].totalImport += val; break;
        case 'e_daily':  summaryMap[key].totalStorage += val; break;
      }
      summaryMap[key].peakPower = Math.max(summaryMap[key].peakPower, val);
    }
    
    // Insert summaries
    let inserted = 0;
    for (const s of Object.values(summaryMap)) {
      await prisma.dailySummary.create({
        data: {
          siteId: s.siteId,
          date: s.date,
          totalProduction: String(s.totalProduction),
          totalConsumption: String(s.totalConsumption),
          totalExport: String(s.totalExport),
          totalImport: String(s.totalImport),
          totalStorage: String(s.totalStorage),
          peakPower: String(s.peakPower),
          avgPower: String(s.totalProduction)
        }
      });
      inserted++;
    }
    console.log('Inserted ' + inserted + ' daily summaries for ' + targetDate);
  }
  
  await prisma.$disconnect();
  influxDB.close();
}

runDailyAggregationForDate('2026-08-19').catch(e => { console.error('Error:', e.message); process.exit(1); });