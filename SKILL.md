# Hermes SKILL: PLTS Energy Infrastructure Management
> Directory Location: `~/.hermes/skills/productivity/plts_energy/SKILL.md`

```yaml
name: plts_energy
version: 1.0.0
description: Hermes AI Skill for managing, querying, and operationalizing PLTS Energy Infrastructure Platform (/opt/energy)
author: ESI Engineering Team
category: productivity/energy
tools_required:
  - bash
  - postgresql_client
  - influxdb_client
  - docker_cli
```

## 1. Skill Capabilities & Context
Skill ini memberdayakan Hermes AI Agent untuk mengelola dan memantau seluruh infrastruktur platform energi PLTS yang beroperasi di `/opt/energy`. Skill mencakup diagnosa kontainer Docker, pengecekan antrean Kafka/RabbitMQ, query data telemetri InfluxDB, inspeksi master data PostgreSQL, serta pengelolaan parser vendor.

---

## 2. Environment Context & Paths
- **Platform Root**: `/opt/energy`
- **Compose Directory**: `/opt/energy/infrastructure/compose`
- **PostgreSQL Container**: `energy-postgres` (DB: `energy_platform`, User: `energy_app`)
- **InfluxDB Container**: `energy-influxdb` (Org: `energy_platform`)
- **RabbitMQ Container**: `energy-rabbitmq`
- **Kafka Container**: `energy-kafka`

---

## 3. Command Routines & Operations

### 3.1 Infrastructure Healthcheck
Saat pengguna meminta status kesehatan platform atau server:
```bash
# Cek status seluruh container energy platform
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep energy-

# Cek penggunaan resource container
docker stats --no-stream $(docker ps --format "{{.Names}}" | grep energy-)

# Cek log error terbaru pada API backend
docker logs --tail 50 energy-api | grep -i error
```

### 3.2 Database Operations (PostgreSQL)
Saat pengguna meminta informasi tenant, site, device, atau alarm:
```bash
# Query jumlah total site dan total kapasitas terpasang (kWp)
docker exec -i energy-postgres psql -U energy_app -d energy_platform -c   "SELECT COUNT(id) as total_sites, SUM(capacity_kwp) as total_kwp FROM tbl_sites;"

# Query daftar alarm CRITICAL yang belum terselesaikan
docker exec -i energy-postgres psql -U energy_app -d energy_platform -c   "SELECT a.id, d.serial_number, a.severity, a.message, a.created_at    FROM tbl_alarms a JOIN tbl_devices d ON a.device_id = d.id    WHERE a.severity = 'CRITICAL' AND a.resolved_at IS NULL ORDER BY a.created_at DESC LIMIT 10;"
```

### 3.3 Telemetry Operations (InfluxDB)
Saat pengguna meminta data daya real-time atau energi harian:
```bash
# Query daya aktif terbaru (power_active) dari InfluxDB via Flux Query
docker exec -i energy-influxdb influx query   'from(bucket: "telemetry")    |> range(start: -15m)    |> filter(fn: (r) => r["_field"] == "power_active")    |> last()'   --org energy_platform
```

### 3.4 Message Queue & Stream Verification
```bash
# Cek antrean RabbitMQ
docker exec -i energy-rabbitmq rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# Cek daftar topik Kafka
docker exec -i energy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

---

## 4. Vendor Parsing Reference Matrix
Jika agent diminta untuk menambahkan atau memverifikasi parser vendor:
- **Sungrow**: Menerima JSON via REST API (`/openapi/getPowerStationList`). Mapping data via `tbl_telemetry_vendor_mappings`.
- **Huawei / Growatt / Goodwe**: Menerima telemetry via MQTT Topic `energy/{tenant}/{site}/{device}`.
- **Custom Modbus**: Diterima via Modbus-TCP gateway lalu diteruskan ke topic `telemetry.raw`.

---

## 5. Security & Safety Guidelines
- Jangan pernah menampilkan password database secara plain-text dalam respon pengguna.
- Eksekusi query `DELETE` atau `DROP` pada PostgreSQL strictly dilarang tanpa konfirmasi ganda (*Explicit User Confirmation*).
