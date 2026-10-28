module.exports = {
  apps: [
    {
      name: 'spklu-backend',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'tmp'],
      env: {
        NODE_ENV: 'production',
        // PostgreSQL dijalankan di container `energy-postgres` (docker).
        // Dari node biasa (pm2) hostname docker tidak ter-resolve, jadi
        // pakai 127.0.0.1 (container mem-publish 5432 ke host).
        DB_HOST_POSTGRE: '127.0.0.1',
        DB_PORT_POSTGRE: '5432',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      kill_timeout: 5000,
    },
  ],
};
