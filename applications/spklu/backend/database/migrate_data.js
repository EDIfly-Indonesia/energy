'use strict';

/**
 * Migrate the REMAINING seed data from db.sql (MySQL dump) → PostgreSQL.
 *
 * The only seed tables with data that were NOT yet migrated by
 * migrate_to_postgres.sql are: t_bankwithdrawl, t_berita, t_jenismember.
 * (t_area/t_carabayar/t_fasilitas/t_mitra/t_setting/t_users_admin/t_user_type/
 *  t_user_access were already seeded.)
 *
 * Run:  DB_HOST_POSTGRE=localhost node database/migrate_data.js
 */

const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  host: process.env.DB_HOST_POSTGRE || 'localhost',
  user: process.env.DB_USER_POSTGRE,
  password: process.env.DB_PASSWORD_POSTGRE,
  database: process.env.DB_DATABASE_POSTGRE,
  port: Number(process.env.DB_PORT_POSTGRE || 5432),
});

// MySQL dump string unescape: \n \r \t \\ \' \" → real chars
function unescapeMySQL(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === 'n') { out += '\n'; i++; }
      else if (n === 'r') { out += '\r'; i++; }
      else if (n === 't') { out += '\t'; i++; }
      else if (n === '\\') { out += '\\'; i++; }
      else if (n === "'") { out += "'"; i++; }
      else if (n === '"') { out += '"'; i++; }
      else { out += n; i++; }
    } else {
      out += s[i];
    }
  }
  return out;
}

// Split a single tuple body on top-level commas (not inside single quotes)
function splitTopLevel(s) {
  const parts = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) { cur += c + s[i + 1]; i++; continue; }
    if (c === "'") { inStr = !inStr; cur += c; continue; }
    if (c === ',' && !inStr) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') parts.push(cur.trim());
  return parts;
}

function parseValue(v) {
  if (v === 'NULL' || v === 'null') return null;
  if (v.startsWith("'") && v.endsWith("'")) return unescapeMySQL(v.slice(1, -1));
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

// Extract the INSERT (columns + tuple bodies) for a table from db.sql,
// delimited by the "/*Data for the table `tbl` */" marker and the next "/*".
function extractInsert(sql, table) {
  const marker = `/*Data for the table \`${table}\` */`;
  const start = sql.indexOf(marker);
  if (start === -1) return null;
  const after = sql.slice(start + marker.length);
  const end = after.indexOf('/*');
  const block = (end === -1 ? after : after.slice(0, end)).trim();
  if (!/insert/i.test(block)) return null; // empty seed (no data)

  const m = block.match(/insert\s+into\s+`[^`]+`\s*\(([^)]*)\)\s*values\s*([\s\S]*?)\s*;?\s*$/i);
  if (!m) return null;
  const cols = m[1].split(',').map((c) => c.replace(/`/g, '').trim());
  const body = m[2];

  // walk body, collect each top-level (...) tuple
  const rows = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '\\' && i + 1 < body.length) { if (depth >= 1) cur += c + body[i + 1]; i++; continue; }
    if (c === "'") { inStr = !inStr; if (depth >= 1) cur += c; continue; }
    if (!inStr) {
      if (c === '(') { depth++; if (depth === 1) { cur = ''; continue; } }
      if (c === ')') { depth--; if (depth === 0) { rows.push(cur); continue; } }
    }
    if (depth >= 1) cur += c;
  }
  return { cols, rows };
}

async function migrate(table) {
  const sql = fs.readFileSync('./database/db.sql', 'utf8');
  const parsed = extractInsert(sql, table);
  if (!parsed) { console.log(`${table}: no seed data`); return; }

  const colList = parsed.cols.join(', ');
  const ph = parsed.cols.map((_, i) => `$${i + 1}`).join(', ');
  let ok = 0;
  for (const row of parsed.rows) {
    const vals = splitTopLevel(row).map(parseValue);
    if (vals.length !== parsed.cols.length) {
      console.warn(`${table}: col/row mismatch (${vals.length} vs ${parsed.cols.length}) — skipping`);
      continue;
    }
    try {
      await pool.query(`INSERT INTO ${table} (${colList}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
      ok++;
    } catch (e) {
      console.error(`${table}: ${e.message}`);
    }
  }
  console.log(`${table}: ${ok} row(s) inserted`);
}

(async () => {
  await migrate('t_bankwithdrawl');
  await migrate('t_berita');
  await migrate('t_jenismember');
  await pool.end();
})();
