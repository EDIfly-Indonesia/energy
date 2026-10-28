// src/api/modules/invoices.ts
import apiClient from "../client";

export default {
  getInvoices(params: Record<string, any> = {}) {
    return apiClient.get("/invoices", { params });
  },
  getInvoice(id: number) {
    return apiClient.get(`/invoices/${id}`);
  },
  getInvoiceItems(id: number) {
    return apiClient.get(`/invoices/${id}/items`);
  },
  createInvoice(data: any) {
    return apiClient.post("/invoices", data);
  },
  updateInvoice(id: number, data: any) {
    return apiClient.put(`/invoices/${id}`, data);
  },
  deleteInvoice(id: number) {
    return apiClient.delete(`/invoices/${id}`);
  },
};