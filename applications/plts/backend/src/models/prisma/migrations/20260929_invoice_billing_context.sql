-- Migration: invoice_billing_context
-- Date: 2026-09-29
-- Scope: Header invoice konsolidasi per tenant + billing period. Tambah konteks
--         penagihan tanpa referensi rate/site (tarif seragam per tenant; rincian
--         per-site diturunkan on-demand dari tbl_daily_summary).

ALTER TABLE tbl_invoices
  ADD COLUMN IF NOT EXISTS billing_period VARCHAR(7);

ALTER TABLE tbl_invoices
  ADD COLUMN IF NOT EXISTS peak_start_hour INT;

ALTER TABLE tbl_invoices
  ADD COLUMN IF NOT EXISTS peak_end_hour INT;

CREATE INDEX IF NOT EXISTS idx_tbl_invoices_tenant_period
  ON tbl_invoices (tenant_id, billing_period);
