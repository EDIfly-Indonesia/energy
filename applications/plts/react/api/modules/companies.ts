// src/api/modules/companies.ts
import apiClient from "../client";

export default {
  getCompanies(params: Record<string, any> = {}) {
    return apiClient.get("/companies", { params });
  },
  getCompany(id: string) {
    return apiClient.get(`/companies/${id}`);
  },
  createCompany(data: any) {
    return apiClient.post("/companies", data);
  },
  updateCompany(id: string, data: any) {
    return apiClient.put(`/companies/${id}`, data);
  },
  deleteCompany(id: string) {
    return apiClient.delete(`/companies/${id}`);
  },
};