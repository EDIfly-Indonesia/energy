/**
 * Database Service — single PostgreSQL source (migrated from MySQL).
 * All queries (mobile + admin) now run against the `spklu` database on
 * `energy-postgres`. The legacy MySQL pool has been removed.
 */

const { Pool } = require('pg');
const configPostgre = require('../configs/postgre');

const pool = new Pool(configPostgre);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

/**
 * Run a query and return rows (array). For INSERT/UPDATE/DELETE use `run`.
 * @param {string} text - SQL text with $1..$n placeholders
 * @param {Array} params
 */
async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Run a query and return the full pg result (has .rows and .rowCount).
 * Use for INSERT ... RETURNING / UPDATE / DELETE when you need affected rows.
 */
async function run(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,                 // pg Pool (advanced / transactions)
  poolpostgre: pool,    // legacy alias
  query,                // rows[]
  run,                  // full result
  queryMySQL: query,    // legacy alias (now PostgreSQL-backed)
  queryPostgreSQL: query,
  getMySQLPool: () => pool,
  getPostgreSQLPool: () => pool,
};
