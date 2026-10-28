const { PrismaClient } = require("@prisma/client");
const { faker } = require("@faker-js/faker");
const prisma = new PrismaClient();

// Konfigurasi
const START_DATE = new Date("2026-06-01T00:05:00+07:00");
const END_DATE = new Date("2026-07-27T23:50:00+07:00");
const INTERVAL_MINUTES = 15;

// Data Tenants
// ============================================
// 5. SEED TENANTS
// ============================================
console.log("📋 Seeding tenants...");
const tenants = [
  { name: "PT Charoen Pokphand", type: "ENTERPRISE", isActive: true },
  { name: "PT Mitratel", type: "ENTERPRISE", isActive: true },
  { name: "PLN", type: "GOVERNMENT", isActive: true },
  { name: "PT Indosat", type: "ENTERPRISE", isActive: true },
  { name: "PT Telkom", type: "ENTERPRISE", isActive: true },
];

// Data Companies per Tenant (tanpa field industry)
const COMPANIES = {
  "PT Telkom": [{ name: "Telkom Energy" }, { name: "Telkom Power" }],
  "PT Indosat": [
    { name: "Indosat Energy" },
    { name: "Indosat Power" },
    { name: "Indosat Renewables" },
  ],
  "PT Mitratel": [{ name: "Mitratel Energy" }],
  "PT Charoen Pokphand": [{ name: "CP Power" }],
};

// Data Sites per Company
const SITES = {
  "Telkom Energy": ["Jakarta Plant A", "Jakarta Plant B", "Bandung Plant A"],
  "Telkom Power": ["Bandung Plant B", "Semarang Plant A"],
  "Indosat Energy": [
    "Medan Plant A",
    "Medan Plant B",
    "Padang Plant A",
    "Pekanbaru Plant A",
  ],
  "Indosat Power": ["Surabaya Plant A", "Surabaya Plant B", "Bali Plant A"],
  "Indosat Renewables": ["Bali Plant B", "Jakarta Plant C", "Bandung Plant C"],
  "Mitratel Energy": ["Jakarta Plant D", "Semarang Plant B"],
  "CP Power": ["Semarang Plant C", "Surabaya Plant C"],
};

// Device Brands
const BRANDS = [
  "Sungrow",
  "Huawei",
  "Goodwe",
  "Growatt",
  "SMA",
  "ABB",
  "Schneider Electric",
  "Solis",
  "Fronius",
  "Delta",
];
// Device Types
const TYPES = [
  "Inverter",
  "Battery",
  "Smart Meter",
  "Data Logger",
  "Gateway",
  "Sensor",
  "Solar Panel",
  "Optimizer",
  "Charge Controller",
];
// Telemetry standard keys
const TELEMETRY_KEYS = [
  // Power
  "p_active",
  "p_reactive",
  "p_apparent",
  "p_active_a",
  "p_active_b",
  "p_active_c",
  "p_export",
  "p_import",
  "p_pv1",
  "p_pv2",
  "p_pv3",
  "p_pv4",
  "p_battery_charge",
  "p_battery_discharge",
  "p_load",
  // Voltage
  "v_dc",
  "v_dc1",
  "v_dc2",
  "v_dc3",
  "v_dc4",
  "v_ac",
  "v_ab",
  "v_bc",
  "v_ca",
  "v_an",
  "v_bn",
  "v_cn",
  "v_battery",
  "v_grid",
  // Current
  "c_dc",
  "c_dc1",
  "c_dc2",
  "c_dc3",
  "c_dc4",
  "c_ac",
  "c_a",
  "c_b",
  "c_c",
  "c_battery",
  // Energy
  "e_daily",
  "e_total",
  "e_daily_export",
  "e_total_export",
  "e_daily_import",
  "e_total_import",
  "e_daily_charge",
  "e_daily_discharge",
  "e_total_charge",
  "e_total_discharge",
  "e_daily_load",
  "e_total_load",
  "e_monthly",
  "e_yearly",
  // Frequency
  "f_grid",
  "f_ac",
  // Temperature
  "t_env",
  "t_inverter",
  "t_battery",
  "t_pv",
  "t_heatsink",
  "t_boost",
  "t_cabinet",
  // Irradiance
  "i_poa",
  "i_ghi",
  "i_dni",
  // Status
  "s_device",
  "s_grid",
  "s_battery",
  "s_alarm",
  // Battery
  "b_soc",
  "b_soh",
  "b_capacity",
  "b_charge",
  "b_discharge",
  "b_voltage",
  "b_current",
  "b_temp",
  // Others
  "cos_phi",
  "thd_v",
  "thd_c",
  "efficiency",
];

