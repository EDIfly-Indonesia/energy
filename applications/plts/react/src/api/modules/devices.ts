// src/api/modules/devices.ts
import apiClient from "../client";

export default {
  getDevices(params: Record<string, any> = {}) {
    return apiClient.get("/devices", { params });
  },
  getDevice(id: string) {
    return apiClient.get(`/devices/${id}`);
  },
  createDevice(data: any) {
    return apiClient.post("/devices", data);
  },
  updateDevice(id: string, data: any) {
    return apiClient.put(`/devices/${id}`, data);
  },
  deleteDevice(id: string) {
    return apiClient.delete(`/devices/${id}`);
  },
  getDeviceBrands() {
    return apiClient.get("/devices/brands");
  },
  getDeviceTypes() {
    return apiClient.get("/devices/types");
  },
};