// services/telemetry-query.service.js
const { InfluxDB } = require('@influxdata/influxdb-client');

class TelemetryQuery {
  constructor() {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN;
    const org = process.env.INFLUXDB_ORG || 'energy_platform';

    this.influxDB = new InfluxDB({ url, token });
    this.queryApi = this.influxDB.getQueryApi(org);
    this.bucket = process.env.INFLUXDB_BUCKET || 'telemetry';
  }

  /**
   * Build a query that filters by serial number (maps PostgreSQL device UUID to InfluxDB serial)
   * @param {string} serialNumber - Device serial number from PostgreSQL
   */
  buildSerialFilter(serialNumber) {
    return `|> filter(fn: (r) => r.serial == "${serialNumber}")`;
  }

  /**
   * Build a query that filters by device_id (legacy, kept for compatibility)
   * @param {string} deviceId - Device UUID (may not match InfluxDB device_id)
   */
  buildDeviceIdFilter(deviceId) {
    return `|> filter(fn: (r) => r.device_id == "${deviceId}")`;
  }

  async getLatestVoltage(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "voltage")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  async getLatestCurrent(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "current")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  async getLatestTemperature(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "temperature")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  async getLatestFrequency(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "frequency")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  async getLatestOthers(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "others")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  async getLatestBattery(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "battery")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;
    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  /**
   * Get latest power data for a device
   */
  async getLatestPower(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "power")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;

    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  /**
   * Get energy data for a device
   */
  async getEnergyData(serialNumber, deviceId, start, stop) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "energy")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> filter(fn: (r) => r._field =~ /e_.*/)
        |> last()
    `;

    const result = await this.queryApi.collectRows(query);
    return this.formatResult(result);
  }

  /**
   * Get time series data for chart
   */
  async getTimeSeries(serialNumber, deviceId, field, start, stop, interval = '5m') {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "power")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> filter(fn: (r) => r._field == "${field}")
        |> aggregateWindow(every: ${interval}, fn: mean)
    `;

    const result = await this.queryApi.collectRows(query);
    return result.map(row => ({
      time: row._time,
      value: row._value
    }));
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(serialNumber, deviceId) {
    const fields = ['p_active', 'p_load', 'p_export', 'p_import', 'e_daily'];
    const results = {};

    for (const field of fields) {
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "power" or r._measurement == "energy")
          ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
          |> filter(fn: (r) => r._field == "${field}")
          |> last()
      `;
      const result = await this.queryApi.collectRows(query);
      results[field] = result[0]?._value || 0;
    }

    return results;
  }

  /**
   * Get status data
   */
  async getDeviceStatus(serialNumber, deviceId) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "status")
        ${serialNumber ? this.buildSerialFilter(serialNumber) : this.buildDeviceIdFilter(deviceId)}
        |> last()
    `;

    const result = await this.queryApi.collectRows(query);
    return this.formatStatusResult(result);
  }

  formatResult(rows) {
    const result = {};
    for (const row of rows) {
      result[row._field] = row._value;
    }
    return result;
  }

  formatStatusResult(rows) {
    const status = {};
    for (const row of rows) {
      status[row._field] = row._value;
    }
    return status;
  }

  /**
   * Get recent telemetry data from InfluxDB with filters
   * Replaces PostgreSQL tbl_telemetry_data query for real-time dashboard
   */
  async getRecentTelemetry({ deviceId, serialNumber, standardKey, startDate, endDate, limit = 10000 }) {
    // Build measurement filter based on standardKey prefix
    // Mapping: b_ -> battery, c_ -> current, e_ -> energy, f_ -> frequency, 
    // i_ -> irradiance, p_ -> power, s_ -> status, t_ -> temperature, v_ -> voltage
    let measurementFilter = '';
    if (standardKey) {
      const prefix = standardKey.substring(0, 2);
      const measurementMap = {
        'b_': 'battery',
        'c_': 'current',
        'e_': 'energy',
        'f_': 'frequency',
        'i_': 'irradiance',
        'p_': 'power',
        's_': 'status',
        't_': 'temperature',
        'v_': 'voltage'
      };
      const measurement = measurementMap[prefix];
      if (measurement) {
        measurementFilter = `|> filter(fn: (r) => r._measurement == "${measurement}")`;
      }
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startDate || '-1h'}, stop: ${endDate || 'now()'})
        ${serialNumber ? this.buildSerialFilter(serialNumber) : (deviceId ? this.buildDeviceIdFilter(deviceId) : '')}
        ${measurementFilter}
        ${standardKey ? `|> filter(fn: (r) => r._field == "${standardKey}")` : ''}
        |> sort(columns: ["_time"], desc: false)
        |> limit(n: ${limit})
    `;

    const result = await this.queryApi.collectRows(query);
    
    // Format to match expected structure: { timestamp, deviceId, standardKey, value, quality }
    return result.map(row => ({
      timestamp: row._time,
      deviceId: row.device_id,
      standardKey: row._field,
      value: row._value,
      quality: 'GOOD', // InfluxDB doesn't store quality, assume GOOD
    }));
  }
}

module.exports = TelemetryQuery;
