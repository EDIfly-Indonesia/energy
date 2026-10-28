const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

async function seedMaster() {
  console.log('🌱 Starting Clean Master Seeding...\n');

  try {
    // ============================================
    // 0. TRUNCATE ALL TABLES (Clean Slate)
    // ============================================
    console.log('🗑️ Cleaning database...');
    const tabels = [
      'tbl_telemetry_aggregates',
      'tbl_telemetry_data',
      'tbl_daily_summary',
      'tbl_alarms',
      'tbl_devices',
      'tbl_gateways',
      'tbl_sites',
      'tbl_companies',
      'tbl_users',
      'tbl_roles',
      'tbl_permission',
      'tbl_user_permission',
      'tbl_device_brands',
      'tbl_device_types',
      'telemetry_vendor_mappings',
      'tbl_tenants'
    ];
    
    for (const table of tabels) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    console.log('  ✅ Database cleaned.\n');

    // ============================================
    // 1. SEED ROLES
    // ============================================
    console.log('📋 Seeding roles...');
    const roles = [
      { name: 'super_admin', description: 'Super Administrator' },
      { name: 'admin', description: 'Administrator' },
      { name: 'tenant_admin', description: 'Tenant Administrator' },
      { name: 'tenant_user', description: 'Tenant User' }
    ];
    const roleMap = {};
    for (const r of roles) {
      const created = await prisma.role.create({ data: r });
      roleMap[created.name] = created.id;
    }

    // ============================================
    // 2. SEED DEVICE BRANDS & TYPES
    // ============================================
    const brandNames = ['Sungrow', 'Huawei', 'Goodwe', 'Growatt', 'SMA', 'ABB', 'Schneider Electric', 'Solis', 'Fronius', 'Delta'];
    const brandMap = {};
    for (const name of brandNames) {
      const b = await prisma.deviceBrand.create({ data: { name } });
      brandMap[name] = b.id;
    }

    const typeNames = ['Inverter', 'Battery', 'Smart Meter', 'Data Logger', 'Gateway', 'Solar Panel', 'Optimizer', 'Charge Controller'];
    const typeMap = {};
    for (const name of typeNames) {
      const t = await prisma.deviceType.create({ data: { name } });
      typeMap[name] = t.id;
    }

    // ============================================
    // 3. SEED TENANTS & COMPANIES
    // ============================================
    const tenants = [
      { name: 'PT Telkom', type: 'ENTERPRISE' },
      { name: 'PT Indosat', type: 'ENTERPRISE' },
      { name: 'PT Mitratel', type: 'ENTERPRISE' },
      { name: 'PT Charoen Pokphand', type: 'ENTERPRISE' },
      { name: 'PLN', type: 'GOVERNMENT' }
    ];
    const tenantMap = {};
    for (const t of tenants) {
      const created = await prisma.tenant.create({ data: t });
      tenantMap[created.name] = created.id;
    }

    const companyNames = ['Telkom Energy', 'Telkom Power', 'Indosat Energy', 'Indosat Power', 'Indosat Renewables', 'Mitratel Energy', 'CP Power'];
    const companyMap = {};
    for (const name of companyNames) {
      const c = await prisma.company.create({ data: { name } });
      companyMap[name] = c.id;
    }

    // ============================================
    // 4. SEED SITES (ACCURATE COORDINATES)
    // ============================================
    console.log('📍 Seeding sites with accurate coordinates...');
    const sitesData = [
      { name: 'Bali Plant A', lat: -8.4095, lng: 115.1889, tenant: 'PT Indosat' },
      { name: 'Bali Plant B', lat: -8.4095, lng: 115.1889, tenant: 'PT Indosat' },
      { name: 'Bandung Plant A', lat: -6.9175, lng: 107.6191, tenant: 'PT Telkom' },
      { name: 'Bandung Plant B', lat: -6.9175, lng: 107.6191, tenant: 'PT Telkom' },
      { name: 'Bandung Plant C', lat: -6.9175, lng: 107.6191, tenant: 'PT Indosat' },
      { name: 'Jakarta Plant A', lat: -6.2088, lng: 106.8456, tenant: 'PT Telkom' },
      { name: 'Jakarta Plant B', lat: -6.2088, lng: 106.8456, tenant: 'PT Telkom' },
      { name: 'Jakarta Plant C', lat: -6.2088, lng: 106.8456, tenant: 'PT Indosat' },
      { name: 'Jakarta Plant D', lat: -6.2088, lng: 106.8456, tenant: 'PT Mitratel' },
      { name: 'Medan Plant A', lat: 3.595, lng: 98.672, tenant: 'PT Indosat' },
      { name: 'Medan Plant B', lat: 3.595, lng: 98.672, tenant: 'PT Indosat' },
      { name: 'Padang Plant A', lat: -0.95, lng: 100.35, tenant: 'PT Indosat' },
      { name: 'Pekanbaru Plant A', lat: 0.507, lng: 101.447, tenant: 'PT Indosat' },
      { name: 'Semarang Plant A', lat: -7.0333, lng: 110.4333, tenant: 'PT Telkom' },
      { name: 'Semarang Plant B', lat: -7.0333, lng: 110.4333, tenant: 'PT Mitratel' },
      { name: 'Semarang Plant C', lat: -7.0333, lng: 110.4333, tenant: 'PT Charoen Pokphand' },
      { name: 'Surabaya Plant A', lat: -7.257, lng: 112.752, tenant: 'PT Indosat' },
      { name: 'Surabaya Plant B', lat: -7.257, lng: 112.752, tenant: 'PT Indosat' },
      { name: 'Surabaya Plant C', lat: -7.257, lng: 112.752, tenant: 'PT Charoen Pokphand' }
    ];

    const siteMap = {};
    for (const s of sitesData) {
      const created = await prisma.site.create({
        data: {
          name: s.name,
          latitude: s.lat,
          longitude: s.lng,
          tenantId: tenantMap[s.tenant],
          capacityKwp: 100.0
        }
      });
      siteMap[s.name] = created.id;
    }

    // ============================================
    // 5. SEED DEVICES (55 DEVICES)
    // ============================================
    console.log('🔌 Seeding 55 devices...');
    const siteNames = Object.keys(siteMap);
    const brands = Object.keys(brandMap);
    const types = Object.keys(typeMap);

    for (let i = 1; i <= 55; i++) {
      const serialNumber = `SN-${String(i).padStart(6, '0')}`;
      const siteName = siteNames[i % siteNames.length];
      const brandName = brands[i % brands.length];
      const typeName = types[i % types.length];

      await prisma.device.create({
        data: {
          serialNumber,
          modelName: `${brandName} ${typeName} Gen ${i}`,
          status: i % 5 === 0 ? 'OFFLINE' : 'ONLINE',
          siteId: siteMap[siteName],
          brandId: brandMap[brandName],
          typeId: typeMap[typeName]
        }
      });
    }

    // ============================================
    // 6. SEED USERS
    // ============================================
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@plts.com',
        passwordHash: hashedPassword,
        roleId: roleMap['super_admin'],
        // Super admin bersifat platform-wide: TIDAK terikat tenant/company.
        tenantId: null,
        companyId: null,
        isActive: true
      }
    });

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMaster();
