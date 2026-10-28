// src/api/modules/reports.js
import apiClient from "../client";

export default {
  getReports(params = {}) {
    return apiClient.get("/reports", { params });
  },
  getEnergyReport(params = {}) {
    return apiClient.get("/reports/energy", { params });
  },
  // Export endpoints - returns blob for file download
  exportEnergyReport(params = {}) {
    // format: 'csv' | 'xlsx' | 'pdf'
    return apiClient.get("/reports/export", {
      params,
      responseType: "blob",
    });
  },
};