#!/usr/bin/env python3
"""
Historical Telemetry Data Generator
Generates simulated telemetry data for 55 devices from July 1 to August 20, 2026.
Writes directly to InfluxDB for processing by the daily aggregation worker.
"""
import sys
import os

os.chdir('/opt/energy/applications/gateway/mqtt-client')
from dotenv import load_dotenv
load_dotenv()

# --- InfluxDB Config ---
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime, timedelta, timezone
import random
import logging

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# --- InfluxDB Setup ---
INFLUX_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUX_TOKEN = os.getenv('INFLUXDB_TOKEN')
INFLUX_ORG = os.getenv('INFLUXDB_ORG', 'energy_platform')
INFLUX_BUCKET = os.getenv('INFLUXDB_BUCKET', 'telemetry')

logger.info(f"Config: URL={INFLUX_URL}, Bucket={INFLUX_BUCKET}, Org={INFLUX_ORG}")

# --- Device Configurations (imported from simulator) ---
from inverter_simulator import DEVICE_CONFIGS

logger.info(f"Loaded {len(DEVICE_CONFIGS)} device configurations.")
# Filter only ONLINE devices
ONLINE_DEVICES = {k: v for k, v in DEVICE_CONFIGS.items()}  # All 55 for full simulation

# --- Site Timezone Offsets (from simulator) ---
SITE_TZ_OFFSET = {
    'Jakarta Plant A': 7, 'Jakarta Plant B': 7, 'Bandung Plant A': 7, 'Bandung Plant B': 7,
    'Semarang Plant A': 7, 'Medan Plant A': 7, 'Medan Plant B': 7, 'Padang Plant A': 7,
    'Pekanbaru Plant A': 7, 'Surabaya Plant A': 7, 'Surabaya Plant B': 7,
    'Bali Plant A': 8, 'Bali Plant B': 8, 'Bandung Plant C': 7, 'Jakarta Plant C': 7,
    'Jakarta Plant D': 7, 'Semarang Plant B': 7, 'Semarang Plant C': 7, 'Surabaya Plant C': 7,
}

# --- Measurement Map (matching aggregator-worker) ---
MEASUREMENT_MAP = {
    'p_active': 'power', 'p_reactive': 'power', 'p_apparent': 'power',
    'p_active_a': 'power', 'p_active_b': 'power', 'p_active_c': 'power',
    'p_export': 'power', 'p_import': 'power',
    'p_pv1': 'power', 'p_pv2': 'power', 'p_pv3': 'power', 'p_pv4': 'power',
    'p_battery_charge': 'power', 'p_battery_discharge': 'power',
    'p_load': 'power',
    'v_dc': 'voltage', 'v_dc1': 'voltage', 'v_dc2': 'voltage',
    'v_dc3': 'voltage', 'v_dc4': 'voltage',
    'v_ac': 'voltage', 'v_ab': 'voltage', 'v_bc': 'voltage', 'v_ca': 'voltage',
    'v_an': 'voltage', 'v_bn': 'voltage', 'v_cn': 'voltage',
    'v_battery': 'voltage', 'v_grid': 'voltage',
    'c_dc': 'current', 'c_dc1': 'current', 'c_dc2': 'current',
    'c_dc3': 'current', 'c_dc4': 'current',
    'c_ac': 'current', 'c_a': 'current', 'c_b': 'current', 'c_c': 'current',
    'c_battery': 'current',
    'e_daily': 'energy', 'e_total': 'energy',
    'e_daily_export': 'energy', 'e_total_export': 'energy',
    'e_daily_import': 'energy', 'e_total_import': 'energy',
    'e_daily_charge': 'energy', 'e_daily_discharge': 'energy',
    'e_total_charge': 'energy', 'e_total_discharge': 'energy',
    'e_daily_load': 'energy', 'e_total_load': 'energy',
    'e_monthly': 'energy', 'e_yearly': 'energy',
    'f_grid': 'frequency', 'f_ac': 'frequency',
    't_env': 'temperature', 't_inverter': 'temperature',
    't_battery': 'temperature', 't_pv': 'temperature',
    't_heatsink': 'temperature', 't_boost': 'temperature',
    't_cabinet': 'temperature',
    'i_poa': 'irradiance', 'i_ghi': 'irradiance', 'i_dni': 'irradiance',
    'b_soc': 'battery', 'b_soh': 'battery', 'b_capacity': 'battery',
    'b_charge': 'battery', 'b_discharge': 'battery',
    'b_voltage': 'battery', 'b_current': 'battery', 'b_temp': 'battery',
    'cos_phi': 'others', 'thd_v': 'others', 'thd_c': 'others', 'efficiency': 'others',
}

