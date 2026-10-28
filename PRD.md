# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Platform Monitoring & Analytics PLTS Terintegrasi (Energy Platform)

---

| Document Detail | Information |
| :--- | :--- |
| **Project Name** | PLTS & Energy Infrastructure Monitoring System |
| **Document Version** | v1.0.0 |
| **Target Infrastructure** | Multi-Tenant Smart Energy Engine (`/opt/energy`) |
| **Lead Architect** | ESI Platform Engineering Team |
| **Status** | Approved for Implementation |
| **Last Updated** | August 2026 |

---

## 1. Executive Summary & Vision

### 1.1 Executive Summary
Sistem Monitoring PLTS Terintegrasi adalah platform enterprise multi-tenant yang dirancang untuk mengonsolidasi, memproses, menganalisis, dan memvisualisasikan data telemetri real-time dari ribuan Pembangkit Listrik Tenaga Surya (PLTS) dan infrastruktur energi pendukung (seperti SPKLU) di seluruh Indonesia. Platform ini mendukung ingestion data bervolume tinggi, penanganan keragaman perangkat vendor (Inverter, Smart Meter, Weather Station, Baterai), serta menyajikan dashboard analitik terpadu untuk pengawasan operasional, manajemen alarm, dan pelaporan finansial/billing.

### 1.2 Vision Statement
Menjadi platform sistem operasi energi (*Energy OS*) yang andal, scalable, dan secure yang mampu menghubungkan ribuan aset PLTS terdistribusi di Indonesia ke dalam satu ekosistem pengawasan terpusat berbasis *event-driven architecture*.

---

## 2. Problem Statement & Objectives

### 2.1 Problem Statement
* **Fragmentasi Vendor**: Perangkat PLTS di lapangan berasal dari berbagai produsen (Sungrow, Huawei, Growatt, Goodwe, SMA, ABB, Schneider) dengan protokol dan format API/Modbus yang berbeda-beda.
* **Skalabilitas & Bottleneck Data**: Telemetri detik-ke-detik memicu beban penulisan data yang sangat tinggi (High Ingestion Rate) yang sering membuat basis data relasional konvensional mengalami kemacetan (*locking*).
* **Isolasi Multi-Tenant**: Kebutuhan untuk menyajikan data secara terkontrol kepada multi-perusahaan (misal: Charoen Pokphand Group, Mitratel) dengan hak akses yang terisolasi aman (*strict multi-tenancy*).
* **Deteksi Kegagalan Lambat**: Terlambatnya penganalisisan sinyal alarm dari lapangan yang mengakibatkan kerugian produksi daya (*lost yield*).

### 2.2 Product Objectives
1. **Unified Ingestion Engine**: Memunculkan *Parser Engine* modular yang mampu mentransformasi payload heterogen vendor menjadi skema telemetri terstandar (*Standardized Telemetry Schema*).
2. **High-Performance Architecture**: Mengadopsi arsitektur hybrid storage (PostgreSQL untuk Master Data, InfluxDB untuk Time-Series Data, Redis untuk Real-time Cache/Session).
3. **Decoupled Event Streaming**: Menggunakan Apache Kafka untuk log event telemetri berkecepatan tinggi dan RabbitMQ untuk antrean tugas asinkron (Notifikasi, SMS, Email, Retry Jobs).
4. **Comprehensive RBAC & Security**: Menyediakan kontrol akses berbasis peran (RBAC) 6-tingkat untuk menjamin keamanan isolasi tenant.

---

## 3. Architecture & High-Level Design

### 3.1 Platform Architecture Overview
Sistem dibangun dengan arsitektur mikro/layanan terdecouple yang berjalan di atas kontainer Docker Compose di lingkungan Linux Server (`/opt/energy`).

```
[Field Inverters & Sensors] 
       │ (Modbus/RS485/MQTT)
       ▼
[Data Collection Gateway / IoT Gateway]
       │
       ▼
[Nginx API Gateway & WAF]
       │
       ├───────────────────────────────┐
       ▼                               ▼
[Data Parsing Engine]         [Backend Core API]
       │                               │
       ├──► Kafka (telemetry.raw)      ├──► PostgreSQL (Master & Partitioned Alarms)
       ├──► InfluxDB (Time-series)     ├──► Redis (Cache & Session)
       └──► RabbitMQ (Alarms/Notif)    └──► MinIO/Local Storage (Reports/Uploads)
                                               │
                                               ▼
                                   [Web & Mobile Dashboard]
```

### 3.2 Key Infrastructure Components
* **API Gateway & Routing**: Nginx (WAF, Rate Limiting, SSL Termination).
* **Event Streaming & Ingestion**: Apache Kafka (KRaft mode, Retention 7 Hari).
* **Task Broker & Queue**: RabbitMQ (Management, AMQP, MQTT Plugin, Shovel, Prometheus Plugin).
* **Primary Relational DB**: PostgreSQL 17 (Partitioning, Row Level Security, Triggers Audit Log).
* **Time-Series DB**: InfluxDB 2.7 (Buckets: `telemetry`, `energy`, `power`, `alarm`, `weather`).
* **Caching & In-Memory DB**: Redis 7 Alpine (TTL Cache, Session, Rate Limiter).
* **Observability Stack**: Prometheus, Grafana, Loki, Cadvisor, Node Exporter, AlertManager.

---

## 4. Functional Requirements

