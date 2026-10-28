// src/api/modules/invoices.js
import apiClient from "../client";

export default {
  getInvoices(params = {}) {
    return apiClient.get("/invoices", { params });
  },
  getInvoice(id) {
    return apiClient.get(`/invoices/${id}`);
  },
  getInvoiceItems(id) {
    return apiClient.get(`/invoices/${id}/items`);
  },
  createInvoice(data) {
    return apiClient.post("/invoices", data);
  },
  updateInvoice(id, data) {
    return apiClient.put(`/invoices/${id}`, data);
  },
  deleteInvoice(id) {
    return apiClient.delete(`/invoices/${id}`);
  },
};