# --- Inverter Simulator Class ---
class InverterSimulator:
    """Simulasi inverter dengan data yang realistis berbasis UTC Timestamp"""
    
    def __init__(self, device_id):
        if device_id not in DEVICE_CONFIGS:
            raise ValueError(f"Unknown device_id: {device_id}")
        
        config = DEVICE_CONFIGS[device_id]
        self.device_id = device_id
        self.tenant = config['tenant']
        self.site = config['site']
        self.serial = config['serial']
        self.model = config['model']
        self.brand = config['brand']
        self.type = config['type']

        # Base values with realistic ranges
        self.base_power = random.uniform(3000, 7000)  # Watts
        self.base_voltage = 220 + random.uniform(-10, 10)
        self.base_current = self.base_power / self.base_voltage

        # Energy counters
        self.total_energy = random.uniform(10000, 50000)
        self.daily_energy = 0

        # Timezone offset per site
        self.tz_offset_hours = SITE_TZ_OFFSET.get(self.site, 7)
        
        # Status
        self.status = "ONLINE"
        self.fault_code = None

        # Solar irradiance pattern (6 AM - 6 PM local time)
        self.sunrise = 6
        self.sunset = 18

    def get_solar_factor(self, local_time):
        """Calculate solar irradiance factor based on local time of day"""
        hour = local_time.hour + local_time.minute / 60.0

        if hour < self.sunrise or hour > self.sunset:
            return 0.0

        # Peak at noon (12 PM)
        peak_hour = 12.0
        factor = 1.0 - abs(hour - peak_hour) / (self.sunset - self.sunrise)
        factor = max(0, min(1, factor))

        # Cloud randomness
        factor *= random.uniform(0.7, 1.0)

        return factor

    def generate_telemetry(self, utc_time):
        """Generate realistic telemetry data with specific UTC timestamp"""
        now_utc = utc_time
        now_local = now_utc + timedelta(hours=self.tz_offset_hours)

        # Reset daily energy at local midnight
        if not hasattr(self, 'last_local_date') or now_local.date() != self.last_local_date:
            self.daily_energy = 0
            self.last_local_date = now_local.date()

        solar_factor = self.get_solar_factor(now_local)

        # Power varies with solar irradiance
        power = self.base_power * solar_factor * random.uniform(0.85, 1.15)
        power = max(0, power)

        # Update energy counters
        energy_increment = power * 5 / 60 / 1000  # kWh per interval (5 min)
        self.daily_energy += energy_increment
        self.total_energy += energy_increment

        # Voltage and current
        voltage = self.base_voltage * (1 + random.uniform(-0.02, 0.02))
        current = power / voltage if voltage > 0 else 0

        # Temperature
        ambient_temp = 25 + solar_factor * 10 + random.uniform(-2, 2)
        inverter_temp = ambient_temp + 15 + random.uniform(-5, 5)

        # Battery SOC
        battery_soc = 40 + solar_factor * 50 + random.uniform(-5, 5)
        battery_soc = max(10, min(99, battery_soc))

        # Statuses
        grid_status = "CONNECTED" if random.random() > 0.05 else "DISCONNECTED"

        status_roll = random.random()
        if status_roll < 0.95:
            device_status = "ONLINE"
            fault = None
        elif status_roll < 0.98:
            device_status = "WARNING"
            fault = "W-201" if random.random() > 0.5 else "W-202"
        else:
            device_status = "FAULT"
            fault = "E-208" if random.random() > 0.5 else "E-201"

        # ISO 8601 UTC String
        utc_timestamp_str = now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

        return {
            "deviceId": self.device_id,
            "serialNumber": self.serial,
            "model": self.model,
            "brand": self.brand,
            "deviceType": self.type,
            "tenant": self.tenant,
            "site": self.site,
            "timestamp": utc_timestamp_str,
            "data": {
                # Power
                "p_active": round(power, 2),
                "p_reactive": round(power * 0.05 * random.uniform(0.5, 1.5), 2),
                "p_apparent": round(power * 1.01, 2),
                "p_export": round(power * random.uniform(0.3, 0.7), 2),
                "p_import": round(power * random.uniform(0.0, 0.2), 2),
                "p_load": round(power * random.uniform(0.5, 0.9), 2),

                # Voltage
                "v_ac": round(voltage, 2),
                "v_dc": round(voltage * 1.5 * random.uniform(0.9, 1.1), 2),

                # Current
                "c_ac": round(current, 2),
                "c_dc": round(current * 1.2, 2),

                # Energy
                "e_daily": round(self.daily_energy, 2),
                "e_total": round(self.total_energy, 2),
                "e_daily_export": round(self.daily_energy * random.uniform(0.3, 0.6), 2),
                "e_daily_load": round(self.daily_energy * random.uniform(0.4, 0.8), 2),

                # Frequency
                "f_grid": round(50 + random.uniform(-0.1, 0.1), 3),

                # Temperature
                "t_inverter": round(inverter_temp, 1),
                "t_env": round(ambient_temp, 1),

                # Battery
                "b_soc": round(battery_soc, 1),
                "b_soh": round(85 + random.uniform(0, 15), 1),
                "b_voltage": round(48 + random.uniform(-2, 2), 2),
                "b_temp": round(ambient_temp + 5, 1),

                # Status
                "s_device": device_status,
                "s_grid": grid_status,
                "s_battery": "CHARGING" if solar_factor > 0.3 else "IDLE",
                "s_alarm": fault or "NONE",

                # Others
                "efficiency": round(94 + random.uniform(0, 5), 1),
                "cos_phi": round(0.85 + random.uniform(0, 0.1), 3)
            },
            "quality": "GOOD" if device_status == "ONLINE" else "WARNING"
        }

