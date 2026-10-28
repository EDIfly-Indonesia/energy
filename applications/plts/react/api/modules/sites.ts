// src/api/modules/sites.ts
import apiClient from "../client";

export default {
  getSites(params: Record<string, any> = {}) {
    return apiClient.get("/sites", { params });
  },
  getSite(id: string) {
    return apiClient.get(`/sites/${id}`);
  },
  createSite(data: any) {
    return apiClient.post("/sites", data);
  },
  updateSite(id: string, data: any) {
    return apiClient.put(`/sites/${id}`, data);
  },
  deleteSite(id: string) {
    return apiClient.delete(`/sites/${id}`);
  },
};