module.exports = {
  apps: [
    {
      name: 'plts-mqtt-gateway',
      script: './inverter_simulator.py',
      interpreter: '/opt/energy/applications/gateway/mqtt-client/venv/bin/python',
      args: '--all --interval 180',
      cwd: '/opt/energy/applications/gateway/mqtt-client',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    // plts-telemetry-consumer dinonaktifkan (2026-09-09):
    // consumer ini menulis telemetri langsung ke InfluxDB TANPA validasi
    // device/site, menduplikasi jalur tulis plts-telemetry-validator yang
    // sudah memvalidasi ke PostgreSQL. Jalur tak-tervalidasi ini adalah
    // akar polusi data site-salah ke InfluxDB.
  ]
};
