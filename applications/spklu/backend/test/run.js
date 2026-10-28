'use strict';

/**
 * Runner suite test promo.
 *
 *   node test/run.js            -> semua suite
 *   node test/run.js db         -> hanya test DB (tidak butuh server)
 *   node test/run.js api        -> hanya test HTTP (butuh server hidup)
 *   node test/run.js e2e        -> hanya 3 skenario end-to-end
 *
 * DB_HOST_POSTGRE di-set 127.0.0.1 secara default karena pm2 menjalankan
 * backend dengan nilai itu (container Postgres di host yang sama), sedangkan
 * .env berisi nama container `energy-postgres` yang tidak resolve dari host.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const arg = (process.argv[2] || 'all').toLowerCase();

const SUITES = {
  db: ['test/promo.db.test.js'],
  api: ['test/promo.api.test.js'],
  e2e: ['test/promo.e2e.test.js'],
};
const semua = [...SUITES.db, ...SUITES.api, ...SUITES.e2e];

if (!['all', 'db', 'api', 'e2e'].includes(arg)) {
  console.error(`Argumen tidak dikenal: ${arg}\nGunakan: all | db | api | e2e`);
  process.exit(2);
}

const files = arg === 'all' ? semua : SUITES[arg];

// Pastikan file ada sebelum spawn, agar pesan errornya jelas.
for (const f of files) {
  if (!fs.existsSync(path.join(ROOT, f))) {
    console.error(`File test tidak ditemukan: ${f}`);
    process.exit(2);
  }
}

console.log(`Menjalankan ${files.length} file test (mode: ${arg})`);
console.log(`DB host: ${process.env.DB_HOST_POSTGRE || '127.0.0.1 (default runner)'}`);
console.log('');

const r = spawnSync(
  process.execPath,
  ['--test', '--test-concurrency=1', ...files],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_HOST_POSTGRE: process.env.DB_HOST_POSTGRE || '127.0.0.1',
      NODE_ENV: 'test',
    },
  }
);

process.exit(r.status === null ? 1 : r.status);
