const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAggregatesSQL() {
  console.log('📊 Generating aggregates using SQL...\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // 1. Generate hourly aggregates
    console.log('⏳ Generating hourly aggregates...');
    await prisma.$executeRaw`
      INSERT INTO tbl_telemetry_aggregates (id, device_id, standard_key, period, min_value, max_value, avg_value, sum_value, count, period_start, period_end, created_at)
      SELECT 
        gen_random_uuid(),
        device_id,
        standard_key,
        'hourly' as period,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(value) as avg_value,
        SUM(value) as sum_value,
        COUNT(*) as count,
        DATE_TRUNC('hour', timestamp) as period_start,
        DATE_TRUNC('hour', timestamp) + INTERVAL '1 hour' - INTERVAL '1 microsecond' as period_end,
        NOW() as created_at
      FROM tbl_telemetry_data
      WHERE standard_key IN ('p_active', 'p_reactive', 'p_apparent', 'p_load', 'p_export', 'p_import')
      GROUP BY device_id, standard_key, DATE_TRUNC('hour', timestamp)
      ON CONFLICT (device_id, standard_key, period, period_start) DO UPDATE SET
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        avg_value = EXCLUDED.avg_value,
        sum_value = EXCLUDED.sum_value,
        count = EXCLUDED.count,
        period_end = EXCLUDED.period_end;
    `;
    console.log('✅ Hourly aggregates done');

    // 2. Generate daily aggregates
    console.log('⏳ Generating daily aggregates...');
    await prisma.$executeRaw`
      INSERT INTO tbl_telemetry_aggregates (id, device_id, standard_key, period, min_value, max_value, avg_value, sum_value, count, period_start, period_end, created_at)
      SELECT 
        gen_random_uuid(),
        device_id,
        standard_key,
        'daily' as period,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(value) as avg_value,
        SUM(value) as sum_value,
        COUNT(*) as count,
        DATE_TRUNC('day', timestamp) as period_start,
        DATE_TRUNC('day', timestamp) + INTERVAL '1 day' - INTERVAL '1 microsecond' as period_end,
        NOW() as created_at
      FROM tbl_telemetry_data
      WHERE standard_key IN ('p_active', 'p_reactive', 'p_apparent', 'p_load', 'p_export', 'p_import')
      GROUP BY device_id, standard_key, DATE_TRUNC('day', timestamp)
      ON CONFLICT (device_id, standard_key, period, period_start) DO UPDATE SET
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        avg_value = EXCLUDED.avg_value,
        sum_value = EXCLUDED.sum_value,
        count = EXCLUDED.count,
        period_end = EXCLUDED.period_end;
    `;
    console.log('✅ Daily aggregates done');

    // 3. Generate monthly aggregates
    console.log('⏳ Generating monthly aggregates...');
    await prisma.$executeRaw`
      INSERT INTO tbl_telemetry_aggregates (id, device_id, standard_key, period, min_value, max_value, avg_value, sum_value, count, period_start, period_end, created_at)
      SELECT 
        gen_random_uuid(),
        device_id,
        standard_key,
        'monthly' as period,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(value) as avg_value,
        SUM(value) as sum_value,
        COUNT(*) as count,
        DATE_TRUNC('month', timestamp) as period_start,
        DATE_TRUNC('month', timestamp) + INTERVAL '1 month' - INTERVAL '1 microsecond' as period_end,
        NOW() as created_at
      FROM tbl_telemetry_data
      WHERE standard_key IN ('p_active', 'p_reactive', 'p_apparent', 'p_load', 'p_export', 'p_import')
      GROUP BY device_id, standard_key, DATE_TRUNC('month', timestamp)
      ON CONFLICT (device_id, standard_key, period, period_start) DO UPDATE SET
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        avg_value = EXCLUDED.avg_value,
        sum_value = EXCLUDED.sum_value,
        count = EXCLUDED.count,
        period_end = EXCLUDED.period_end;
    `;
    console.log('✅ Monthly aggregates done');

    console.log('\n🎉 All aggregates generated successfully!');

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
generateAggregatesSQL();
