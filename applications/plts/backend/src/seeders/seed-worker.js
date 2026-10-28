// File: src/seeders/seed-worker.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Default values ──────────────────────────────────────────────────────────
const DEFAULT_START_DATE = "2026-06-01T00:05:00+07:00";
const DEFAULT_END_DATE = "2026-07-24T23:55:00+07:00";
const DEFAULT_INTERVAL = 15;

// ─── Parse arguments ────────────────────────────────────────────────────────
// Usage: node seed-worker.js <deviceId> [startDate] [endDate] [intervalMinutes]
// Example: node seed-worker.js device-uuid "2026-06-01T00:05:00+07:00" "2026-07-24T23:55:00+07:00" 15
const args = process.argv.slice(2).map(arg => arg.trim());
const deviceId = args[0];
const startDateArg = args[1] ? args[1].trim() : DEFAULT_START_DATE;
const endDateArg = args[2] ? args[2].trim() : DEFAULT_END_DATE;
const intervalMinutes = parseInt(args[3]) || DEFAULT_INTERVAL;

if (!deviceId) {
  console.error("❌ Device ID tidak diberikan!");
  console.log("Usage: node seed-worker.js <deviceId> [startDate] [endDate] [intervalMinutes]");
  console.log("Example: node seed-worker.js device-uuid \"2026-06-01T00:05:00+07:00\" \"2026-07-24T23:55:00+07:00\" 15");
  process.exit(1);
}

// Parse dates with better error handling
let START_DATE, END_DATE;
try {
  START_DATE = new Date(startDateArg);
  if (isNaN(START_DATE.getTime())) {
    console.error(`❌ Invalid start date: ${startDateArg}`);
    process.exit(1);
  }
} catch (e) {
  console.error(`❌ Error parsing start date: ${startDateArg}`, e.message);
  process.exit(1);
}

try {
  END_DATE = new Date(endDateArg);
  if (isNaN(END_DATE.getTime())) {
    console.error(`❌ Invalid end date: ${endDateArg}`);
    process.exit(1);
  }
} catch (e) {
  console.error(`❌ Error parsing end date: ${endDateArg}`, e.message);
  process.exit(1);
}

if (START_DATE > END_DATE) {
  console.error(`❌ Start date must be before end date`);
  process.exit(1);
}

console.log(`📅 Period: ${START_DATE.toISOString()} to ${END_DATE.toISOString()}`);
console.log(`⏱️  Interval: ${intervalMinutes} minutes`);

// ─── Data Definitions ──────────────────────────────────────────────────────
const tenants = [
  { name: "PT Charoen Pokphand", type: "ENTERPRISE", isActive: true },
  { name: "PT Mitratel", type: "ENTERPRISE", isActive: true },
  { name: "PLN", type: "GOVERNMENT", isActive: true },
  { name: "PT Indosat", type: "ENTERPRISE", isActive: true },
  { name: "PT Telkom", type: "ENTERPRISE", isActive: true },
];

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

const TELEMETRY_KEYS = [
  "p_active", "p_reactive", "p_apparent", "p_active_a", "p_active_b", "p_active_c",
  "p_export", "p_import", "p_pv1", "p_pv2", "p_pv3", "p_pv4",
  "p_battery_charge", "p_battery_discharge", "p_load",
  "v_dc", "v_dc1", "v_dc2", "v_dc3", "v_dc4", "v_ac",
  "v_ab", "v_bc", "v_ca", "v_an", "v_bn", "v_cn",
  "v_battery", "v_grid",
  "c_dc", "c_dc1", "c_dc2", "c_dc3", "c_dc4",
  "c_ac", "c_a", "c_b", "c_c", "c_battery",
  "e_daily", "e_total", "e_daily_export", "e_total_export",
  "e_daily_import", "e_total_import",
  "e_daily_charge", "e_daily_discharge",
  "e_total_charge", "e_total_discharge",
  "e_daily_load", "e_total_load", "e_monthly", "e_yearly",
  "f_grid", "f_ac",
  "t_env", "t_inverter", "t_battery", "t_pv", "t_heatsink", "t_boost", "t_cabinet",
  "i_poa", "i_ghi", "i_dni",
  "s_device", "s_grid", "s_battery", "s_alarm",
  "b_soc", "b_soh", "b_capacity", "b_charge", "b_discharge",
  "b_voltage", "b_current", "b_temp",
  "cos_phi", "thd_v", "thd_c", "efficiency",
];

// ─── Generate Function ─────────────────────────────────────────────────────
function generateTelemetryValue(key, timestamp, deviceIndex) {
  const hour = timestamp.getHours();
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
    else if (key.startsWith("v_dc")) baseValue = 300 + (Math.random() - 0.5) * 50;
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
    if (key === "t_env") {
      baseValue = 25 + Math.sin(((hour - 6) / 12) * Math.PI) * 10 + (Math.random() - 0.5) * 5;
    } else if (key === "t_inverter") {
      baseValue = 35 + Math.sin(((hour - 6) / 12) * Math.PI) * 15 + (Math.random() - 0.5) * 5;
    } else {
      baseValue = 20 + Math.random() * 30;
    }
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
      const statuses = ["ONLINE", "ONLINE", "ONLINE", "OFFLINE", "MAINTENANCE", "FAULT"];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (key === "s_grid") return Math.random() > 0.1 ? "CONNECTED" : "DISCONNECTED";
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

  const noise = (Math.random() - 0.5) * variation * baseValue;
  const finalValue = baseValue + noise;

  return typeof finalValue === "number" ? Math.round(finalValue * 100) / 100 : finalValue;
}

// ─── Main Function ──────────────────────────────────────────────────────────
async function main() {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    console.error(`❌ Device ${deviceId} tidak ditemukan.`);
    process.exit(1);
  }

  console.log(`\n⚙️ Processing Device: ${device.serialNumber} (ID: ${deviceId})`);

  const numericKeys = TELEMETRY_KEYS.filter((key) => !key.startsWith("s_"));
  let batch = [];
  let totalRecords = 0;
  const batchSize = 1000;

  const timestamps = [];
  let current = new Date(START_DATE);
  while (current <= END_DATE) {
    timestamps.push(new Date(current));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  console.log(`📊 Generating ${timestamps.length} timestamps...`);

  for (const timestamp of timestamps) {
    for (const key of numericKeys) {
      const value = generateTelemetryValue(key, timestamp, 0);
      if (value !== null && value !== undefined && !isNaN(value)) {
        batch.push({
          deviceId: device.id,
          standardKey: key,
          value: value,
          quality: Math.random() > 0.02 ? "GOOD" : "BAD",
          timestamp: timestamp,
          createdAt: new Date(),
        });
        totalRecords++;

        if (batch.length >= batchSize) {
          await prisma.telemetryData.createMany({ data: batch, skipDuplicates: true });
          batch = [];
        }
      }
    }
  }

  if (batch.length > 0) {
    await prisma.telemetryData.createMany({ data: batch, skipDuplicates: true });
  }

  console.log(`✅ Selesai: ${totalRecords} records untuk ${device.serialNumber}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
