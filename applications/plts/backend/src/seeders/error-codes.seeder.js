// File: src/seeders/error-codes.seeder.js
// Seed tabel lookup tbl_error_codes — konvensi ERROR CODE standar SCADA Monitoring Platform.
// Format kode: [PREFIX]-[KATEGORI][NNN]
//   Prefix: E=Error, W=Warning, I=Info
//   Kategori: 0=System/Komunikasi, 1=Grid, 2=Inverter, 3=PV/DC, 4=Battery, 5=Sensor/Meter,
//             6=Lingkungan, 9=Passthrough vendor
const prisma = require('../config/database');

const ERROR_CODES = [
  // ── Kategori 0: System & Komunikasi ──────────────────────────────
  { code: 'E-001', category: 'SYSTEM', severity: 'CRITICAL', descriptionId: 'Device tidak merespon (timeout heartbeat)', descriptionEn: 'Device not responding (heartbeat timeout)' },
  { code: 'E-002', category: 'SYSTEM', severity: 'CRITICAL', descriptionId: 'Gateway/MQTT terputus', descriptionEn: 'Gateway / MQTT disconnected' },
  { code: 'E-003', category: 'SYSTEM', severity: 'MAJOR', descriptionId: 'Data logger gagal mengirim', descriptionEn: 'Data logger failed to send' },
  { code: 'E-004', category: 'SYSTEM', severity: 'WARNING', descriptionId: 'Sinkronisasi waktu gagal', descriptionEn: 'Clock sync failure' },
  { code: 'E-005', category: 'SYSTEM', severity: 'WARNING', descriptionId: 'Pembaruan firmware gagal', descriptionEn: 'Firmware update failed' },
  { code: 'E-006', category: 'SYSTEM', severity: 'MAJOR', descriptionId: 'Komunikasi internal antar-modul gagal', descriptionEn: 'Internal inter-module communication failed' },
  { code: 'E-007', category: 'SYSTEM', severity: 'WARNING', descriptionId: 'Konfigurasi device tidak sesuai master data', descriptionEn: 'Device configuration mismatch with master data' },
  { code: 'W-001', category: 'SYSTEM', severity: 'WARNING', descriptionId: 'Heartbeat terlambat (belum offline)', descriptionEn: 'Heartbeat delayed (not yet offline)' },
  { code: 'W-002', category: 'SYSTEM', severity: 'WARNING', descriptionId: 'Ada gap pada deret telemetry', descriptionEn: 'Telemetry data gap detected' },
  { code: 'I-001', category: 'SYSTEM', severity: 'INFO', descriptionId: 'Device kembali online', descriptionEn: 'Device back online' },
  { code: 'I-002', category: 'SYSTEM', severity: 'INFO', descriptionId: 'Firmware berhasil diperbarui', descriptionEn: 'Firmware updated successfully' },

  // ── Kategori 1: Grid ─────────────────────────────────────────────
  { code: 'E-101', category: 'GRID', severity: 'CRITICAL', descriptionId: 'Grid hilang / islanding terdeteksi', descriptionEn: 'Grid loss / islanding detected' },
  { code: 'E-102', category: 'GRID', severity: 'MAJOR', descriptionId: 'Tegangan grid di atas batas', descriptionEn: 'Grid overvoltage' },
  { code: 'E-103', category: 'GRID', severity: 'MAJOR', descriptionId: 'Tegangan grid di bawah batas', descriptionEn: 'Grid undervoltage' },
  { code: 'E-104', category: 'GRID', severity: 'MAJOR', descriptionId: 'Frekuensi grid di atas batas', descriptionEn: 'Grid overfrequency' },
  { code: 'E-105', category: 'GRID', severity: 'MAJOR', descriptionId: 'Frekuensi grid di bawah batas', descriptionEn: 'Grid underfrequency' },
  { code: 'E-106', category: 'GRID', severity: 'WARNING', descriptionId: 'Ketidakseimbangan fasa', descriptionEn: 'Phase imbalance' },
  { code: 'E-107', category: 'GRID', severity: 'CRITICAL', descriptionId: 'Trip proteksi anti-islanding', descriptionEn: 'Anti-islanding protection trip' },
  { code: 'W-101', category: 'GRID', severity: 'WARNING', descriptionId: 'Fluktuasi tegangan grid', descriptionEn: 'Grid voltage fluctuation' },

  // ── Kategori 2: Inverter ─────────────────────────────────────────
  { code: 'E-201', category: 'INVERTER', severity: 'CRITICAL', descriptionId: 'Over temperature inverter', descriptionEn: 'Inverter overtemperature' },
  { code: 'E-202', category: 'INVERTER', severity: 'CRITICAL', descriptionId: 'Tegangan DC input melebihi batas', descriptionEn: 'Inverter DC overvoltage' },
  { code: 'E-203', category: 'INVERTER', severity: 'CRITICAL', descriptionId: 'Ground fault / isolasi rendah', descriptionEn: 'Inverter ground fault / low insulation' },
  { code: 'E-204', category: 'INVERTER', severity: 'CRITICAL', descriptionId: 'Arc fault terdeteksi', descriptionEn: 'Inverter arc fault detected' },
  { code: 'E-205', category: 'INVERTER', severity: 'CRITICAL', descriptionId: 'Over current pada IGBT', descriptionEn: 'IGBT overcurrent' },
  { code: 'E-206', category: 'INVERTER', severity: 'WARNING', descriptionId: 'Kipas pendingin gagal', descriptionEn: 'Cooling fan failure' },
  { code: 'E-207', category: 'INVERTER', severity: 'WARNING', descriptionId: 'Efisiensi di bawah ambang', descriptionEn: 'Efficiency below threshold' },
  { code: 'E-208', category: 'INVERTER', severity: 'MAJOR', descriptionId: 'Fault internal inverter', descriptionEn: 'Internal inverter fault (generic)' },
  { code: 'W-201', category: 'INVERTER', severity: 'WARNING', descriptionId: 'Suhu inverter tinggi (belum kritis)', descriptionEn: 'Inverter temperature high (not critical)' },
  { code: 'W-202', category: 'INVERTER', severity: 'WARNING', descriptionId: 'Inverter derating (daya diturunkan)', descriptionEn: 'Inverter derated' },

  // ── Kategori 3: PV / DC / String ─────────────────────────────────
  { code: 'E-301', category: 'PV', severity: 'WARNING', descriptionId: 'Arus string rendah (bayangan/kotor)', descriptionEn: 'String current low (shading/soiling)' },
  { code: 'E-302', category: 'PV', severity: 'CRITICAL', descriptionId: 'Reverse current pada string', descriptionEn: 'String reverse current' },
  { code: 'E-303', category: 'PV', severity: 'CRITICAL', descriptionId: 'Resistansi isolasi PV rendah', descriptionEn: 'PV isolation resistance low' },
  { code: 'E-304', category: 'PV', severity: 'MAJOR', descriptionId: 'Fault pada pelacak MPPT', descriptionEn: 'MPPT fault' },
  { code: 'E-305', category: 'PV', severity: 'WARNING', descriptionId: 'Hotspot pada modul PV', descriptionEn: 'PV module hotspot' },
  { code: 'W-301', category: 'PV', severity: 'WARNING', descriptionId: 'Sensor irradiance bermasalah', descriptionEn: 'Irradiance sensor fault' },
  { code: 'W-302', category: 'PV', severity: 'WARNING', descriptionId: 'Ketidakseimbangan antar-string', descriptionEn: 'String imbalance' },

  // ── Kategori 4: Battery / BESS ───────────────────────────────────
  { code: 'E-401', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Komunikasi BMS gagal', descriptionEn: 'BMS communication failure' },
  { code: 'E-402', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Suhu baterai di atas batas', descriptionEn: 'Battery overtemperature' },
  { code: 'E-403', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Suhu baterai di bawah batas', descriptionEn: 'Battery undertemperature' },
  { code: 'E-404', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Tegangan sel melebihi batas', descriptionEn: 'Cell overvoltage' },
  { code: 'E-405', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Tegangan sel di bawah batas', descriptionEn: 'Cell undervoltage' },
  { code: 'E-406', category: 'BATTERY', severity: 'MAJOR', descriptionId: 'Ketidakseimbangan antar-sel', descriptionEn: 'Cell imbalance' },
  { code: 'E-407', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Arus charge/discharge berlebih', descriptionEn: 'Battery overcurrent (charge/discharge)' },
  { code: 'E-408', category: 'BATTERY', severity: 'MAJOR', descriptionId: 'State of charge di luar rentang aman', descriptionEn: 'State of charge out of safe range' },
  { code: 'E-409', category: 'BATTERY', severity: 'CRITICAL', descriptionId: 'Risiko thermal runaway', descriptionEn: 'Thermal runaway risk' },
  { code: 'W-401', category: 'BATTERY', severity: 'WARNING', descriptionId: 'Suhu baterai tinggi (belum kritis)', descriptionEn: 'Battery temperature high (not critical)' },
  { code: 'W-402', category: 'BATTERY', severity: 'WARNING', descriptionId: 'State of health rendah', descriptionEn: 'Battery state of health low' },

  // ── Kategori 5: Sensor / Meter ───────────────────────────────────
  { code: 'E-501', category: 'SENSOR', severity: 'MAJOR', descriptionId: 'Komunikasi smart meter gagal', descriptionEn: 'Smart meter communication failure' },
  { code: 'E-502', category: 'SENSOR', severity: 'MAJOR', descriptionId: 'Sensor rusak (arus/tegangan/suhu)', descriptionEn: 'Sensor failure (current/voltage/temperature)' },
  { code: 'E-503', category: 'SENSOR', severity: 'WARNING', descriptionId: 'Kalibrasi melenceng jauh', descriptionEn: 'Calibration drift' },
  { code: 'E-504', category: 'SENSOR', severity: 'MAJOR', descriptionId: 'Nilai pengukuran di luar rentang fisik', descriptionEn: 'Measurement out of physical range' },
  { code: 'W-501', category: 'SENSOR', severity: 'WARNING', descriptionId: 'Akurasi sensor menurun', descriptionEn: 'Sensor accuracy degraded' },

  // ── Kategori 6: Lingkungan / Fisik ───────────────────────────────
  { code: 'E-601', category: 'ENVIRONMENT', severity: 'WARNING', descriptionId: 'Suhu kabinet berlebih', descriptionEn: 'Cabinet overtemperature' },
  { code: 'E-602', category: 'ENVIRONMENT', severity: 'WARNING', descriptionId: 'Kelembapan berlebih', descriptionEn: 'High humidity' },
  { code: 'E-603', category: 'ENVIRONMENT', severity: 'MAJOR', descriptionId: 'Deteksi pembukaan panel / intrusi', descriptionEn: 'Panel open / intrusion detected' },
  { code: 'W-601', category: 'ENVIRONMENT', severity: 'WARNING', descriptionId: 'Suhu lingkungan tinggi', descriptionEn: 'High ambient temperature' },

  // ── Kategori 9: Passthrough vendor ───────────────────────────────
  { code: 'E-901', category: 'VENDOR', severity: 'CRITICAL', descriptionId: 'Fault vendor (kode asli disimpan terpisah)', descriptionEn: 'Vendor fault (raw code kept separately)' },
  { code: 'W-901', category: 'VENDOR', severity: 'WARNING', descriptionId: 'Warning vendor (kode asli disimpan terpisah)', descriptionEn: 'Vendor warning (raw code kept separately)' },

  // ── Legacy (kode lama dari seed-telemetry.sql, didaftarkan agar tetap ter-resolve) ──
  { code: 'E-341', category: 'VENDOR', severity: 'MAJOR', descriptionId: 'Alarm vendor (kode legacy E-341)', descriptionEn: 'Vendor alarm (legacy code E-341)' },
  { code: 'E-392', category: 'VENDOR', severity: 'MAJOR', descriptionId: 'Alarm vendor (kode legacy E-392)', descriptionEn: 'Vendor alarm (legacy code E-392)' },
];

async function seedErrorCodes() {
  let created = 0;
  let updated = 0;

  for (const row of ERROR_CODES) {
    const exists = await prisma.errorCode.findUnique({ where: { code: row.code } });
    if (exists) {
      await prisma.errorCode.update({
        where: { code: row.code },
        data: {
          category: row.category,
          severity: row.severity,
          descriptionId: row.descriptionId,
          descriptionEn: row.descriptionEn,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.errorCode.create({ data: row });
      created++;
    }
  }

  return { created, updated };
}

module.exports = { seedErrorCodes };

// Allow direct execution: node src/seeders/error-codes.seeder.js
if (require.main === module) {
  seedErrorCodes()
    .then(({ created, updated }) => {
      console.log(`✅ Error codes seeded: ${created} created, ${updated} updated (total ${ERROR_CODES.length})`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ Error codes seeding failed:', e);
      process.exit(1);
    });
}
