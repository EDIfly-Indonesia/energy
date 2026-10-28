// src/api/modules/permissions.ts
import apiClient from "../client";

export default {
  getPermissions(params: Record<string, any> = {}) {
    return apiClient.get("/permissions", { params });
  },
  getUserPermissions(userId: number) {
    return apiClient.get(`/users/${userId}/permissions`);
  },
  updateUserPermissions(userId: number, permissions: any[]) {
    return apiClient.put(`/users/${userId}/permissions`, { permissions });
  },
  getModulePermissions(module: string) {
    return apiClient.get(`/permissions/module/${module}`);
  },
};