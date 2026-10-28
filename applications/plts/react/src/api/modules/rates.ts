// src/api/modules/rates.ts
import apiClient from "../client";

export type RateType = "FIXED" | "PEAK_OFF_PEAK";

export interface RatePayload {
  code?: string;
  name: string;
  rateType?: RateType;
  // Fixed
  fixedAmount?: string | number;
  // Peak/Off-Peak
  peakRate?: string | number;
  offPeakRate?: string | number;
  peakStartHour?: number;
  peakEndHour?: number;
  // Scope & metadata
  currency?: string;
  description?: string;
  isActive?: boolean;
  tenantId?: string;
  siteId?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export default {
  getRates(params: Record<string, any> = {}) {
    return apiClient.get("/rates", { params });
  },
  getRate(id: string) {
    return apiClient.get(`/rates/${id}`);
  },
  createRate(data: RatePayload) {
    return apiClient.post("/rates", data);
  },
  updateRate(id: string, data: Partial<RatePayload>) {
    return apiClient.put(`/rates/${id}`, data);
  },
  deleteRate(id: string) {
    return apiClient.delete(`/rates/${id}`);
  },
};
