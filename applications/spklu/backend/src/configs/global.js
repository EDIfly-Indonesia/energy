const db = require('../services/database.service');
const { query } = db;

global.gppn = 11;
// PBJT-TL TIDAK lagi global: tarifnya per daerah di `t_area.pbjt` dan dibaca
// saat request oleh fn_biaya_transaksi (UU HKPD: PPJ/PJU dilebur ke PBJT-TL).
global.gwallet_admin = 3;
global.gwallet_admin_sandbox = 3;

async function getsetting() {
  try {
    const rows = await query('SELECT * FROM t_setting');
    for (const row of rows) {
      if (row.nama_setting === 'ppn') global.gppn = row.value_setting;
      if (row.nama_setting === 'admin_wallet') global.gwallet_admin = row.value_setting;
      if (row.nama_setting === 'admin_wallet_sandbox') global.gwallet_admin_sandbox = row.value_setting;
    }
  } catch (err) {
    console.error('[global.getsetting]', err.message);
  }
}

getsetting();

module.exports = {};
