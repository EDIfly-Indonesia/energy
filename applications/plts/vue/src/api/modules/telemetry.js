// src/api/modules/telemetry.js
import apiClient from "../client";

export default {
  getTelemetry(params = {}) {
    return apiClient.get("/telemetry", { params });
  },
  getTelemetryData(params = {}) {
    return apiClient.get("/telemetry/data", { params });
  },
  getDailySummary(params = {}) {
    return apiClient.get("/telemetry/daily-summary", { params });
  },
  getAggregates(params = {}) {
    return apiClient.get("/telemetry/aggregates", { params });
  },
  getSummary(params = {}) {
    return apiClient.get("/telemetry/summary", { params });
  },
  getRealtime(deviceId) {
    return apiClient.get(`/telemetry/realtime/${deviceId}`);
  },
  getRealtimeSummary(params = {}) {
    return apiClient.get("/telemetry/realtime/summary", { params });
  },
  getRealtimeTimeSeries(deviceId, params = {}) {
    return apiClient.get(`/telemetry/realtime/timeseries/${deviceId}`, { params });
  },
};