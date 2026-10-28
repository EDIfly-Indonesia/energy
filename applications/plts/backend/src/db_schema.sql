CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS tbl_users CASCADE; 
CREATE TABLE  tbl_users (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID REFERENCES tbl_tenants(id) ON DELETE CASCADE,
role_id UUID REFERENCES tbl_roles(id),
name VARCHAR(255) NOT NULL,
email VARCHAR(255) UNIQUE,
password_hash VARCHAR(255) NOT NULL,
is_active BOOLEAN DEFAULT true,
last_login TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );

DROP TABLE IF EXISTS tbl_permission CASCADE; 
CREATE TABLE  tbl_permission (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
capability VARCHAR(100),
module VARCHAR(50) NOT NULL );

DROP TABLE IF EXISTS tbl_user_permission CASCADE; 
CREATE TABLE  tbl_user_permission (
user_id UUID REFERENCES tbl_users(id),
permission_id UUID REFERENCES tbl_permission(id),
granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (user_id, permission_id) );

DROP TABLE IF EXISTS tbl_api_tokens CASCADE; 
CREATE TABLE  tbl_api_tokens (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES tbl_users(id),
token VARCHAR(255) UNIQUE,
name VARCHAR(100) NOT NULL,
expires_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );

DROP TABLE IF EXISTS tbl_tenants CASCADE;
CREATE TABLE  tbl_tenants (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(255) COLLATE "en_US.utf8",
type VARCHAR(50) NOT NULL COLLATE "en_US.utf8",
is_active BOOLEAN DEFAULT TRUE,
billing_street  VARCHAR(100),
billing_city VARCHAR(100),
billing_state VARCHAR(100),
billing_zip VARCHAR(100),
billing_country VARCHAR(100),
street  VARCHAR(100),
city VARCHAR(100),
state VARCHAR(100),
zip VARCHAR(100),
country VARCHAR(100),
phonenumber VARCHAR(100),
vat VARCHAR(100),
default_currency VARCHAR(100),
longitude VARCHAR(200),
latitude VARCHAR(200),
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );


DROP TABLE IF EXISTS tbl_companies CASCADE; 
CREATE TABLE  tbl_companies (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(255) COLLATE "en_US.utf8",
is_active BOOLEAN DEFAULT TRUE,
billing_street  VARCHAR(100),
billing_city VARCHAR(100),
billing_state VARCHAR(100),
billing_zip VARCHAR(100),
billing_country VARCHAR(100),
street  VARCHAR(100),
city VARCHAR(100),
state VARCHAR(100),
zip VARCHAR(100),
country VARCHAR(100),
phonenumber VARCHAR(100),
vat VARCHAR(100),
default_currency VARCHAR(100),
longitude VARCHAR(200),
latitude VARCHAR(200),
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );


DROP TABLE IF EXISTS tbl_sites CASCADE; 
CREATE TABLE  tbl_sites (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
company_id UUID NOT NULL REFERENCES tbl_companies(id) ON DELETE CASCADE,
name VARCHAR(50) COLLATE "en_US.utf8",
capacity_kwp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
latitude NUMERIC(10, 8),
longitude NUMERIC(11, 8),
timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );

DROP TABLE IF EXISTS tbl_device_brands CASCADE; 
CREATE TABLE  tbl_device_brands (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(100) UNIQUE NOT NULL COLLATE "en_US.utf8" );

DROP TABLE IF EXISTS tbl_device_types CASCADE; 
CREATE TABLE  tbl_device_types (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(100) UNIQUE NOT NULL COLLATE "en_US.utf8" );

DROP TABLE IF EXISTS tbl_devices CASCADE; 
CREATE TABLE  tbl_devices (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
site_id UUID NOT NULL REFERENCES tbl_sites(id) ON DELETE CASCADE,
brand_id UUID NOT NULL REFERENCES tbl_device_brands(id),
type_id UUID NOT NULL REFERENCES tbl_device_types(id),
serial_number VARCHAR(200) NOT NULL COLLATE "en_US.utf8",
model_name VARCHAR(200) COLLATE "en_US.utf8",
status VARCHAR(50) DEFAULT 'OFFLINE',
last_seen_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id),
UNIQUE (brand_id, serial_number) );

DROP TABLE IF EXISTS tbl_telemetry_vendor_mappings CASCADE; 
CREATE TABLE  tbl_telemetry_vendor_mappings (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
brand_id UUID NOT NULL REFERENCES tbl_device_brands(id) ON DELETE CASCADE,
vendor_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
standard_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
data_type VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
UNIQUE (device_id, vendor_key) );


DROP TABLE IF EXISTS tbl_telemetry_mappings CASCADE; 
CREATE TABLE  tbl_telemetry_mappings (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
device_id UUID NOT NULL REFERENCES tbl_devices(id) ON DELETE CASCADE,
vendor_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
standard_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
data_type VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
UNIQUE (device_id, vendor_key) );

