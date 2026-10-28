const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Resetting database tables in correct order...\n');

  try {
    // 1. Hapus data telemetry (paling banyak)
    console.log('  Deleting telemetry data...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_telemetry_data CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_telemetry_aggregates CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_daily_summary CASCADE;`;
    console.log('  ✅ Telemetry data cleared');

    // 2. Hapus data alarm & audit
    console.log('  Deleting alarms and audit logs...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_alarms CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_audit_logs CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_notifications CASCADE;`;
    console.log('  ✅ Alarms and logs cleared');

    // 3. Hapus data user & permission
    console.log('  Deleting users and permissions...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_user_permission CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_users CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_roles CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_permission CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_api_tokens CASCADE;`;
    console.log('  ✅ Users and permissions cleared');

    // 4. Hapus data devices & mappings
    console.log('  Deleting devices and mappings...');
    await prisma.$executeRaw`TRUNCATE TABLE telemetry_mappings CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE telemetry_vendor_mappings CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_devices CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_gateways CASCADE;`;
    console.log('  ✅ Devices and mappings cleared');

    // 5. Hapus data sites & companies
    console.log('  Deleting sites and companies...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_sites CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_companies CASCADE;`;
    console.log('  ✅ Sites and companies cleared');

    // 6. Hapus data tenant & vendor
    console.log('  Deleting tenants and vendor auth...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_vendor_auth CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_tenants CASCADE;`;
    console.log('  ✅ Tenants and vendor auth cleared');

    // 7. Hapus data brands & types
    console.log('  Deleting brands and types...');
    await prisma.$executeRaw`TRUNCATE TABLE tbl_device_brands CASCADE;`;
    await prisma.$executeRaw`TRUNCATE TABLE tbl_device_types CASCADE;`;
    console.log('  ✅ Brands and types cleared');

    // 8. Reset sequences (UUID tidak perlu karena menggunakan uuid_generate_v4)
    console.log('  Resetting sequences...');
    // Untuk serial number jika menggunakan sequence
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS tbl_devices_serial_number_seq RESTART WITH 1;`;
    console.log('  ✅ Sequences reset');

    console.log('\n✅ Database reset completed successfully!');
    console.log('⚠️  Note: tbl_rate and tbl_invoices were not cleared (keep as reference)');
    console.log('⚠️  Note: tbl_roles, tbl_permission were not cleared (keep as reference)');

  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run reset
resetDatabase();