### 4.1 Multi-Tenant & Organizational Hierarchy
Sistem harus mengakomodasi hierarki organisasi 4-tingkat:
1. **Tenant**: Entitas terbesar (contoh: Enterprise/Government Client).
2. **Company / Organization**: Anak perusahaan atau divisi di bawah Tenant.
3. **Site / Plant**: Lokasi fisik PLTS dengan koordinat GIS dan kapasitas (kWp).
4. **Device**: Perangkat fisik (Inverter, Battery, Meter, Weather Station) yang terhubung ke Site.

### 4.2 Ingestion & Parser Engine
* **Vendor Support**: Mendukung parser untuk Sungrow (API OpenApi V1/V2), Huawei, Growatt, Goodwe, SMA, ABB, Schneider, serta Custom Modbus/RTU.
* **Data Mapping**: Tabel `telemetry_mappings` dan `telemetry_vendor_mappings` mentransformasi `vendor_key` (misal: `m_p_123`) menjadi `standard_key` (misal: `power_active`).
* **Data Normalization**: Mengubah seluruh tipe data menjadi standar FLOAT/INT/BOOLEAN dengan timestamp terstandar UTC/Asia/Jakarta.

### 4.3 Alarm & Event Processing
* **Severity Levels**: `CRITICAL`, `WARNING`, `INFO`.
* **Automated Escalation**: Alarm berstatus `CRITICAL` memicu pendorongan antrean RabbitMQ `alarm.critical` untuk langsung diteruskan via WhatsApp/Email/SMS Gateway.
* **Partitioning**: Tabel `alarms` di-partition berbasis *Range Partitioning* per kuartal (`alarms_2026_q3`, `alarms_2026_q4`).

### 4.4 Dashboard & Visualization
* **National Level**: Peta GIS interaktif seluruh situs PLTS Indonesia dengan indikator status kesehatan (*Health Indicator*).
* **Tenant Level**: Summary kapasitas total (kWp), total produksi hari ini (kWh), perfomance ratio (PR), dan ketersediaan perangkat.
* **Site & Device Level**: Real-time power curve, voltage/current per MPPT, temperature, irradiance, serta log alarm aktif.
* **Export & Reporting**: Automated generation laporan periodik (Harian, Bulanan, Tahunan) dalam format PDF/Excel.

### 4.5 Invoicing & Commercial Module
* Mengelola tarif listrik (`tbl_rate`), proyek (`tbl_projects`), serta pembuatan invoice otomatis untuk tenant (`tbl_invoices` & `tbl_invoices_items`) berbasis konsumsi/produksi energi.

---

## 5. Non-Functional Requirements

### 5.1 Performance & Scalability
* **Ingestion Throughput**: Mampu memproses minimal 5,000 telemetry messages/second.
* **API Latency**: Response time API core (Cached) < 100ms; Complex Analytics Query < 1.5s.
* **Database Partitioning**: Auto-partitioning harian/bulanan pada InfluxDB dan kuartalan pada PostgreSQL.

### 5.2 Security & Compliance
* **Authentication**: OAuth2 / JWT (JSON Web Tokens) dengan mekanisme *Refresh Token*.
* **API Security**: Rate limiting (Redis-backed), CORS protection, Helmet security headers.
* **Audit Trail**: Trigger otomatis PostgreSQL (`log_audit_trigger`) mencatat seluruh aksi `INSERT`, `UPDATE`, `DELETE` ke dalam `tbl_audit_logs`.
* **OS Hardening**: UFW Firewall ketat, Fail2ban, SSH Key-only access, Kernel Tuning.

### 5.3 Availability & Disaster Recovery
* **Target Uptime**: 99.9% uptime untuk API & Data Ingestion.
* **Backup Strategy**: Daily automated logical backup (PostgreSQL `pg_dump`, InfluxDB backup, RabbitMQ config definition export).

---

## 6. User Roles & Permission Matrix (RBAC)

| Role Name | Description | Access Scope |
| :--- | :--- | :--- |
| **Super Administrator** | ESI Platform Developer | Full System, Infrastructure, All Tenants |
| **Administrator** | ESI Operations Team | Platform Operational, All Tenants, User Mgt |
| **Tenant Admin** | Client Administrator | Single Tenant Scope (All Companies, Sites, Devices) |
| **Tenant User** | Client Operational Staff | Assigned Sites & Devices (Read-Only + Acknowledge) |
| **Installer / Commissioning** | Field Engineer | Device Registration, Provisioning, Test Connection |
| **Finance** | Billing & Finance Team | Invoices, Rates, Financial Reports |

---

## 7. Telemetry & Data Dictionary Standards

| Standard Key | Data Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `power_active` | FLOAT | kW | Daya aktif yang dihasilkan saat ini |
| `power_reactive` | FLOAT | kVAR | Daya reaktif |
| `voltage_l1` / `l2` / `l3` | FLOAT | V | Tegangan AC per fasa |
| `current_l1` / `l2` / `l3` | FLOAT | A | Arus AC per fasa |
| `daily_energy` | FLOAT | kWh | Produksi energi akumulasi harian |
| `total_energy` | FLOAT | MWh | Produksi energi akumulasi seumur hidup |
| `grid_frequency` | FLOAT | Hz | Frekuensi jaringan listrik |
| `inverter_temp` | FLOAT | °C | Suhu internal inverter |
| `irradiance` | FLOAT | W/m² | Radiasi sinar matahari (Weather station) |