-- Tabel untuk menyimpan data telemetry aktual
DROP TABLE IF EXISTS tbl_telemetry_data CASCADE;
CREATE TABLE tbl_telemetry_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES tbl_devices(id) ON DELETE CASCADE,
    standard_key VARCHAR(100) NOT NULL,
    value NUMERIC(15, 4),
    quality VARCHAR(20) DEFAULT 'GOOD', -- GOOD, BAD, UNCERTAIN
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Partisi berdasarkan timestamp untuk performa
CREATE TABLE tbl_telemetry_data_2026_q3 PARTITION OF tbl_telemetry_data
    FOR VALUES FROM ('2026-07-01 00:00:00+07') TO ('2026-10-01 00:00:00+07');

-- Index untuk query cepat
CREATE INDEX idx_telemetry_data_device_time ON tbl_telemetry_data(device_id, timestamp DESC);
CREATE INDEX idx_telemetry_data_key_time ON tbl_telemetry_data(standard_key, timestamp DESC);

-- Tabel untuk data agregat per jam/hari (mengurangi beban query real-time)
DROP TABLE IF EXISTS tbl_telemetry_aggregates CASCADE;
CREATE TABLE tbl_telemetry_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES tbl_devices(id) ON DELETE CASCADE,
    standard_key VARCHAR(100) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'monthly'
    min_value NUMERIC(15, 4),
    max_value NUMERIC(15, 4),
    avg_value NUMERIC(15, 4),
    sum_value NUMERIC(15, 4),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_aggregates_device_period ON tbl_telemetry_aggregates(device_id, standard_key, period_start DESC);

-- Tabel untuk ringkasan harian per site
DROP TABLE IF EXISTS tbl_daily_summary CASCADE;
CREATE TABLE tbl_daily_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES tbl_sites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_production NUMERIC(15, 4) DEFAULT 0,
    total_consumption NUMERIC(15, 4) DEFAULT 0,
    total_export NUMERIC(15, 4) DEFAULT 0,
    total_import NUMERIC(15, 4) DEFAULT 0,
    total_storage NUMERIC(15, 4) DEFAULT 0,
    peak_power NUMERIC(15, 4) DEFAULT 0,
    avg_power NUMERIC(15, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, date)
);

CREATE INDEX idx_daily_summary_site_date ON tbl_daily_summary(site_id, date DESC);


DROP TABLE IF EXISTS tbl_rate CASCADE;
DROP TABLE IF EXISTS tbl_rates CASCADE;
CREATE TABLE tbl_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(100) NOT NULL,
  rate_type       VARCHAR(20) NOT NULL DEFAULT 'FIXED'
                  CHECK (rate_type IN ('FIXED', 'PEAK_OFF_PEAK')),

  -- Fixed Rate
  fixed_amount    DECIMAL(15,4),

  -- Peak/Off-Peak Rate (Time-of-Use, satu jendela WBP 17:00-22:00)
  peak_rate       DECIMAL(15,4),
  off_peak_rate   DECIMAL(15,4),
  peak_start_hour INT DEFAULT 17,
  peak_end_hour   INT DEFAULT 22,

  -- Scope
  tenant_id       UUID REFERENCES tbl_tenants(id) ON UPDATE CASCADE ON DELETE SET NULL,
  site_id         UUID REFERENCES tbl_sites(id) ON UPDATE CASCADE ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  description     VARCHAR(255),
  currency        VARCHAR(5) NOT NULL DEFAULT 'IDR',
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES tbl_users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES tbl_users(id)
);

-- Indexes
CREATE INDEX idx_tbl_rates_rate_type   ON tbl_rates(rate_type);
CREATE INDEX idx_tbl_rates_tenant_id   ON tbl_rates(tenant_id);
CREATE INDEX idx_tbl_rates_site_id     ON tbl_rates(site_id);
CREATE INDEX idx_tbl_rates_is_active   ON tbl_rates(is_active);


DROP TABLE IF EXISTS tbl_alarms CASCADE; 
CREATE TABLE  tbl_alarms (
id UUID DEFAULT uuid_generate_v4(),
device_id UUID NOT NULL,
error_code VARCHAR(100) COLLATE "en_US.utf8",
severity VARCHAR(100) NOT NULL DEFAULT 'INFO' COLLATE "en_US.utf8",
message text,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
resolved_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id),
PRIMARY KEY (id, created_at)) PARTITION BY RANGE (created_at);

-- Membuat Partisi Fisik Pertama (Contoh untuk Kuartal 3 dan 4 Tahun 2026)
CREATE TABLE alarms_2026_q3 PARTITION OF tbl_alarms 
    FOR VALUES FROM ('2026-07-01 00:00:00+07') TO ('2026-10-01 00:00:00+07');

CREATE TABLE alarms_2026_q4 PARTITION OF tbl_alarms 
    FOR VALUES FROM ('2026-10-01 00:00:00+07') TO ('2027-01-01 00:00:00+07');


DROP TABLE IF EXISTS tbl_audit_logs CASCADE; 
CREATE TABLE  tbl_audit_logs (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
table_name VARCHAR(100) NOT NULL,
record_id UUID NOT NULL,
action VARCHAR(10) NOT NULL,
old_data JSONB,
new_data JSONB,
changed_by UUID,
changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );

