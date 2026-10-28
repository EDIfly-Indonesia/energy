// src/api/modules/rates.ts
import apiClient from "../client";

export default {
  getRates(params: Record<string, any> = {}) {
    return apiClient.get("/rates", { params });
  },
  getRate(id: number) {
    return apiClient.get(`/rates/${id}`);
  },
  createRate(data: any) {
    return apiClient.post("/rates", data);
  },
  updateRate(id: number, data: any) {
    return apiClient.put(`/rates/${id}`, data);
  },
  deleteRate(id: number) {
    return apiClient.delete(`/rates/${id}`);
  },
};