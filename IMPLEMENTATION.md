# IMPLEMENTATION PLAN & ENGINEERING ROADMAP
## Platform Monitoring & Analytics PLTS Terintegrasi

---

| Document Detail | Information |
| :--- | :--- |
| **Project Name** | PLTS & Energy Infrastructure Monitoring System |
| **Document Version** | v1.0.0 |
| **Execution Environment** | Single Node Enterprise / Multi-Container Docker Environment |
| **Root Directory Layout** | `/opt/energy` |
| **Status** | Active Operational Blueprint |

---

## 1. Directory Structure Blueprint

Seluruh sistem wajib disiapkan mengikuti struktur direktori terpusat di `/opt/energy`:

```
/opt/energy
├── applications/
│   ├── plts/
│   │   ├── api/                # Express.js / Node.js Backend API
│   │   ├── web/                # Vue.js 3 / Vite Web Frontend
│   │   ├── worker/             # Telemetry Consumer & Ingestion Workers
│   │   └── scheduler/          # Cron jobs & Aggregation tasks
│   ├── spklu/                  # Modul Tambahan SPKLU
│   └── shared/                 # Shared libraries (Notification, Auth, Gateway)
├── backup/                     # Lokasi Backup Terjadwal
│   ├── config/
│   ├── docker/
│   ├── influxdb/
│   ├── postgres/
│   ├── rabbitmq/
│   └── ssl/
├── data/                       # Volume Persistent Docker
│   ├── grafana/
│   ├── influxdb/
│   ├── kafka/
│   ├── loki/
│   ├── postgres/
│   │   └── initdb/             # Auto-execution DDL scripts
│   ├── rabbitmq/
│   ├── redis/
│   └── uploads/
├── deployment/                 # Environment Manifests
│   ├── development/
│   ├── staging/
│   └── production/
├── docs/                       # Baseline System Audit Reports
│   └── baseline/
├── infrastructure/
│   ├── compose/                # Docker Compose Modular Files
│   │   ├── core.yml
│   │   ├── database.yml
│   │   ├── messaging.yml
│   │   ├── monitoring.yml
│   │   └── proxy.yml
│   ├── config/                 # Configuration Files per Service
│   │   ├── grafana/
│   │   ├── influxdb/
│   │   ├── kafka/
│   │   ├── nginx/
│   │   ├── postgres/
│   │   ├── prometheus/
│   │   ├── rabbitmq/
│   │   └── redis/
│   ├── scripts/                # Maintenance & Healthcheck Scripts
│   ├── secrets/                # Protected Credentials Keys
│   └── ssl/                    # TLS/SSL Certificates
└── logs/                       # System & Application Container Logs
```

---

## 2. Step-by-Step Implementation Roadmap

### Phase 1 — Infrastructure & Server Baseline Preparation
* **VM Provisioning**: Spesifikasi rekomendasi Ubuntu Server 22.04 LTS (Minimal 8 vCPU, 16GB RAM, 250GB SSD).
* **Network & Domain Setup**: Pengaturan DNS A Record ke IP Server, setup reverse proxy Nginx awal.
* **Testing Tools**: Instalasi `MQTTX` untuk verifikasi publikasi pesan MQTT.

### Phase 2 — Linux Operating System Hardening
Eksekusi script hardening berikut:
```bash
# 1. Update Packages & Timezone
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Jakarta

# 2. Install Essential Utilities
sudo apt install -y curl wget git vim nano htop iftop iotop jq tree zip unzip   net-tools dnsutils software-properties-common apt-transport-https ca-certificates   gnupg lsb-release build-essential chrony fail2ban ufw

# 3. Configure Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 1883/tcp comment 'MQTT'
sudo ufw allow 8883/tcp comment 'MQTT SSL'
sudo ufw enable

# 4. Swapfile & Memory Tuning
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Kernel Tuning (/etc/sysctl.conf)
cat << 'EOF' | sudo tee -a /etc/sysctl.conf
fs.file-max = 2097152
vm.max_map_count = 262144
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65536
EOF
sudo sysctl -p
```

### Phase 3 — Docker Platform & Subsystem Networks Deployment
1. **Docker Installation**: Install Docker CE dan Docker Compose Plugin.
2. **Docker Network Subnets Setup**:
   ```bash
   docker network create --driver bridge --subnet 172.30.10.0/24 energy-public
   docker network create --driver bridge --subnet 172.30.20.0/24 energy-core
   docker network create --driver bridge --subnet 172.30.30.0/24 energy-monitoring
   docker network create --driver bridge --subnet 172.30.40.0/24 energy-internal
   ```
