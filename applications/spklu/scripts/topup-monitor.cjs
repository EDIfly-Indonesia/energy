'use strict';
/**
 * Monitor alur topup (local wallet) untuk sesi testing EZ Charge.
 *
 * Menampilkan secara real-time:
 *   1. Snapshot awal: t_topup terbaru, saldo t_saldo_user, status t_user_mobile.
 *   2. Request keluar/masuk terkait pembayaran dari log pm2 (callback, doku,
 *      virtual-account, payment, topup).
 *   3. Perubahan baris t_topup (order baru / unpaid->paid) lewat polling DB.
 *
 * Murni membaca — tidak mengubah data apa pun. Aman di produksi.
 *
 * Jalankan: node scripts/topup-monitor.cjs
 * Opsi:    --once  (snapshot lalu keluar)   --log <path>  (file log tertentu)
 *          --every <detik> (interval polling DB, default 3)
 */
const path = require('path');
const fs = require('fs');

const BK = path.resolve(__dirname, '..', 'backend');
require(path.join(BK, 'node_modules/dotenv')).config({ path: path.join(BK, '.env') });
process.env.DB_HOST_POSTGRE = '127.0.0.1';

const db = require(path.join(BK, 'src/services/database.service.js'));
const { query } = db;

const ONCE = process.argv.includes('--once');
const EVERY = Number(process.argv[process.argv.indexOf('--every') + 1] || 3) || 3;

// Log pm2 instance aktif (yang paling baru tidak selalu yang terakhir diurut
// secara angka; pakai yang mtime paling baru).
function cariLog() {
  const i = process.argv.indexOf('--log');
  const arg = i >= 0 ? process.argv[i + 1] : null;
  if (arg) return arg;
  const dir = path.join(BK, 'logs');
  let best = null;
  for (const f of fs.readdirSync(dir)) {
    if (!/pm2-(combined|out)-\d+\.log$/.test(f)) continue;
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (!best || s.mtimeMs > best.mtimeMs) best = { p, s };
  }
  return best ? best.p : null;
}

const c = (k) => (s) => (process.stdout.isTTY ? `\x1b[${k}m${s}\x1b[0m` : String(s));
const hijau = c('32'), merah = c('31'), kuning = c('33'), cyan = c('36'), dim = c('2'), bold = c('1'), biru = c('34');

const rp = (n) => Number(n ?? 0).toLocaleString('id-ID');

