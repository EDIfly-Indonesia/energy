-- Migration: rate_feature_fixed_only
-- Date: 2026-09-14
-- Scope: aktifkan fitur Rate (fixed rate). Hanya migrasi tabel rate;
--         tabel invoice TIDAK disentuh (kolom rate/energy invoice belum
--         diimplementasikan di sisi controller invoice).

-- 1. Ganti tbl_rate (struktur lama, kosong) -> tbl_rates (struktur baru)
DROP TABLE IF EXISTS tbl_rate CASCADE;

CREATE TABLE tbl_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(100) NOT NULL,
  rate_type       VARCHAR(20) NOT NULL DEFAULT 'FIXED',

  -- Fixed Rate
  fixed_amount    DECIMAL(15,4),

  -- Floating Rate (Peak/Off-Peak) — nullable, belum diimplementasikan
  peak_rate       DECIMAL(15,4),
  off_peak_rate   DECIMAL(15,4),
  peak_start_hour INT DEFAULT 18,
  peak_end_hour   INT DEFAULT 22,

  -- Scope
  tenant_id       UUID,
  site_id         UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  description     VARCHAR(255),
  currency        VARCHAR(5) NOT NULL DEFAULT 'IDR',
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID
);

-- Indexes
CREATE INDEX idx_tbl_rates_rate_type   ON tbl_rates(rate_type);
CREATE INDEX idx_tbl_rates_tenant_id   ON tbl_rates(tenant_id);
CREATE INDEX idx_tbl_rates_site_id     ON tbl_rates(site_id);
CREATE INDEX idx_tbl_rates_is_active   ON tbl_rates(is_active);
