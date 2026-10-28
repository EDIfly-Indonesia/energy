// src/api/modules/alarms.ts
import apiClient from "../client";

export default {
  getAlarms(params: Record<string, any> = {}) {
    return apiClient.get("/alarms", { params });
  },
  getAlarm(id: number) {
    return apiClient.get(`/alarms/${id}`);
  },
  resolveAlarm(id: number) {
    return apiClient.put(`/alarms/${id}/resolve`);
  },
  getResolvedAlarms(params: Record<string, any> = {}) {
    return apiClient.get("/alarms/resolved", { params });
  },
};