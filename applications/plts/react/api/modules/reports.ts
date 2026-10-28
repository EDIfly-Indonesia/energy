// src/api/modules/reports.ts
import apiClient from "../client";

export default {
  getReports(params: Record<string, any> = {}) {
    return apiClient.get("/reports", { params });
  },
  
  // Use InfluxDB realtime summary endpoint for energy report
  getEnergyReport(params: Record<string, any> = {}) {
    const { siteId, startDate, endDate, range = '26d' } = params;
    // Calculate range from dates if provided, otherwise use default 26d
    return apiClient.get("/telemetry/realtime/summary", { 
      params: { siteId, range } 
    });
  },
  
  // Export uses the same data source
  exportEnergyReport(params: Record<string, any> = {}) {
    const { siteId, format = 'csv', startDate, endDate, range = '26d' } = params;
    return apiClient.get("/telemetry/realtime/summary", { 
      params: { siteId, range },
      responseType: "blob"
    });
  },
  
  // Time series for specific device
  getDeviceTimeSeries(deviceId: string, params: Record<string, any> = {}) {
    const { range = '26d' } = params;
    return apiClient.get(`/telemetry/realtime/timeseries/${deviceId}`, { 
      params: { range }
    });
  },
  
  // Daily summary (requires daily job)
  getDailySummary(params: Record<string, any> = {}) {
    return apiClient.get("/telemetry/daily-summary", { params });
  }
};