function stempel(t = new Date()) {
  // WIB = UTC+7
  const wib = new Date(t.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().replace('T', ' ').slice(0, 19) + ' WIB';
}

const fmtTgl = (v) => {
  if (!v) return '-';
  const t = new Date(v);
  const wib = new Date(t.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().replace('T', ' ').slice(0, 19);
};

// Pola baris log yang relevan dengan pembayaran (callback + permintaan keluar).
const POLA_LOG = /callback|doku|virtual-account|\bpayout\b|payment|topup|\bva\b|checkout|signature|\bpaid\b|batal|refund/i;

let offsetFile = null;

function bacaLogBaru() {
  const p = cariLog();
  if (!p) return [];
  const ukuran = fs.statSync(p).size;
  if (offsetFile === null) {
    // baca 8 KB terakhir saja saat start
    offsetFile = Math.max(0, ukuran - 8192);
  }
  if (ukuran < offsetFile) offsetFile = 0; // file dirotasi
  if (ukuran === offsetFile) return [];
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(ukuran - offsetFile);
  fs.readSync(fd, buf, 0, buf.length, offsetFile);
  fs.closeSync(fd);
  offsetFile = ukuran;
  return buf.toString('utf8').split('\n');
}

let idTopupTerakhir = null;

async function snapshot() {
  console.log(bold('\n=== SNAPSHOT TOPUP / SALDO ==='));
  console.log(dim(`  waktu: ${stempel()}  log: ${cariLog()}`));

  // saldo & wallet
  const sal = await query(
    `SELECT u.id_user, u.email, u.nama, u.id_wallet, u.wallet_status,
            COALESCE(s.saldo,0)::float AS saldo
       FROM t_user_mobile u
       LEFT JOIN t_saldo_user s ON s.id_user = u.id_user
      WHERE u.deleted_at IS NULL ORDER BY u.id_user`
  );
  if (!sal.length) {
    console.log('  (belum ada pelanggan)');
  } else {
    for (const s of sal) {
      console.log(`  ${bold('#' + s.id_user)} ${s.email}` +
        `  wallet=${cyan(s.id_wallet || '-')}(${s.wallet_status || '-'})` +
        `  saldo=${hijau('Rp ' + rp(s.saldo))}`);
    }
  }

  // topup terbaru
  const tp = await query(
    `SELECT t.id_topup, t.no_trans, t.id_user, u.email,
            t.id_carabayar, cb.nama_carabayar, t.jumlah::float,
            t.status_bayar, t.status_topup, t.tgl_topup
       FROM t_topup t
       LEFT JOIN t_user_mobile u ON u.id_user = t.id_user
       LEFT JOIN t_carabayar cb ON cb.id_carabayar = t.id_carabayar
      ORDER BY t.id_topup DESC LIMIT 8`
  );
  console.log('');
  if (!tp.length) {
    console.log('  t_topup: kosong');
    idTopupTerakhir = null;
  } else {
    for (const t of tp) {
      const st = t.status_bayar === 'paid' ? hijau('PAID') : (t.status_bayar === 'pending' ? kuning('PENDING') : merah('UNPAID'));
      console.log(`  topup#${t.id_topup} ${t.no_trans} ${cyan(t.nama_carabayar || t.id_carabayar)} Rp ${rp(t.jumlah)} ${st} ${dim(fmtTgl(t.tgl_topup))}`);
    }
    idTopupTerakhir = tp[0].id_topup;
  }

  // saluran aktif
  const cb = await query(`SELECT id_carabayar, nama_carabayar, bank FROM t_carabayar WHERE status=1 ORDER BY id_carabayar`);
  console.log(dim(`  channel aktif: ${cb.map((x) => x.bank || x.nama_carabayar).join(', ') || '(tidak ada)'}`));
}

async function cekTopupBaru() {
  const baru = await query(
    `SELECT t.id_topup, t.no_trans, t.id_user, cb.nama_carabayar, t.jumlah::float,
            t.status_bayar, t.status_topup
       FROM t_topup t
       LEFT JOIN t_carabayar cb ON cb.id_carabayar = t.id_carabayar
      WHERE t.id_topup > COALESCE($1, 0)
      ORDER BY t.id_topup`, [idTopupTerakhir ?? 0]
  );
  idTopupTerakhir = baru.length ? baru[baru.length - 1].id_topup : idTopupTerakhir;
  for (const t of baru) {
    const st = t.status_bayar === 'paid' ? hijau('PAID') : kuny(t.status_bayar);
    console.log(`  ${hijau('TOPUP BARU')} #${t.id_topup} ${t.no_trans} ${cyan(t.nama_carabayar || t.id_carabayar)} Rp ${rp(t.jumlah)} ${st} (user ${t.id_user})`);
  }

  // transisi unpaid/pending -> paid untuk topup lama yang sedang dipantau
  const trans = await query(
    `SELECT id_topup, status_bayar, status_topup, tgl_bayar FROM t_topup
      WHERE status_bayar <> 'unpaid' ORDER BY id_topup DESC LIMIT 5`
  );
  for (const t of trans) {
    if (t.status_bayar === 'paid') {
      console.log(`  ${hijau('PEMBAYARAN DITERIMA')} topup#${t.id_topup} -> PAID ${dim('tgl_bayar ' + fmtTgl(t.tgl_bayar))}`);
    }
  }
}

function kuny(s) { return s === 'pending' ? kuning('PENDING') : merah(String(s).toUpperCase()); }

async function main() {
  await snapshot();

  if (ONCE) {
    await db.pool.end();
    return;
  }

  console.log(bold('\n=== MEMANTAU === ') + dim('(Ctrl+C untuk keluar)') + '\n');

  const tick = async () => {
    // 1. log baru
    for (const baris of bacaLogBaru()) {
      if (POLA_LOG.test(baris)) {
        const isErr = /error|fail|reject|invalid|ditolak/i.test(baris);
        console.log(`${dim(stempel())} ${isErr ? merah('LOG') : cyan('LOG')} ${isErr ? merah(baris.slice(0, 240)) : dim(baris.trim().slice(0, 240))}`);
      }
    }
    // 2. polling DB
    try { await cekTopupBaru(); } catch (e) { /* DB bisa sibuk */ }
  };

  await tick();
  setInterval(tick, EVERY * 1000);
}

main().catch(async (e) => {
  console.error(merah('ERROR: ') + e.message);
  if (db.pool) await db.pool.end().catch(() => {});
  process.exit(1);
});