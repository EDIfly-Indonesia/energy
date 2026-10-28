const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function generateDailySummary() {
  console.log("📊 Generating daily summaries from telemetry data...\n");

  const sites = await prisma.site.findMany({
    include: { devices: true },
  });

  console.log(`Found ${sites.length} sites to process...\n`);

  let totalSummaries = 0;

  for (const site of sites) {
    console.log(
      `Processing site: ${site.name} (${site.devices.length} devices)...`,
    );

    // Get all telemetry data for this site grouped by date
    const telemetryData = await prisma.telemetryData.findMany({
      where: {
        device: { siteId: site.id },
        standardKey: { in: ["p_active", "p_load", "p_export", "p_import"] },
      },
      orderBy: { timestamp: "asc" },
    });

    // Group by date
    const dailyMap = {};

    for (const data of telemetryData) {
      const dateKey = data.timestamp.toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: new Date(dateKey),
          totalProduction: 0,
          totalConsumption: 0,
          totalExport: 0,
          totalImport: 0,
          peakPower: 0,
          avgPower: 0,
          count: 0,
          storage: 0,
        };
      }

      const day = dailyMap[dateKey];

      if (data.standardKey === "p_active") {
        day.totalProduction += data.value || 0;
        day.peakPower = Math.max(day.peakPower, data.value || 0);
        day.avgPower += data.value || 0;
        day.count++;
      } else if (data.standardKey === "p_load") {
        day.totalConsumption += data.value || 0;
      } else if (data.standardKey === "p_export") {
        day.totalExport += data.value || 0;
      } else if (data.standardKey === "p_import") {
        day.totalImport += data.value || 0;
      }
    }

    // Insert daily summaries
    let siteCount = 0;
    for (const [dateKey, data] of Object.entries(dailyMap)) {
      const avgPower = data.count > 0 ? data.avgPower / data.count : 0;

      try {
        // Convert W to kWh
        await prisma.dailySummary.create({
          data: {
            siteId: site.id,
            date: data.date,
            totalProduction: data.totalProduction,
            totalConsumption: data.totalConsumption,
            totalExport: data.totalExport,
            totalImport: data.totalImport,
            totalStorage: data.storage,
            peakPower: data.peakPower,
            avgPower: avgPower,
          },
        });
        siteCount++;
      } catch (error) {
        if (!error.message.includes("Unique constraint")) {
          console.error(
            `  Error creating summary for ${dateKey}: ${error.message}`,
          );
        }
      }
    }

    console.log(`  ✅ Created ${siteCount} daily summaries for ${site.name}`);
    totalSummaries += siteCount;
  }

  console.log(`\n✅ Total daily summaries created: ${totalSummaries}`);
  await prisma.$disconnect();
}

// Run
generateDailySummary();
