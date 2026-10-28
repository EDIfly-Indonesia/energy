docker exec -i energy-postgres psql -U energy_app -d energy_platform << 'EOF'
-- 1. Buat extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat tabel users TERLEBIH DAHULU (karena dirujuk oleh tabel lain)
DROP TABLE IF EXISTS tbl_users CASCADE;
CREATE TABLE tbl_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    role_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- 3. Buat tabel roles
DROP TABLE IF EXISTS tbl_roles CASCADE;
CREATE TABLE tbl_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id)
);

-- 4. Buat tabel tenants
DROP TABLE IF EXISTS tbl_tenants CASCADE;
CREATE TABLE tbl_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) COLLATE "en_US.utf8",
    type VARCHAR(50) NOT NULL COLLATE "en_US.utf8",
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id)
);

CREATE INDEX idx_tenants_status ON tbl_tenants(is_active);

-- 5. Buat tabel companies
DROP TABLE IF EXISTS tbl_companies CASCADE;
CREATE TABLE tbl_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tbl_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) COLLATE "en_US.utf8",
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id)
);

CREATE INDEX idx_companies_tenant ON tbl_companies(tenant_id);

-- 6. Buat tabel sites
DROP TABLE IF EXISTS tbl_sites CASCADE;
CREATE TABLE tbl_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tbl_companies(id) ON DELETE CASCADE,
    name VARCHAR(255) COLLATE "en_US.utf8",
    capacity_kwp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id)
);

CREATE INDEX idx_sites_company ON tbl_sites(company_id);
CREATE INDEX idx_sites_geo ON tbl_sites(latitude, longitude);

-- 7. Buat tabel device_brands
DROP TABLE IF EXISTS tbl_device_brands CASCADE;
CREATE TABLE tbl_device_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL COLLATE "en_US.utf8"
);

-- 8. Buat tabel device_types
DROP TABLE IF EXISTS tbl_device_types CASCADE;
CREATE TABLE tbl_device_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL COLLATE "en_US.utf8"
);

-- 9. Buat tabel devices
DROP TABLE IF EXISTS tbl_devices CASCADE;
CREATE TABLE tbl_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES tbl_sites(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES tbl_device_brands(id),
    type_id UUID NOT NULL REFERENCES tbl_device_types(id),
    serial_number VARCHAR(200) NOT NULL COLLATE "en_US.utf8",
    model_name VARCHAR(200) COLLATE "en_US.utf8",
    status VARCHAR(50) DEFAULT 'OFFLINE',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id),
    UNIQUE (brand_id, serial_number)
);

CREATE INDEX idx_devices_site ON tbl_devices(site_id);
CREATE INDEX idx_devices_status ON tbl_devices(status);
CREATE INDEX idx_devices_sn ON tbl_devices(serial_number);

-- 10. Buat tabel telemetry_mappings
DROP TABLE IF EXISTS telemetry_mappings CASCADE;
CREATE TABLE telemetry_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES tbl_devices(id) ON DELETE CASCADE,
    vendor_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
    standard_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
    data_type VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    UNIQUE (device_id, vendor_key)
);

CREATE INDEX idx_telemetry_mappings_device ON telemetry_mappings(device_id);

-- 11. Buat tabel telemetry_vendor_mappings
DROP TABLE IF EXISTS telemetry_vendor_mappings CASCADE;
CREATE TABLE telemetry_vendor_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES tbl_device_brands(id) ON DELETE CASCADE,
    vendor_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
    standard_key VARCHAR(100) NOT NULL COLLATE "en_US.utf8",
    data_type VARCHAR(50) DEFAULT 'FLOAT' COLLATE "en_US.utf8",
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    UNIQUE (brand_id, vendor_key)
);

-- 12. Buat tabel alarms
DROP TABLE IF EXISTS tbl_alarms CASCADE;
CREATE TABLE tbl_alarms (
    id UUID DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES tbl_devices(id) ON DELETE CASCADE,
    error_code VARCHAR(100) COLLATE "en_US.utf8",
    severity VARCHAR(100) NOT NULL DEFAULT 'INFO' COLLATE "en_US.utf8",
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id),
    PRIMARY KEY (id, created_at)
);

-- 13. Buat tabel lainnya
DROP TABLE IF EXISTS tbl_rate CASCADE;
CREATE TABLE tbl_rate (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) COLLATE "en_US.utf8",
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    description VARCHAR(255) COLLATE "en_US.utf8",
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES tbl_users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES tbl_users(id)
);

DROP TABLE IF EXISTS tbl_audit_logs CASCADE;
CREATE TABLE tbl_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tbl_vendor_auth CASCADE;
CREATE TABLE tbl_vendor_auth (
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
    UNIQUE (tenant_id, vendor_name)
);

DROP TABLE IF EXISTS tbl_permission CASCADE;
CREATE TABLE tbl_permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capability VARCHAR(100),
    module VARCHAR(50) NOT NULL
);

DROP TABLE IF EXISTS tbl_user_permission CASCADE;
CREATE TABLE tbl_user_permission (
    user_id UUID REFERENCES tbl_users(id),
    permission_id UUID REFERENCES tbl_permission(id),
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id)
);

DROP TABLE IF EXISTS tbl_api_tokens CASCADE;
CREATE TABLE tbl_api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES tbl_users(id),
    token VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tbl_notifications CASCADE;
CREATE TABLE tbl_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES tbl_users(id),
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    data JSONB NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS tbl_gateways CASCADE;
CREATE TABLE tbl_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NULL REFERENCES tbl_sites(id),
    name VARCHAR(100),
    mac_address VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45) NULL,
    status VARCHAR(20),
    last_seen_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Buat trigger audit untuk devices
CREATE OR REPLACE FUNCTION log_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO tbl_audit_logs (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::JSONB);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO tbl_audit_logs (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO tbl_audit_logs (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW)::JSONB);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devices_audit ON tbl_devices;
CREATE TRIGGER devices_audit
AFTER INSERT OR UPDATE OR DELETE ON tbl_devices
FOR EACH ROW EXECUTE FUNCTION log_audit_trigger();

\dt
EOF