// Generate random value based on key
function generateTelemetryValue(key, timestamp, deviceIndex) {
  const hour = timestamp.getHours();
  const day = timestamp.getDate();
  const month = timestamp.getMonth();

  let baseValue = 0;
  let variation = 0.2;

  // Power values - higher during day
  if (key.startsWith("p_")) {
    const dayFactor = Math.sin(((hour - 6) / 12) * Math.PI);
    baseValue = Math.max(0, dayFactor) * (500 + Math.random() * 500);
    variation = 0.1;

    if (key === "p_export") baseValue = baseValue * 0.7;
    if (key === "p_import") baseValue = baseValue * 0.3;
    if (key === "p_load") baseValue = baseValue * 0.8;
    if (key.includes("pv")) baseValue = baseValue * (0.5 + Math.random() * 0.5);
    if (key.includes("battery")) baseValue = baseValue * 0.2;
  }

  // Voltage values - relatively stable
  if (key.startsWith("v_")) {
    if (key === "v_ac") baseValue = 220 + (Math.random() - 0.5) * 10;
    else if (key.startsWith("v_dc"))
      baseValue = 300 + (Math.random() - 0.5) * 50;
    else if (key === "v_grid") baseValue = 220 + (Math.random() - 0.5) * 5;
    else baseValue = 200 + Math.random() * 100;
    variation = 0.02;
  }

  // Current values
  if (key.startsWith("c_")) {
    const dayFactor = Math.sin(((hour - 6) / 12) * Math.PI);
    baseValue = Math.max(0, dayFactor) * (10 + Math.random() * 20);
    variation = 0.15;
  }

  // Energy values - cumulative
  if (key.startsWith("e_")) {
    if (key === "e_daily") baseValue = 100 + Math.random() * 200;
    else if (key === "e_total") baseValue = 10000 + Math.random() * 5000;
    else if (key.includes("export")) baseValue = 50 + Math.random() * 100;
    else if (key.includes("import")) baseValue = 20 + Math.random() * 50;
    else baseValue = 50 + Math.random() * 150;
    variation = 0.05;
  }

  // Temperature values
  if (key.startsWith("t_")) {
    if (key === "t_env")
      baseValue =
        25 +
        Math.sin(((hour - 6) / 12) * Math.PI) * 10 +
        (Math.random() - 0.5) * 5;
    else if (key === "t_inverter")
      baseValue =
        35 +
        Math.sin(((hour - 6) / 12) * Math.PI) * 15 +
        (Math.random() - 0.5) * 5;
    else baseValue = 20 + Math.random() * 30;
    variation = 0.05;
  }

  // Battery values
  if (key.startsWith("b_")) {
    if (key === "b_soc") baseValue = 40 + Math.random() * 60;
    else if (key === "b_soh") baseValue = 80 + Math.random() * 20;
    else baseValue = 10 + Math.random() * 100;
    variation = 0.05;
  }

  // Irradiance
  if (key.startsWith("i_")) {
    const dayFactor = Math.sin(((hour - 6) / 12) * Math.PI);
    baseValue = Math.max(0, dayFactor) * (800 + Math.random() * 400);
    variation = 0.1;
  }

  // Status - mostly online
  if (key.startsWith("s_")) {
    if (key === "s_device") {
      const statuses = [
        "ONLINE",
        "ONLINE",
        "ONLINE",
        "OFFLINE",
        "MAINTENANCE",
        "FAULT",
      ];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (key === "s_grid")
      return Math.random() > 0.1 ? "CONNECTED" : "DISCONNECTED";
    if (key === "s_battery") {
      const statuses = ["IDLE", "CHARGING", "DISCHARGING"];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    return "NONE";
  }

  // Frequency
  if (key.startsWith("f_")) {
    baseValue = 50 + (Math.random() - 0.5) * 0.5;
    variation = 0.01;
  }

  // Others
  if (key === "cos_phi") baseValue = 0.8 + Math.random() * 0.2;
  if (key === "efficiency") baseValue = 90 + Math.random() * 9;
  if (key === "thd_v") baseValue = Math.random() * 5;
  if (key === "thd_c") baseValue = Math.random() * 8;

  // Add noise
  const noise = (Math.random() - 0.5) * variation * baseValue;
  const finalValue = baseValue + noise;

  return typeof finalValue === "number"
    ? Math.round(finalValue * 100) / 100
    : finalValue;
}

async function seedMasterData() {
  console.log("🌱 Seeding master data...");

  // 1. Create Tenants
  const tenantMap = {};
  for (const tenantData of tenants) {
    const existing = await prisma.tenant.findFirst({
      where: { name: tenantData.name },
    });
    if (!existing) {
      const created = await prisma.tenant.create({ data: tenantData });
      tenantMap[created.name] = created.id;
      console.log(`  ✅ Created tenant: ${created.name}`);
    } else {
      tenantMap[existing.name] = existing.id;
      console.log(`  ⏭️  Tenant ${existing.name} already exists`);
    }
  }
  console.log("");

  // 2. Create Device Brands
  const brandMap = {};
  for (const brandName of BRANDS) {
    const existing = await prisma.deviceBrand.findFirst({
      where: { name: brandName },
    });
    if (!existing) {
      const brand = await prisma.deviceBrand.create({
        data: { name: brandName },
      });
      brandMap[brandName] = brand.id;
      console.log(`  ✅ Created brand: ${brandName}`);
    } else {
      brandMap[brandName] = existing.id;
      console.log(`  ⏭️  Brand ${brandName} already exists`);
    }
  }

  // 3. Create Device Types
  const typeMap = {};
  for (const typeName of TYPES) {
    const existing = await prisma.deviceType.findFirst({
      where: { name: typeName },
    });
    if (!existing) {
      const type = await prisma.deviceType.create({ data: { name: typeName } });
      typeMap[typeName] = type.id;
      console.log(`  ✅ Created type: ${typeName}`);
    } else {
      typeMap[typeName] = existing.id;
      console.log(`  ⏭️  Type ${typeName} already exists`);
    }
  }

  // 4. Create Companies and Sites
  const siteMap = {};
  const companyMap = {};
  let deviceCounter = 1;

  const allCompanyNames = [];
  for (const companies of Object.values(COMPANIES)) {
    for (const c of companies) {
      if (!allCompanyNames.includes(c.name)) allCompanyNames.push(c.name);
    }
  }

  for (const companyName of allCompanyNames) {
    let company = await prisma.company.findFirst({
      where: { name: companyName },
    });
    if (!company) {
      company = await prisma.company.create({
        data: { name: companyName },
      });
      console.log(`  ✅ Created company: ${companyName}`);
    } else {
      console.log(`  ⏭️  Company ${companyName} already exists`);
    }
    companyMap[companyName] = company.id;
  }

  for (const [tenantName, companies] of Object.entries(COMPANIES)) {
    const tenantId = tenantMap[tenantName];
    if (!tenantId) continue;

    for (const companyName of companies.map(c => c.name)) {
      const company = await prisma.company.findFirst({
        where: { name: companyName },
      });
      if (!company) continue;

      // Create sites for this company
      const siteNames = SITES[companyName] || [
        `${companyName} Plant`,
      ];
      for (const siteName of siteNames) {
        const existingSite = await prisma.site.findFirst({
          where: { name: siteName, tenantId: tenantId },
        });

        let site;
        if (!existingSite) {
          const statuses = [
            "ONLINE",
            "ONLINE",
            "ONLINE",
            "OFFLINE",
            "MAINTENANCE",
          ];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          site = await prisma.site.create({
            data: {
              name: siteName,
              tenantId: tenantId,
              capacityKwp: 50 + Math.random() * 450,
              latitude: -6 + (Math.random() - 0.5) * 10,
              longitude: 106 + (Math.random() - 0.5) * 10,
              timezone: "Asia/Jakarta",
            },
          });
          console.log(`  ✅ Created site: ${siteName} (${companyName})`);
        } else {
          site = existingSite;
          console.log(`  ⏭️  Site ${siteName} already exists`);
        }

        siteMap[siteName] = site.id;

        // Create devices for each site (2-4 devices per site)
        // Create devices for each site (2-4 devices per site)
        const numDevices = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numDevices; i++) {
          const brandName = BRANDS[Math.floor(Math.random() * BRANDS.length)];
          const typeName = TYPES[Math.floor(Math.random() * TYPES.length)];
          const serialNumber = `SN-${String(deviceCounter++).padStart(6, "0")}`;

          const statuses = [
            "ONLINE",
            "ONLINE",
            "ONLINE",
            "OFFLINE",
            "MAINTENANCE",
          ];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          const randomModelName = `${brandName} ${typeName} ${Math.floor(100 + Math.random() * 900)}`;

          // Menggunakan upsert untuk mencegah error P2002 (Unique Constraint)
          const device = await prisma.device.upsert({
            where: { 
              brandId_serialNumber: {
                brandId: brandMap[brandName],
                serialNumber: serialNumber 
              }
            },
            update: {}, // Biarkan kosong agar tidak menimpa data device lama jika sudah ada
            create: {
              serialNumber,
              modelName: randomModelName,
              status: randomStatus,
              siteId: site.id,
              brandId: brandMap[brandName],
              typeId: typeMap[typeName],
            },
          });

          console.log(`  ✅ Upserted device: ${serialNumber} (${typeName})`);
        }
      }
    }
  }

  return { tenantMap, brandMap, typeMap, siteMap };
}

async function seedTelemetryData(siteMap) {
  console.log("\n📊 Seeding telemetry data...");
  console.log(
    `  Period: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}`,
  );
  console.log(`  Interval: ${INTERVAL_MINUTES} minutes`);

  // Get all devices
  const devices = await prisma.device.findMany({
    include: { site: true },
  });

  console.log(`  Found ${devices.length} devices`);

  let totalRecords = 0;
  let batchSize = 500;
  let batch = [];

  // Generate timestamps
  const timestamps = [];
  let current = new Date(START_DATE);
  while (current <= END_DATE) {
    timestamps.push(new Date(current));
    current.setMinutes(current.getMinutes() + INTERVAL_MINUTES);
  }

  console.log(`  Generating ${timestamps.length} timestamps per device...`);

  // Filter keys that are numeric (skip status keys)
  const numericKeys = TELEMETRY_KEYS.filter((key) => !key.startsWith("s_"));

  for (const device of devices) {
    console.log(`  Processing device: ${device.serialNumber}...`);
    let deviceRecords = 0;

    for (const timestamp of timestamps) {
      // Generate values for all numeric telemetry keys
      for (const key of numericKeys) {
        const value = generateTelemetryValue(
          key,
          timestamp,
          devices.indexOf(device),
        );

        if (value !== null && value !== undefined && !isNaN(value)) {
          const record = {
            deviceId: device.id,
            standardKey: key,
            value: value,
            quality: Math.random() > 0.02 ? "GOOD" : "BAD",
            timestamp: timestamp,
            createdAt: new Date(),
          };

          batch.push(record);
          totalRecords++;
          deviceRecords++;

          // Insert batch when it reaches batchSize
          if (batch.length >= batchSize) {
            try {
              await prisma.telemetryData.createMany({
                data: batch,
                skipDuplicates: true,
              });
              batch = [];
            } catch (error) {
              console.error(`    Error inserting batch: ${error.message}`);
            }
          }
        }
      }
    }

    console.log(
      `    Generated ${deviceRecords} records for device ${device.serialNumber}`,
    );
  }

  // Insert remaining records
  if (batch.length > 0) {
    try {
      await prisma.telemetryData.createMany({
        data: batch,
        skipDuplicates: true,
      });
      console.log(`    Inserted final ${batch.length} records...`);
      batch = [];
    } catch (error) {
      console.error(`    Error inserting final batch: ${error.message}`);
    }
  }

  console.log(`\n✅ Total telemetry records inserted: ${totalRecords}`);
  return totalRecords;
}

async function seedDailySummary() {
  console.log("\n📊 Generating daily summaries...");

  const sites = await prisma.site.findMany();
  let summaryCount = 0;

  for (const site of sites) {
    console.log(`  Processing site: ${site.name}...`);

    // Get telemetry data grouped by date
    const telemetryData = await prisma.telemetryData.findMany({
      where: {
        device: { siteId: site.id },
        timestamp: { gte: START_DATE, lte: END_DATE },
        standardKey: { in: ["p_active", "p_load", "p_export", "p_import"] },
      },
      orderBy: { timestamp: "asc" },
    });

    // Group by date
    const dailyData = {};
    for (const data of telemetryData) {
      const dateKey = data.timestamp.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          totalProduction: 0,
          totalConsumption: 0,
          totalExport: 0,
          totalImport: 0,
          peakPower: 0,
          avgPower: 0,
          count: 0,
        };
      }

      if (data.standardKey === "p_active") {
        dailyData[dateKey].totalProduction += data.value || 0;
        dailyData[dateKey].peakPower = Math.max(
          dailyData[dateKey].peakPower,
          data.value || 0,
        );
        dailyData[dateKey].avgPower += data.value || 0;
        dailyData[dateKey].count++;
      } else if (data.standardKey === "p_load") {
        dailyData[dateKey].totalConsumption += data.value || 0;
      } else if (data.standardKey === "p_export") {
        dailyData[dateKey].totalExport += data.value || 0;
      } else if (data.standardKey === "p_import") {
        dailyData[dateKey].totalImport += data.value || 0;
      }
    }

    // Insert daily summaries
    for (const [dateKey, data] of Object.entries(dailyData)) {
      const date = new Date(dateKey);
      const avgPower = data.count > 0 ? data.avgPower / data.count : 0;

      try {
        await prisma.dailySummary.create({
          data: {
            siteId: site.id,
            date: date,
            totalProduction: data.totalProduction,
            totalConsumption: data.totalConsumption,
            totalExport: data.totalExport,
            totalImport: data.totalImport,
            totalStorage: 0,
            peakPower: data.peakPower,
            avgPower: avgPower,
          },
        });
        summaryCount++;
      } catch (error) {
        if (!error.message.includes("Unique constraint")) {
          console.error(`    Error creating daily summary: ${error.message}`);
        }
      }
    }
  }

  console.log(`✅ Daily summaries created: ${summaryCount}`);
}

async function main() {
  console.log("🚀 Starting telemetry data seeder...\n");

  try {
    // 1. Seed master data
    const { siteMap } = await seedMasterData();

    // 2. Seed telemetry data
    await seedTelemetryData(siteMap);

    // 3. Seed daily summaries
    await seedDailySummary();

    console.log("\n🎉 Telemetry data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { seedMasterData };

// Jalankan seeder jika dipanggil langsung (bukan di-import)
if (require.main === module) {
  main();
}
