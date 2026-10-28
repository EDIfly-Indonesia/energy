// src/api/modules/roles.js
import apiClient from "../client";

export default {
  getRoles(params = {}) {
    return apiClient.get("/roles", { params });
  },
  getRole(id) {
    return apiClient.get(`/roles/${id}`);
  },
  createRole(data) {
    return apiClient.post("/roles", data);
  },
  updateRole(id, data) {
    return apiClient.put(`/roles/${id}`, data);
  },
  deleteRole(id) {
    return apiClient.delete(`/roles/${id}`);
  },
  getRolePermissions(id) {
    return apiClient.get(`/roles/${id}/permissions`);
  },
  updateRolePermissions(id, permissions) {
    return apiClient.put(`/roles/${id}/permissions`, { permissions });
  },
};