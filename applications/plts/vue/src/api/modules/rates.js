// src/api/modules/rates.js
import apiClient from "../client";

export default {
  getRates(params = {}) {
    return apiClient.get("/rates", { params });
  },
  getRate(id) {
    return apiClient.get(`/rates/${id}`);
  },
  createRate(data) {
    return apiClient.post("/rates", data);
  },
  updateRate(id, data) {
    return apiClient.put(`/rates/${id}`, data);
  },
  deleteRate(id) {
    return apiClient.delete(`/rates/${id}`);
  },
};