module.exports = {
  apps: [
    {
      name: 'plts-backend',
      script: './src/app.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false, // Disabled due to resource contention causing crashes
      ignore_watch: ['node_modules', 'logs', 'tmp'],
      env: {
        NODE_ENV: 'development',
        PORT: 9001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      kill_timeout: 3000,
      listen_timeout: 3000,
      shutdown_with_message: true,
    },
    {
      name: 'plts-aggregator-worker',
      script: './src/aggregator-worker-launcher.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'tmp'],
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/aggregator-error.log',
      out_file: './logs/aggregator-out.log',
      log_file: './logs/aggregator-combined.log',
      time: true,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      listen_timeout: 5000,
      shutdown_with_message: true,
    },
    {
      name: 'plts-telemetry-validator',
      script: './src/telemetry-validator-launcher.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'tmp'],
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/validator-error.log',
      out_file: './logs/validator-out.log',
      log_file: './logs/validator-combined.log',
      time: true,
      max_memory_restart: '256M',
      kill_timeout: 5000,
      listen_timeout: 5000,
      shutdown_with_message: true,
    }
  ]
};