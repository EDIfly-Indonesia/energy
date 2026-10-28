// src/api/modules/telemetry.ts
import apiClient from "../client";

// Tipe untuk data InfluxDB (Live/Real-time)
export interface InfluxTelemetryPoint {
  time: string;
  site_id: number;
  device_id: number;
  standard_key: string;
  value: number;
}

// Tipe untuk data Agregat PostgreSQL
export interface AggregatedTelemetry {
  id: number;
  deviceId: number;
  standardKey: string;
  period: string;
  periodStart: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sumValue: number;
  count: number;
  device?: { id: number; serialNumber: string; siteId: number; siteName?: string };
}

// Tipe untuk summary realtime per site/device
export interface RealtimeSummary {
  siteId: number;
  siteName: string;
  production: number;
  consumption: number;
  batterySoc: number;
  gridExport: number;
  gridImport: number;
  lastUpdate: string;
}

export default {
  // ===== PostgreSQL Aggregates =====
  getTelemetryAggregates(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/aggregates", { params });
  },
  getLatestAggregates(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/aggregates/latest", { params });
  },

  // ===== InfluxDB Live/Real-time =====
  getRealtimeSummary(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/realtime/summary", { params });
  },
  getRealtimeTimeSeries(deviceId: number, params: Record<string, any> = {}) {
    return apiClient.get(`/telemetry/realtime/timeseries/${deviceId}`, { params });
  },
  queryInfluxDB(query: string) {
    return apiClient.post("/telemetry/query", { query });
  },

  // Real-time per device
  getRealtimeTelemetry(deviceId: string, params: Record<string, any> = {}) {
    return apiClient.get(`/telemetry/realtime/${deviceId}`, { params });
  },

  // ===== Sites =====
  getSites(params: Record<string, any> = {}) {
    return apiClient.get("/sites", { params });
  },

  // ===== Devices =====
  getDevices(params: Record<string, any> = {}) {
    return apiClient.get("/devices", { params });
  },

  // ===== Existing methods =====
  getTelemetry(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry", { params });
  },
  getTelemetryData(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/data", { params });
  },
  getDailySummary(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/daily-summary", { params });
  },
  getSummary(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/summary", { params });
  },
  getRealtime(deviceId: string, params: Record<string, any> = {}) {
    return apiClient.get(`/telemetry/realtime/${deviceId}`, { params });
  },
};