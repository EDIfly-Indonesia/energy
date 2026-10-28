// src/api/modules/users.ts
import apiClient from "../client";

export default {
  getUsers(params: Record<string, any> = {}) {
    return apiClient.get("/users", { params });
  },
  getUser(id: string) {
    return apiClient.get(`/users/${id}`);
  },
  createUser(data: any) {
    return apiClient.post("/users", data);
  },
  updateUser(id: string, data: any) {
    return apiClient.put(`/users/${id}`, data);
  },
  deleteUser(id: string) {
    return apiClient.delete(`/users/${id}`);
  },
  getUserPermissions(id: string) {
    return apiClient.get(`/users/${id}/permissions`);
  },
  updateUserPermissions(id: string, permissions: any[]) {
    return apiClient.put(`/users/${id}/permissions`, { permissions });
  },
};