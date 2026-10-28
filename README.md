# PLTS & Energy Infrastructure Monitoring Platform

![Platform Architecture](https://img.shields.io/badge/Architecture-Event--Driven-blue)
![Docker Compose](https://img.shields.io/badge/Docker-Compose_v2-2496ED)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1)
![InfluxDB](https://img.shields.io/badge/InfluxDB-2.7-22ADF6)
![Kafka](https://img.shields.io/badge/Kafka-7.6_KRaft-231F20)

Platform Monitoring PLTS Terintegrasi adalah solusi enterprise berbasis *event-driven microservices* yang dirancang untuk mengelola, mengonsolidasi, memproses, dan memvisualisasikan data telemetri real-time dari berbagai pembangkit listrik tenaga surya (PLTS) dan perangkat energi di seluruh Indonesia.

---

## 🌟 Fitur Utama

- **Multi-Tenant Architecture**: Pemisahan data terisolasi untuk Tenant, Company, Site, hingga Device.
- **Unified Telemetry Ingestion**: Menerjemahkan data dari berbagai vendor (Sungrow, Huawei, Growatt, Goodwe, SMA, Modbus) ke skema terstandar.
- **Hybrid Storage Engine**: 
  - **PostgreSQL 17**: Menyimpan Master Data, RBAC, Invoices, dan Log Audit.
  - **InfluxDB 2.7**: Menyimpan data Time-Series Telemetri berkecepatan tinggi.
  - **Redis 7**: Caching real-time dashboard dan session management.
- **Event Streaming & Messaging**: Apache Kafka untuk pemrosesan telemetri masif dan RabbitMQ untuk antrean tugas/notifikasi.
- **Role-Based Access Control (RBAC)**: Kustomisasi akses hingga 6 tingkatan peran pengguna.
- **Hermes AI Integration**: Mendukung otomatisasi pemantauan dan diagnosa infrastruktur melalui Hermes AI Agent Skill.

---

## 📁 Struktur Direktori Platform (`/opt/energy`)

```
/opt/energy
├── applications/        # Aplikasi Bisnis (plts, spklu, shared)
├── backup/              # Direktori Backup Terjadwal (DB, Config, SSL)
├── data/                # Persistent Volume Data Container
├── deployment/          # Environment Configs (dev, staging, prod)
├── docs/                # Dokumentasi & Baseline Audit
├── infrastructure/      # Docker Compose & Service Configurations
└── logs/                # Container & Application Logs
```

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prerequisites
Pastikan server Anda memenuhi spesifikasi minimum:
- OS: Ubuntu Server 22.04 LTS
- CPU: Minimal 8 vCPU
- RAM: Minimal 16 GB
- Disk: Minimal 250 GB SSD
- Software: Docker Engine v24+, Docker Compose v2.20+, Git, Curl.

### 2. Deployment Infrastruktur Inti
1. **Clone repository ke direktori target**:
   ```bash
   sudo mkdir -p /opt/energy
   sudo chown -R $USER:$USER /opt/energy
   cd /opt/energy
   # Clone repo content here
   ```

2. **Buat Docker External Networks**:
   ```bash
   docker network create --driver bridge --subnet 172.30.10.0/24 energy-public
   docker network create --driver bridge --subnet 172.30.20.0/24 energy-core
   docker network create --driver bridge --subnet 172.30.30.0/24 energy-monitoring
   docker network create --driver bridge --subnet 172.30.40.0/24 energy-internal
   ```

3. **Jalankan Platform Core Services**:
   ```bash
   cd /opt/energy/infrastructure/compose
   docker compose -f core.yml up -d
   ```

4. **Verifikasi Kontainer**:
   ```bash
   docker ps
   ```

---

## 🛠️ Integrasi AI Agent (Hermes Skill)

Untuk mengaktifkan kemampuan otomatisasi Hermes AI Agent pada platform ini, salin file SKILL ke direktori Hermes:
```bash
mkdir -p ~/.hermes/skills/productivity/plts_energy/
cp docs/3_Hermes_SKILL.md ~/.hermes/skills/productivity/plts_energy/SKILL.md
```

---

## 📄 Dokumentasi Terkait

- [Product Requirement Document (PRD)](./1_Product_Requirement_Document.md)
- [Implementation Plan & Engineering Roadmap](./2_Implementation_Plan.md)
- [Hermes SKILL Specification](./3_Hermes_SKILL.md)
- [Hermes MCP Memory Schema](./4_Hermes_MEMORY.json)

---

## 🔒 Lisensi & Hak Cipta
© 2026 ESI Energy Solution Engineering Team. All Rights Reserved.
