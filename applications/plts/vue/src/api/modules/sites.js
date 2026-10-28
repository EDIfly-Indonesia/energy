// src/api/modules/sites.js
import apiClient from "../client";

export default {
  getSites(params = {}) {
    return apiClient.get("/sites", { params });
  },
  getSite(id) {
    return apiClient.get(`/sites/${id}`);
  },
  createSite(data) {
    return apiClient.post("/sites", data);
  },
  updateSite(id, data) {
    return apiClient.put(`/sites/${id}`, data);
  },
  deleteSite(id) {
    return apiClient.delete(`/sites/${id}`);
  },
};