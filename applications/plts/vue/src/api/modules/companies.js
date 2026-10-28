// src/api/modules/companies.js
import apiClient from "../client";

export default {
  getCompanies(params = {}) {
    return apiClient.get("/companies", { params });
  },
  getCompany(id) {
    return apiClient.get(`/companies/${id}`);
  },
  createCompany(data) {
    return apiClient.post("/companies", data);
  },
  updateCompany(id, data) {
    return apiClient.put(`/companies/${id}`, data);
  },
  deleteCompany(id) {
    return apiClient.delete(`/companies/${id}`);
  },
};