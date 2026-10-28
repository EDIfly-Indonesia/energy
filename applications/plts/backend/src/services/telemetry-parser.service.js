// services/telemetry-parser.service.js
class TelemetryParser {
  /**
   * Parse raw data from vendor to standard format
   */
  static parseVendorData(vendor, rawData) {
    // Get mapping from database
    // This will be implemented with Prisma
    const mapping = this.getVendorMapping(vendor);
    const result = {};

    for (const [vendorKey, standardKey] of Object.entries(mapping)) {
      if (rawData[vendorKey] !== undefined) {
        result[standardKey] = rawData[vendorKey];
      }
    }

    return result;
  }

  /**
   * Get vendor mapping from database
   */
  static async getVendorMapping(vendor) {
    // TODO: Implement with Prisma
    // const prisma = require('../config/database');
    // const mappings = await prisma.vendorMapping.findMany({
    //   where: { brand: { name: vendor } }
    // });
    // return mappings.reduce((acc, m) => {
    //   acc[m.vendorKey] = m.standardKey;
    //   return acc;
    // }, {});
    
    // Temporary mapping for Sungrow
    if (vendor === 'sungrow') {
      return {
        'm_p_active': 'p_active',
        'm_p_reactive': 'p_reactive',
        'm_p_apparent': 'p_apparent',
        'm_v_pv1': 'v_dc1',
        'm_v_pv2': 'v_dc2',
        'm_v_ac': 'v_ac',
        'm_c_pv1': 'c_dc1',
        'm_c_pv2': 'c_dc2',
        'm_c_ac': 'c_ac',
        'm_e_daily': 'e_daily',
        'm_e_total': 'e_total',
        'm_t_inverter': 't_inverter',
        'm_f_grid': 'f_grid'
      };
    }
    return {};
  }
}

module.exports = TelemetryParser;