3. **Container Naming Standards**:
   * PostgreSQL: `energy-postgres`
   * RabbitMQ: `energy-rabbitmq`
   * Kafka: `energy-kafka`
   * InfluxDB: `energy-influxdb`
   * Redis: `energy-redis`
   * Grafana: `energy-grafana`
   * Core API: `energy-api`

### Phase 4 — RabbitMQ Broker Integration
* **Exchanges**: `energy.events` (Topic), `energy.deadletter` (Direct).
* **Queues**: `notification.queue`, `sms.queue`, `email.queue`, `worker.queue`, `retry.queue`, `deadletter.queue`.
* **Plugins Enabled**:
  ```bash
  rabbitmq-plugins enable rabbitmq_management rabbitmq_mqtt rabbitmq_prometheus rabbitmq_shovel rabbitmq_shovel_management
  ```

### Phase 5 — Kafka Telemetry Streaming Setup
* **Mode**: KRaft Mode (No Zookeeper dependency).
* **Topics**: `telemetry.raw`, `telemetry.parser`, `telemetry.clean`, `telemetry.alarm`, `telemetry.notification`, `telemetry.archive`, `telemetry.ai`.
* **Retention Policy**: 168 Hours (7 Days).

### Phase 6 — PostgreSQL Database & DDL Execution
* Database: `energy_platform`
* User: `energy_app`
* Port: `5432`
* Skema DDL mencakup: `tbl_users`, `tbl_roles`, `tbl_tenants`, `tbl_companies`, `tbl_sites`, `tbl_devices`, `tbl_telemetry_mappings`, `tbl_alarms` (Partitioned), `tbl_audit_logs`, `tbl_vendor_auth`, `tbl_projects`, `tbl_invoices`.

### Phase 7 — InfluxDB Time-Series Setup
* **Buckets**: `telemetry`, `energy`, `power`, `alarm`, `weather`.
* **Retention Policies**:
  * Raw Data (1 minute resolution): 30 hari
  * Aggregated Hourly Data: 180 hari
  * Daily Summary Data: 5 tahun / 10 tahun

### Phase 8 — Redis Cache & Session Broker Setup
* Digunakan untuk Caching API Response, Management Session, OTP Storage, dan Rate Limiting Middleware.

### Phase 9 — API Management & Gateway Layer
* Konfigurasi Nginx Reverse Proxy sebagai API Gateway dengan sertifikat SSL/TLS, WAF rule sederhana, dan Rate Limiter per IP.

### Phase 10 — MQTT Integration Layer
* Konfigurasi broker MQTT (via RabbitMQ MQTT plugin / EMQX) dengan struktur topik:
  `energy/{tenant_id}/{site_id}/{device_id}`

### Phase 11 — Parser Engine Implementation
* Implementasi modul parser terisolasi untuk menerjemahkan payload spesifik dari vendor (Sungrow, Huawei, Growatt, Goodwe, SMA, Custom Modbus) menjadi format standar platform.

### Phase 12 — Web Dashboard Deployment
* Build dan deployment aplikasi Vue.js 3 / Vite yang terintegrasi dengan REST API Backend.

### Phase 13 — Monitoring & Observability Stack Setup
* Deployment Prometheus, Grafana, Loki, AlertManager untuk pemantauan kesehatan container, RAM, CPU, Queue Lag, dan Database IOPS.

---

## 3. Environment Variables Template (`.env`)

```ini
# ============================================
# GLOBAL SYSTEM ENVIRONMENT CONFIGURATION
# ============================================
TZ=Asia/Jakarta
NODE_ENV=production

# POSTGRESQL CONFIGURATION
POSTGRES_CONTAINER=energy-postgres
POSTGRES_DB=energy_platform
POSTGRES_USER=energy_app
POSTGRES_PASSWORD=Pltsapp2026**
POSTGRES_PORT=5432

# INFLUXDB CONFIGURATION
INFLUXDB_CONTAINER=energy-influxdb
INFLUXDB_URL=http://energy-influxdb:8086
INFLUXDB_USER=energy_admin
INFLUXDB_PASSWORD=Pltsapp2026**
INFLUXDB_ORG=energy_platform
INFLUXDB_BUCKET=telemetry
INFLUXDB_PORT=8086
INFLUX_TOKEN=your-generated-super-secret-token

# RABBITMQ CONFIGURATION
RABBITMQ_CONTAINER=energy-rabbitmq
RABBITMQ_USER=energy_mq
RABBITMQ_PASSWORD=Pltsapp2026**
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672

# KAFKA CONFIGURATION
KAFKA_CONTAINER=energy-kafka
KAFKA_PORT=9092
KAFKA_LOG_RETENTION_HOURS=168

# REDIS CONFIGURATION
REDIS_CONTAINER=energy-redis
REDIS_PASSWORD=Pltsapp2026**
REDIS_PORT=6379
```