DROP TABLE IF EXISTS tbl_vendor_auth CASCADE; 
CREATE TABLE  tbl_vendor_auth (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
tenant_id UUID NOT NULL REFERENCES tbl_tenants(id) ON DELETE CASCADE,
vendor_name VARCHAR(100) NOT NULL,
app_key TEXT,
access_token TEXT,
refresh_token TEXT,
expires_at TIMESTAMPTZ NOT NULL,
meta_data JSONB,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
UNIQUE (tenant_id, vendor_name) );

DROP TABLE IF EXISTS tbl_roles CASCADE; 
CREATE TABLE  tbl_roles (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(50) UNIQUE,
description TEXT,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id) );



DROP TABLE IF EXISTS tbl_notifications CASCADE; 
CREATE TABLE  tbl_notifications (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES tbl_users(id),
type VARCHAR(100),
title VARCHAR(255),
message TEXT,
data JSONB NULL,
is_read BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );

DROP TABLE IF EXISTS tbl_gateways CASCADE;
CREATE TABLE  tbl_gateways (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
site_id UUID NULL REFERENCES tbl_sites(id),
name VARCHAR(100),
mac_address VARCHAR(255) UNIQUE,
ip_address VARCHAR(45) NULL,
status VARCHAR(20),
last_seen_at TIMESTAMPTZ NULL,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP );

DROP TABLE IF EXISTS tbl_projects CASCADE; CREATE TABLE  tbl_projects (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
title VARCHAR(100),
description TEXT,
tenant_id UUID NULL REFERENCES tbl_tenants(id),
tenant_name VARCHAR(300),
company_id UUID NULL REFERENCES tbl_companies(id),
company_name VARCHAR(300),
status VARCHAR(20),
start_date DATE DEFAULT CURRENT_DATE,
finish_date DATE,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );


DROP TABLE IF EXISTS tbl_invoices CASCADE;
CREATE TABLE  tbl_invoices (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
sent INT DEFAULT 0,
datesend DATE DEFAULT CURRENT_DATE,
tenant_id UUID NULL REFERENCES tbl_tenants(id),
tenant_name VARCHAR(100),
company_id UUID NULL REFERENCES tbl_companies(id),
company_name VARCHAR(100),
invoice_date DATE DEFAULT CURRENT_DATE,
due_date DATE DEFAULT (CURRENT_DATE + 30),
currency VARCHAR(5),
status VARCHAR(20),
discount_percent VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
discount_total VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
discount_type VARCHAR(100),
subtotal VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
total_tax VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
total VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
adjustment VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
tenant_note VARCHAR(100),
company_note VARCHAR(100),
admin_note VARCHAR(100),
is_recurring INT DEFAULT 0,
recurring_type VARCHAR(100),
last_recurring_date TIMESTAMPTZ NOT NULL,
terms TEXT,
billing_street  VARCHAR(100),
billing_city VARCHAR(100),
billing_state VARCHAR(100),
billing_zip VARCHAR(100),
billing_country VARCHAR(100),
shipping_street  VARCHAR(100),
shipping_city VARCHAR(100),
shipping_state VARCHAR(100),
shipping_zip VARCHAR(100),
shipping_country VARCHAR(100),
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
created_by UUID NOT NULL REFERENCES tbl_users(id),
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
updated_by UUID  REFERENCES tbl_users(id) );

DROP TABLE IF EXISTS tbl_invoices_items CASCADE;
CREATE TABLE  tbl_invoices_items (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
invoice_id UUID NULL REFERENCES tbl_invoices(id),
qty VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
unit VARCHAR(100),
rate VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8" );

-- Membuat fungsi otomatis pencatat audit
CREATE OR REPLACE FUNCTION log_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::JSONB);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW)::JSONB);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Memasang trigger pada tabel devices
CREATE TRIGGER devices_audit
AFTER INSERT OR UPDATE OR DELETE ON devices
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

-- Indexing All Tables
CREATE INDEX idx_tenants_status ON tbl_tenants(is_active);
CREATE INDEX idx_companies_tenant ON tbl_companies(tenant_id);
CREATE INDEX idx_sites_company ON tbl_sites(company_id);
CREATE INDEX idx_sites_geo ON tbl_sites(latitude, longitude);
CREATE INDEX idx_devices_site ON tbl_devices(site_id);
CREATE INDEX idx_devices_status ON tbl_devices(status);
CREATE INDEX idx_devices_sn ON tbl_devices(serial_number);
CREATE INDEX idx_telemetry_mappings_device ON tbl_telemetry_mappings(device_id);
CREATE INDEX idx_alarms_device ON tbl_alarms(device_id);
CREATE INDEX idx_alarms_severity ON tbl_alarms(severity);
CREATE INDEX idx_alarms_created_at ON tbl_alarms(created_at);
CREATE INDEX idx_vendor_auth_lookup ON tbl_vendor_auth(vendor_name, tenant_id);
CREATE INDEX idx_audit_table_record ON tbl_audit_logs(table_name, record_id);
