// src/api/modules/tenants.js
import apiClient from "../client";

export default {
  getTenants(params = {}) {
    return apiClient.get("/tenants", { params });
  },
  getTenant(id) {
    return apiClient.get(`/tenants/${id}`);
  },
  createTenant(data) {
    return apiClient.post("/tenants", data);
  },
  updateTenant(id, data) {
    return apiClient.put(`/tenants/${id}`, data);
  },
  deleteTenant(id) {
    return apiClient.delete(`/tenants/${id}`);
  },
};