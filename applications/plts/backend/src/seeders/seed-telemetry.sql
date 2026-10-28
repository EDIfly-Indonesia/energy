-- ============================================================
-- TELEMETRY ENERGY SEEDER - BASED ON BENCHMARK
-- ============================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_energy_value(text, timestamp, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_device_energy(uuid, timestamp, timestamp, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_all_energy(timestamp, timestamp, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_dashboard_summary(date) CASCADE;

-- ============================================================
-- PART 1: Generate Energy Values
-- ============================================================

CREATE OR REPLACE FUNCTION generate_energy_value(
  key_name TEXT,
  ts TIMESTAMP,
  site_idx INTEGER,
  device_idx INTEGER
)
RETURNS FLOAT AS $$
DECLARE
  hour_val INTEGER;
  day_factor FLOAT;
  base_value FLOAT;
  variation FLOAT;
  final_value FLOAT;
  site_capacity FLOAT;
  production_rate FLOAT;
  consumption_rate FLOAT;
  battery_capacity FLOAT;
  rand_val INTEGER;
BEGIN
  hour_val := EXTRACT(HOUR FROM ts);
  day_factor := GREATEST(0, SIN((hour_val - 6) / 12.0 * PI()));
  
  -- Default values
  base_value := 0;
  variation := 0.1;
  
  -- Site capacity (MWp) based on benchmark
  site_capacity := CASE site_idx % 10
    WHEN 0 THEN 4.28   -- Cirata
    WHEN 1 THEN 4.56   -- Kupang
    WHEN 2 THEN 3.98   -- Cilacap
    WHEN 3 THEN 4.12   -- Sumbawa
    WHEN 4 THEN 3.87   -- Bali
    WHEN 5 THEN 4.34   -- Bandung
    WHEN 6 THEN 4.01   -- Rote
    WHEN 7 THEN 3.92   -- Lombok
    WHEN 8 THEN 4.67   -- Sumedang
    WHEN 9 THEN 5.05   -- Flores
    ELSE 4.0
  END;
  
  -- Production rate: 90% - 98%
  production_rate := 0.90 + (random() * 0.08);
  
  -- Consumption rate: 65% - 85% of production
  consumption_rate := 0.65 + (random() * 0.20);
  
  -- Battery capacity: 90% - 99%
  battery_capacity := 0.90 + (random() * 0.09);
  
  -- Determine value based on key
  IF key_name = 'p_active' THEN
    -- Energy Production: 72kWh per site with 90-98% efficiency
    base_value := 72 * production_rate * day_factor;
    base_value := base_value * (0.8 + (device_idx % 5) * 0.05);
    variation := 0.08;
    
  ELSIF key_name = 'p_load' THEN
    -- Energy Consumption: 65-85% of production
    base_value := 72 * production_rate * consumption_rate * day_factor;
    base_value := base_value * (0.8 + (device_idx % 5) * 0.05);
    variation := 0.10;
    
  ELSIF key_name = 'p_export' THEN
    -- Grid Export: excess production (30-50% of production)
    base_value := 72 * production_rate * day_factor * (0.30 + random() * 0.20);
    base_value := base_value * (0.8 + (device_idx % 5) * 0.05);
    variation := 0.12;
    
  ELSIF key_name = 'p_import' THEN
    -- Grid Import: when production < consumption (5-15% of consumption)
    base_value := 72 * production_rate * consumption_rate * day_factor * (0.05 + random() * 0.10);
    base_value := base_value * (0.8 + (device_idx % 5) * 0.05);
    variation := 0.15;
    
  ELSIF key_name = 'b_soc' THEN
    -- Battery SOC: 90-99% capacity
    base_value := battery_capacity * 100;
    base_value := base_value + (day_factor * 5);
    base_value := GREATEST(10, LEAST(99, base_value));
    variation := 0.03;
    
  ELSIF key_name = 'b_soh' THEN
    -- Battery SOH: 90-99%
    base_value := 90 + (random() * 9);
    variation := 0.02;
    
  ELSIF key_name = 'b_voltage' THEN
    -- Battery Voltage: 790-810V
    base_value := 795 + (random() * 10);
    variation := 0.01;
    
  ELSIF key_name = 'b_temp' THEN
    -- Battery Temperature: 28-38°C
    base_value := 28 + (random() * 10);
    variation := 0.05;
    
  ELSIF key_name = 'b_charge' THEN
    -- Charge Power: 45-75kW
    base_value := 45 + (random() * 30);
    base_value := base_value * day_factor;
    variation := 0.10;
    
  ELSIF key_name = 'b_discharge' THEN
    -- Discharge Power: 20-40kW
    base_value := 20 + (random() * 20);
    base_value := base_value * (1 - day_factor * 0.3);
    variation := 0.10;
    
  ELSIF key_name = 'v_ac' THEN
    -- AC Voltage: 390-415V
    base_value := 400 + (random() - 0.5) * 20;
    variation := 0.02;
    
  ELSIF key_name = 'c_ac' THEN
    -- AC Current: 120-160A
    base_value := 130 + (random() * 30);
    base_value := base_value * day_factor;
    variation := 0.05;
    
  ELSIF key_name = 'f_grid' THEN
    -- Grid Frequency: 49.9-50.1 Hz
    base_value := 50 + (random() - 0.5) * 0.2;
    variation := 0.01;
    
  ELSIF key_name = 't_inverter' THEN
    -- Inverter Temperature: 38-58°C
    base_value := 38 + (random() * 20);
    base_value := base_value + (day_factor * 5);
    variation := 0.05;
    
  ELSIF key_name = 'efficiency' THEN
    -- Inverter Efficiency: 94-99%
    base_value := 94 + (random() * 5);
    variation := 0.02;
    
  ELSIF key_name = 's_device' THEN
    -- Device Status: 90% online, 5% warning, 3% fault, 2% offline
    rand_val := floor(random() * 100);
    IF rand_val >= 0 AND rand_val <= 89 THEN
      RETURN 1; -- ONLINE
    ELSIF rand_val >= 90 AND rand_val <= 94 THEN
      RETURN 2; -- WARNING
    ELSIF rand_val >= 95 AND rand_val <= 97 THEN
      RETURN 3; -- FAULT
    ELSE
      RETURN 0; -- OFFLINE
    END IF;
    
  ELSIF key_name = 's_grid' THEN
    -- Grid Status: 95% connected
    rand_val := floor(random() * 100);
    IF rand_val >= 0 AND rand_val <= 94 THEN
      RETURN 1; -- CONNECTED
    ELSE
      RETURN 0; -- DISCONNECTED
    END IF;
    
  ELSIF key_name = 's_battery' THEN
    -- Battery Status: 40% idle, 35% charging, 25% discharging
    rand_val := floor(random() * 100);
    IF rand_val >= 0 AND rand_val <= 39 THEN
      RETURN 0; -- IDLE
    ELSIF rand_val >= 40 AND rand_val <= 74 THEN
      RETURN 1; -- CHARGING
    ELSE
      RETURN 2; -- DISCHARGING
    END IF;
    
  ELSIF key_name = 's_alarm' THEN
    -- Alarm: 5% have alarm
    rand_val := floor(random() * 100);
    IF rand_val >= 0 AND rand_val <= 94 THEN
      RETURN 0; -- NONE
    ELSIF rand_val >= 95 AND rand_val <= 97 THEN
      RETURN 341; -- E-341
    ELSIF rand_val >= 98 AND rand_val <= 99 THEN
      RETURN 392; -- E-392
    ELSE
      RETURN 1; -- E-001
    END IF;
    
  ELSE
    RETURN NULL;
  END IF;
  
  -- Add noise for numeric values
  final_value := base_value + (random() - 0.5) * variation * base_value;
  RETURN ROUND(final_value::numeric, 2)::FLOAT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 2: Generate Device Energy Data
-- ============================================================

CREATE OR REPLACE FUNCTION generate_device_energy(
  p_device_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP,
  p_interval_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
DECLARE
  current_ts TIMESTAMP;
  key_name TEXT;
  val FLOAT;
  total_inserted INTEGER := 0;
  site_idx INTEGER;
  device_idx INTEGER;
  numeric_keys TEXT[] := ARRAY[
    'p_active','p_load','p_export','p_import',
    'v_ac','c_ac','f_grid','t_inverter','efficiency',
    'b_soc','b_soh','b_voltage','b_temp','b_charge','b_discharge',
    's_device','s_grid','s_battery','s_alarm'
  ];
BEGIN
  -- Get site and device index
  SELECT row_number() OVER (ORDER BY site_id) - 1 INTO site_idx 
  FROM tbl_devices WHERE id = p_device_id;
  IF site_idx IS NULL THEN site_idx := 0; END IF;
  
  SELECT row_number() OVER (ORDER BY id) - 1 INTO device_idx 
  FROM tbl_devices WHERE id = p_device_id;
  IF device_idx IS NULL THEN device_idx := 0; END IF;
  
  current_ts := p_start_date;
  
  WHILE current_ts <= p_end_date LOOP
    FOREACH key_name IN ARRAY numeric_keys LOOP
      SELECT generate_energy_value(key_name, current_ts, site_idx, device_idx) INTO val;
      
      IF val IS NOT NULL THEN
        INSERT INTO tbl_telemetry_data (device_id, standard_key, value, quality, timestamp, created_at)
        VALUES (p_device_id, key_name, val, 'GOOD', current_ts, NOW())
        ON CONFLICT (device_id, standard_key, timestamp) DO NOTHING;
        
        IF FOUND THEN
          total_inserted := total_inserted + 1;
        END IF;
      END IF;
    END LOOP;
    
    current_ts := current_ts + (p_interval_minutes || ' minutes')::INTERVAL;
  END LOOP;
  
  RAISE NOTICE '  Generated % records for device %', total_inserted, p_device_id;
  RETURN total_inserted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 3: Generate All Energy Data
-- ============================================================

CREATE OR REPLACE FUNCTION generate_all_energy(
  p_start_date TIMESTAMP DEFAULT '2026-06-01 00:05:00+07',
  p_end_date TIMESTAMP DEFAULT '2026-07-27 23:50:00+07',
  p_interval_minutes INTEGER DEFAULT 15
)
RETURNS VOID AS $$
DECLARE
  device_record RECORD;
  total_devices INTEGER;
  processed INTEGER := 0;
  total_records INTEGER := 0;
  device_records INTEGER;
BEGIN
  RAISE NOTICE '🚀 Starting energy telemetry generation...';
  RAISE NOTICE '  Period: % to %', p_start_date, p_end_date;
  RAISE NOTICE '  Interval: % minutes', p_interval_minutes;
  
  SELECT COUNT(*) INTO total_devices FROM tbl_devices;
  RAISE NOTICE '  Total devices: %', total_devices;
  
  FOR device_record IN SELECT id FROM tbl_devices LOOP
    processed := processed + 1;
    RAISE NOTICE '  [%/%] Processing device: %', processed, total_devices, device_record.id;
    
    SELECT generate_device_energy(
      device_record.id,
      p_start_date,
      p_end_date,
      p_interval_minutes
    ) INTO device_records;
    
    total_records := total_records + device_records;
  END LOOP;
  
  RAISE NOTICE '✅ All devices processed! Total records: %', total_records;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 4: Generate Dashboard Summary (Aggregated Data)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_dashboard_summary(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  site_record RECORD;
  summary_count INTEGER := 0;
BEGIN
  RAISE NOTICE '📊 Generating dashboard summary for %...', p_date;
  
  FOR site_record IN SELECT id FROM tbl_sites LOOP
    INSERT INTO tbl_daily_summary (
      site_id, date, total_production, total_consumption, 
      total_export, total_import, total_storage, 
      peak_power, avg_power, created_at, updated_at
    )
    SELECT 
      site_record.id as site_id,
      DATE(td.timestamp) as date,
      COALESCE(SUM(CASE WHEN td.standard_key = 'p_active' THEN td.value ELSE 0 END), 0) as total_production,
      COALESCE(SUM(CASE WHEN td.standard_key = 'p_load' THEN td.value ELSE 0 END), 0) as total_consumption,
      COALESCE(SUM(CASE WHEN td.standard_key = 'p_export' THEN td.value ELSE 0 END), 0) as total_export,
      COALESCE(SUM(CASE WHEN td.standard_key = 'p_import' THEN td.value ELSE 0 END), 0) as total_import,
      0 as total_storage,
      COALESCE(MAX(CASE WHEN td.standard_key = 'p_active' THEN td.value ELSE 0 END), 0) as peak_power,
      COALESCE(AVG(CASE WHEN td.standard_key = 'p_active' THEN td.value ELSE 0 END), 0) as avg_power,
      NOW() as created_at,
      NOW() as updated_at
    FROM tbl_telemetry_data td
    JOIN tbl_devices d ON d.id = td.device_id
    WHERE d.site_id = site_record.id
      AND td.standard_key IN ('p_active', 'p_load', 'p_export', 'p_import')
      AND DATE(td.timestamp) = p_date
    GROUP BY DATE(td.timestamp)
    ON CONFLICT (site_id, date) DO UPDATE SET
      total_production = EXCLUDED.total_production,
      total_consumption = EXCLUDED.total_consumption,
      total_export = EXCLUDED.total_export,
      total_import = EXCLUDED.total_import,
      peak_power = EXCLUDED.peak_power,
      avg_power = EXCLUDED.avg_power,
      updated_at = NOW();
    
    GET DIAGNOSTICS summary_count = ROW_COUNT;
  END LOOP;
  
  RAISE NOTICE '✅ Dashboard summary generated!';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MAIN EXECUTION
-- ============================================================

DO $$
DECLARE
  start_date TIMESTAMP := '2026-07-28 00:05:00+07';
  end_date TIMESTAMP := '2026-08-02 23:50:00+07';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 STARTING ENERGY TELEMETRY SEEDER';
  RAISE NOTICE '===================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Skenario:';
  RAISE NOTICE '  - Energy production: 72kWh per site (90-98%% efficiency)';
  RAISE NOTICE '  - Energy consumption: 65-85%% of production';
  RAISE NOTICE '  - Battery capacity: 90-99%%';
  RAISE NOTICE '';
  
  -- Generate energy telemetry data
  PERFORM generate_all_energy(start_date, end_date, 15);
  
  -- Generate daily summaries for all dates
  PERFORM generate_dashboard_summary('2026-07-01');
  PERFORM generate_dashboard_summary('2026-07-02');
  PERFORM generate_dashboard_summary('2026-07-03');
  PERFORM generate_dashboard_summary('2026-07-04');
  PERFORM generate_dashboard_summary('2026-07-05');
  PERFORM generate_dashboard_summary('2026-07-06');
  PERFORM generate_dashboard_summary('2026-07-07');
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL DONE!';
  RAISE NOTICE '';
END;
$$;
