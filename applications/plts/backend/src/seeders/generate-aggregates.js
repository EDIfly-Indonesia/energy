const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAggregates() {
  console.log('📊 Generating aggregates for all devices...\n');

  const devices = await prisma.device.findMany();
  console.log(`Found ${devices.length} devices\n`);

  let total = 0;

  for (const device of devices) {
    console.log(`Processing device: ${device.serialNumber}...`);

    // Get all telemetry data for this device
    const data = await prisma.telemetryData.findMany({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'asc' }
    });

    if (data.length === 0) {
      console.log(`  ⏭️ No data for ${device.serialNumber}`);
      continue;
    }

    console.log(`  Found ${data.length} records`);

    // Group by hour
    const hourlyMap = {};
    for (const d of data) {
      const hourKey = d.timestamp.toISOString().slice(0, 13);
      if (!hourlyMap[hourKey]) {
        hourlyMap[hourKey] = { values: [], count: 0 };
      }
      hourlyMap[hourKey].values.push(d.value);
      hourlyMap[hourKey].count++;
    }

    // Insert hourly aggregates
    let hourlyCount = 0;
    for (const [hourKey, group] of Object.entries(hourlyMap)) {
      const values = group.values;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const hourStart = new Date(hourKey + ':00:00+07:00');
      const hourEnd = new Date(hourKey + ':59:59+07:00');

      try {
        await prisma.telemetryAggregate.create({
          data: {
            deviceId: device.id,
            standardKey: 'p_active',
            period: 'hourly',
            minValue: min,
            maxValue: max,
            avgValue: avg,
            sumValue: sum,
            count: values.length,
            periodStart: hourStart,
            periodEnd: hourEnd
          }
        });
        hourlyCount++;
      } catch (e) {
        if (!e.message.includes('Unique constraint')) {
          console.error(`    Error: ${e.message}`);
        }
      }
    }
    console.log(`  ✅ Hourly: ${hourlyCount} records`);

    // Daily aggregates
    const dailyMap = {};
    for (const d of data) {
      const dayKey = d.timestamp.toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { values: [], count: 0 };
      }
      dailyMap[dayKey].values.push(d.value);
      dailyMap[dayKey].count++;
    }

    let dailyCount = 0;
    for (const [dayKey, group] of Object.entries(dailyMap)) {
      const values = group.values;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const dayStart = new Date(dayKey + 'T00:00:00+07:00');
      const dayEnd = new Date(dayKey + 'T23:59:59+07:00');

      try {
        await prisma.telemetryAggregate.create({
          data: {
            deviceId: device.id,
            standardKey: 'p_active',
            period: 'daily',
            minValue: min,
            maxValue: max,
            avgValue: avg,
            sumValue: sum,
            count: values.length,
            periodStart: dayStart,
            periodEnd: dayEnd
          }
        });
        dailyCount++;
      } catch (e) {
        if (!e.message.includes('Unique constraint')) {
          console.error(`    Error: ${e.message}`);
        }
      }
    }
    console.log(`  ✅ Daily: ${dailyCount} records`);
    total += hourlyCount + dailyCount;
  }

  console.log(`\n✅ Total aggregates created: ${total}`);
  await prisma.$disconnect();
}

generateAggregates();
