// src/api/modules/alarms.js
import apiClient from "../client";

export default {
  getAlarms(params = {}) {
    return apiClient.get("/alarms", { params });
  },
  getAlarm(id) {
    return apiClient.get(`/alarms/${id}`);
  },
  resolveAlarm(id) {
    return apiClient.put(`/alarms/${id}/resolve`);
  },
  getResolvedAlarms(params = {}) {
    return apiClient.get("/alarms/resolved", { params });
  },
};