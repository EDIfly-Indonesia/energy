// src/api/modules/devices.js
import apiClient from "../client";

export default {
  getDevices(params = {}) {
    return apiClient.get("/devices", { params });
  },
  getDevice(id) {
    return apiClient.get(`/devices/${id}`);
  },
  createDevice(data) {
    return apiClient.post("/devices", data);
  },
  updateDevice(id, data) {
    return apiClient.put(`/devices/${id}`, data);
  },
  deleteDevice(id) {
    return apiClient.delete(`/devices/${id}`);
  },
  getDeviceBrands() {
    return apiClient.get("/devices/brands");
  },
  getDeviceTypes() {
    return apiClient.get("/devices/types");
  },
};