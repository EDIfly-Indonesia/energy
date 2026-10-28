//src/api/modules/users.js
import apiClient from "../client";

export default {
  // Get all users with pagination and filters
  getUsers(params = {}) {
    return apiClient.get("/users", { params });
  },

  // Get single user by ID
  getUser(id) {
    return apiClient.get(`/users/${id}`);
  },

  // Create new user
  createUser(data) {
    return apiClient.post("/users", data);
  },

  // Update existing user
  updateUser(id, data) {
    return apiClient.put(`/users/${id}`, data);
  },

  // Delete user
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);
  },

  // Get user permissions
  getUserPermissions(id) {
    return apiClient.get(`/users/${id}/permissions`);
  },

  // Update user permissions
  updateUserPermissions(id, permissions) {
    return apiClient.put(`/users/${id}/permissions`, { permissions });
  },
};
