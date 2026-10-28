// src/api/modules/invoices.ts
import apiClient from "../client";

export interface GenerateInvoicePayload {
  tenantId: string;
  month: string; // YYYY-MM
  rateId?: string;
}

export default {
  getInvoices(params: Record<string, any> = {}) {
    return apiClient.get("/invoices", { params });
  },
  getInvoice(id: string) {
    return apiClient.get(`/invoices/${id}`);
  },
  getInvoiceItems(id: string) {
    return apiClient.get(`/invoices/${id}/items`);
  },
  getInvoiceUsage(id: string, params: Record<string, any> = {}) {
    return apiClient.get(`/invoices/${id}/usage`, { params });
  },
  generateInvoice(data: GenerateInvoicePayload) {
    return apiClient.post("/invoices/generate", data);
  },
  createInvoice(data: any) {
    return apiClient.post("/invoices", data);
  },
  updateInvoice(id: string, data: any) {
    return apiClient.put(`/invoices/${id}`, data);
  },
  deleteInvoice(id: string) {
    return apiClient.delete(`/invoices/${id}`);
  },
};