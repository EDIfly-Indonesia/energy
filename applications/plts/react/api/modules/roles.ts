// src/api/modules/roles.ts
import apiClient from "../client";

export default {
  getRoles(params: Record<string, any> = {}) {
    return apiClient.get("/roles", { params });
  },
  getRole(id: string) {
    return apiClient.get(`/roles/${id}`);
  },
  createRole(data: any) {
    return apiClient.post("/roles", data);
  },
  updateRole(id: string, data: any) {
    return apiClient.put(`/roles/${id}`, data);
  },
  deleteRole(id: string) {
    return apiClient.delete(`/roles/${id}`);
  },
  getRolePermissions(id: string) {
    return apiClient.get(`/roles/${id}/permissions`);
  },
  updateRolePermissions(id: string, permissions: any[]) {
    return apiClient.put(`/roles/${id}/permissions`, { permissions });
  },
};