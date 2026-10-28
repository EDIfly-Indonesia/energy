// config/telemetry.fields.js
module.exports = {
  power: {
    fields: [
      'p_active', 'p_reactive', 'p_apparent',
      'p_active_a', 'p_active_b', 'p_active_c',
      'p_export', 'p_import',
      'p_pv1', 'p_pv2', 'p_pv3', 'p_pv4',
      'p_battery_charge', 'p_battery_discharge',
      'p_load'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor', 'phase']
  },
  voltage: {
    fields: [
      'v_dc', 'v_dc1', 'v_dc2', 'v_dc3', 'v_dc4',
      'v_ac', 'v_ab', 'v_bc', 'v_ca',
      'v_an', 'v_bn', 'v_cn',
      'v_battery', 'v_grid'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor', 'phase']
  },
  current: {
    fields: [
      'c_dc', 'c_dc1', 'c_dc2', 'c_dc3', 'c_dc4',
      'c_ac', 'c_a', 'c_b', 'c_c',
      'c_battery'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor', 'phase']
  },
  energy: {
    fields: [
      'e_daily', 'e_total',
      'e_daily_export', 'e_total_export',
      'e_daily_import', 'e_total_import',
      'e_daily_charge', 'e_daily_discharge',
      'e_total_charge', 'e_total_discharge',
      'e_daily_load', 'e_total_load',
      'e_monthly', 'e_yearly'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  frequency: {
    fields: ['f_grid', 'f_ac'],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  temperature: {
    fields: [
      't_env', 't_inverter', 't_battery',
      't_pv', 't_heatsink', 't_boost', 't_cabinet'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  battery: {
    fields: [
      'b_soc', 'b_soh', 'b_capacity',
      'b_charge', 'b_discharge',
      'b_voltage', 'b_current', 'b_temp'
    ],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  irradiance: {
    fields: ['i_poa', 'i_ghi', 'i_dni'],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  status: {
    fields: ['s_device', 's_grid', 's_battery', 's_alarm'],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  },
  others: {
    fields: ['cos_phi', 'thd_v', 'thd_c', 'efficiency'],
    tags: ['device_id', 'site_id', 'tenant_id', 'vendor']
  }
};