# --- Write to InfluxDB ---
def write_telemetry_to_influxdb(write_api, telemetry):
    """Write telemetry data to InfluxDB"""
    try:
        device_id = telemetry.get('deviceId', 'unknown')
        telemetry_data = telemetry.get('data', {})
        
        # Parse timestamp
        dt = datetime.fromisoformat(telemetry['timestamp'].replace('Z', '+00:00'))
        
        # Tags
        tags = {
            'device_id': device_id,
            'tenant': telemetry.get('tenant', 'unknown'),
            'site': telemetry.get('site', 'unknown'),
            'model': telemetry.get('model', 'unknown'),
            'serial': telemetry.get('serialNumber', 'unknown'),
        }

        # Group fields by measurement
        measurements = {}
        for key, value in telemetry_data.items():
            if key.startswith('s_'):
                continue
            measurement = MEASUREMENT_MAP.get(key, 'unknown')
            if measurement not in measurements:
                measurements[measurement] = {}
            try:
                measurements[measurement][key] = float(value)
            except (ValueError, TypeError):
                measurements[measurement][key] = value

        # Write each measurement
        for measurement, fields in measurements.items():
            if not fields:
                continue
            point = Point(measurement)
            for tag_key, tag_value in tags.items():
                point.tag(tag_key, tag_value)
            for field_key, field_value in fields.items():
                if isinstance(field_value, (int, float)):
                    point.field(field_key, field_value)
                else:
                    point.field(field_key, str(field_value))
            point.time(dt)
            write_api.write(bucket=INFLUX_BUCKET, record=point)

        return True
    except Exception as e:
        logger.error(f"Error writing to InfluxDB for {telemetry.get('deviceId')}: {e}")
        return False

# --- Main Generation Function ---
async def generate_historical_data():
    """Generate historical data for all devices"""
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN or "", org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)
    
    # Date range: July 22 to August 20, 2026 (within 30-day retention policy)
    # Retention policy: 30 days (720h0m0s), so data must be < 30 days old
    start_date = datetime(2026, 7, 22, 0, 0, 0, tzinfo=timezone.utc)  # Adjusted to fit retention
    end_date = datetime(2026, 8, 20, 23, 59, 59, tzinfo=timezone.utc)
    
    logger.info(f"Generating historical data from {start_date.date()} to {end_date.date()}")
    logger.info(f"Total devices: {len(ONLINE_DEVICES)}")
    
    # Create simulators
    simulators = {dev_id: InverterSimulator(dev_id) for dev_id in ONLINE_DEVICES}
    
    # Generate data at 5-minute intervals
    interval = timedelta(minutes=5)
    current_time = start_date
    total_points = 0
    
    while current_time <= end_date:
        for device_id, simulator in simulators.items():
            telemetry = simulator.generate_telemetry(current_time)
            if write_telemetry_to_influxdb(write_api, telemetry):
                total_points += 1
        
        if current_time.hour == 0 and current_time.minute == 0:
            logger.info(f"Progress: {current_time.date()} - {total_points} points written so far")
        
        current_time += interval
    
    logger.info(f"Completed! Total points written: {total_points}")
    write_api.close()
    client.close()
    return total_points

if __name__ == "__main__":
    import asyncio
    asyncio.run(generate_historical_data())
