// config/influxdb.config.js
module.exports = {
  buckets: {
    telemetry: {
      name: 'telemetry',
      retention: '30d',
      measurements: ['power', 'voltage', 'current', 'energy', 'frequency', 'temperature', 'battery', 'irradiance', 'status']
    },
    telemetry_aggregated: {
      name: 'telemetry_aggregated',
      retention: '180d',
      measurements: ['power', 'energy']
    },
    telemetry_daily: {
      name: 'telemetry_daily',
      retention: '5y',
      measurements: ['energy']
    },
    telemetry_yearly: {
      name: 'telemetry_yearly',
      retention: '10y',
      measurements: ['energy']
    }
  }
};
