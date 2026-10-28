//src/api/modules/permissions.js
import apiClient from "../client";

export default {
  // Get all permissions
  getPermissions(params = {}) {
    return apiClient.get("/permissions", { params });
  },

  // Get user permissions
  getUserPermissions(userId) {
    return apiClient.get(`/users/${userId}/permissions`);
  },

  // Update user permissions
  updateUserPermissions(userId, permissions) {
    return apiClient.put(`/users/${userId}/permissions`, { permissions });
  },

  // Get module permissions
  getModulePermissions(module) {
    return apiClient.get(`/permissions/module/${module}`);
  },
};
