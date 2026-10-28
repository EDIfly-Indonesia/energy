-- Migration: telemetry_aggregate_latest_perf
-- Date: 2026-09-29
-- Scope: Index pendukung endpoint /telemetry/aggregates/latest yang sebelumnya
--        melakukan full seq scan + sort atas ~590k baris untuk mencari bucket
--        periodStart terbaru per period. Index komposit (period, period_start)
--        membuat pencarian bucket terbaru menjadi index-only scan.

CREATE INDEX IF NOT EXISTS idx_tbl_telemetry_aggregates_period_start
  ON tbl_telemetry_aggregates (period, period_start DESC);

-- Index untuk lookup per-device (aggregates/latest/:deviceId dan filter siteId).
CREATE INDEX IF NOT EXISTS idx_tbl_telemetry_aggregates_device_period_start
  ON tbl_telemetry_aggregates (device_id, period, period_start DESC);
