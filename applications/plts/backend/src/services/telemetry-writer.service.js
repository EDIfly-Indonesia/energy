// services/telemetry-writer.service.js
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const telemetryFields = require('../config/telemetry.fields');

class TelemetryWriter {
  constructor() {
    const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    const token = process.env.INFLUXDB_TOKEN;
    const org = process.env.INFLUXDB_ORG || 'energy_platform';

    if (!token) {
      throw new Error('INFLUXDB_TOKEN is required');
    }

    this.influxDB = new InfluxDB({ url, token });
    this.org = org;
    this.bucket = process.env.INFLUXDB_BUCKET || 'telemetry';
    this.writeApi = this.influxDB.getWriteApi(this.org, this.bucket, 'ns');
  }

  /**
   * Generic method to write any measurement data.
   * @param {boolean} doFlush - false saat dipanggil dalam loop (writeTelemetry
   *   melakukan satu flush setelah semua measurement) agar tidak 1 HTTP round-trip
   *   per measurement (memicu heartbeat timeout RabbitMQ saat batch besar).
   */
  async writeMeasurement(measurement, deviceId, data, timestamp = new Date(), doFlush = true) {
    const point = new Point(measurement)
      .tag('device_id', deviceId)
      .tag('site_id', data.site_id || '')
      .tag('tenant_id', data.tenant_id || '')
      .tag('vendor', data.vendor || 'unknown')
      // Tag serial & site penting: telemetry-query.service memfilter
      // r.serial == "SN-..." / r.site untuk data realtime.
      .tag('serial', data._serial || data.serialNumber || data.serial || '')
      .tag('site', data._site || data.site || '')
      .timestamp(timestamp);

    // Get valid fields for this measurement
    const validFields = telemetryFields[measurement]?.fields || [];
    
    // Add fields that exist in data
    for (const field of validFields) {
      if (data[field] !== undefined && data[field] !== null) {
        // Handle status fields as string
        if (measurement === 'status' && field.startsWith('s_')) {
          point.stringField(field, String(data[field]));
        } else {
          point.floatField(field, Number(data[field]));
        }
      }
    }

    this.writeApi.writePoint(point);
    if (doFlush) {
      await this.writeApi.flush();
    }

    return true;
  }

  /**
   * Write complete telemetry data for a device.
   * Menerima payload simulator BERTINGKAT: { deviceId, serialNumber, ..., data: { p_active, ... } }
   * → field telemetri di-flatten agar cocok dengan config telemetry.fields.
   */
  async writeTelemetry(deviceId, data) {
    // Simulator mengirim timestamp string ISO (mis. "2026-09-09T15:35:53Z").
    // InfluxDB client precision 'ns' menolak string tsb ("bad timestamp"),
    // jadi konversi ke Date (atau sekarang bila tidak ada/parsing gagal).
    let timestamp = data.timestamp || new Date();
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      timestamp = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    const measurements = telemetryFields;

    // Flatten: naikkan semua field di `data` ke top-level payload.
    const flat = { ...data };
    if (data && typeof data.data === 'object' && data.data !== null) {
      Object.assign(flat, data.data);
    }
    delete flat.data;

    // Tag tambahan agar query InfluxDB berbasis `serial`/`site` tetap berfungsi
    // (telemetry-query.service memakai filter r.serial == "SN-...").
    flat._serial = data.serialNumber || data.serial || '';
    flat._site = data.site || '';

    // Write each measurement (satu flush di akhir, bukan per-measurement)
    for (const [measurement, config] of Object.entries(measurements)) {
      const hasFields = config.fields.some(field => flat[field] !== undefined);
      if (hasFields) {
        await this.writeMeasurement(measurement, deviceId, flat, timestamp, false);
      }
    }
    await this.writeApi.flush();

    return true;
  }

  /**
   * Write power data specifically
   */
  async writePower(deviceId, data) {
    return this.writeMeasurement('power', deviceId, data);
  }

  /**
   * Write energy data specifically
   */
  async writeEnergy(deviceId, data) {
    return this.writeMeasurement('energy', deviceId, data);
  }

  /**
   * Write voltage data specifically
   */
  async writeVoltage(deviceId, data) {
    return this.writeMeasurement('voltage', deviceId, data);
  }

  /**
   * Write current data specifically
   */
  async writeCurrent(deviceId, data) {
    return this.writeMeasurement('current', deviceId, data);
  }

  /**
   * Write temperature data specifically
   */
  async writeTemperature(deviceId, data) {
    return this.writeMeasurement('temperature', deviceId, data);
  }

  /**
   * Write battery data specifically
   */
  async writeBattery(deviceId, data) {
    return this.writeMeasurement('battery', deviceId, data);
  }

  /**
   * Write status data specifically
   */
  async writeStatus(deviceId, data) {
    return this.writeMeasurement('status', deviceId, data);
  }

  /**
   * Write irradiance data specifically
   */
  async writeIrradiance(deviceId, data) {
    return this.writeMeasurement('irradiance', deviceId, data);
  }

  /**
   * Write frequency data specifically
   */
  async writeFrequency(deviceId, data) {
    return this.writeMeasurement('frequency', deviceId, data);
  }

  /**
   * Write others data (cos_phi, thd, efficiency)
   */
  async writeOthers(deviceId, data) {
    return this.writeMeasurement('others', deviceId, data);
  }

  /**
   * Batch write multiple telemetry points
   */
  async writeBatch(deviceId, dataArray) {
    for (const data of dataArray) {
      await this.writeTelemetry(deviceId, data);
    }
    return true;
  }

  /**
   * Close write API
   */
  async close() {
    await this.writeApi.close();
  }
}

module.exports = TelemetryWriter;
