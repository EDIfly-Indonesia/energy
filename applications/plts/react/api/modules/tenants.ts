// src/api/modules/tenants.ts
import apiClient from "../client";

export default {
  getTenants(params: Record<string, any> = {}) {
    return apiClient.get("/tenants", { params });
  },
  getTenant(id: string) {
    return apiClient.get(`/tenants/${id}`);
  },
  createTenant(data: any) {
    return apiClient.post("/tenants", data);
  },
  updateTenant(id: string, data: any) {
    return apiClient.put(`/tenants/${id}`, data);
  },
  deleteTenant(id: string) {
    return apiClient.delete(`/tenants/${id}`);
  },
};