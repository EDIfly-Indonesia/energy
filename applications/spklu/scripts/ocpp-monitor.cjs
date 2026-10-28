#!/usr/bin/env node
'use strict';

/**
 * Pemantau event OCPP real-time untuk commissioning mesin charger SPKLU.
 *
 * Membaca log backend (pm2) dan menampilkan setiap event OCPP yang masuk.
 * TIDAK mengubah kode server: murni membaca log, jadi aman dipakai di produksi
 * dan tidak menambah beban ke proses charger.
 *
 * Pakai:
 *   node scripts/ocpp-monitor.cjs                  # ikuti log dari sekarang
 *   node scripts/ocpp-monitor.cjs --replay 40      # tampilkan 40 event terakhir lalu keluar
 *   node scripts/ocpp-monitor.cjs --verbose        # ikut tampilkan ping/pong
 *   node scripts/ocpp-monitor.cjs --no-db          # tanpa query database
 *   node scripts/ocpp-monitor.cjs --log <path>     # pakai file log lain
 *
 * Event yang ditampilkan: CONNECT, DISCONNECT, BOOT, HEARTBEAT, AUTHORIZE,
 * STATUS, START, STOP, METERVALUES, METHOD lain, dan penolakan identity.
 * Baris non-OCPP (job refund, chargingState, error Firebase) disembunyikan
 * supaya event mesin tidak tenggelam.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..', 'backend');

// ---------------------------------------------------------------- argumen

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const VERBOSE = has('--verbose');
const NO_DB = has('--no-db');
const REPLAY = argv.includes('--replay') ? Number(valOf('--replay', '30')) : null;
const LOG = valOf('--log', path.join(BACKEND, 'logs', 'pm2-out-17.log'));

// ---------------------------------------------------------------- warna

const TTY = process.stdout.isTTY;
const c = (code) => (s) => (TTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = c('2');
const bold = c('1');
const red = c('31');
const green = c('32');
const yellow = c('33');
const blue = c('34');
const magenta = c('35');
const cyan = c('36');
const grey = c('90');
const bgRed = c('41;97');
const bgGreen = c('42;30');
const bgYellow = c('43;30');
const bgBlue = c('44;97');

function jam(iso) {
  // 2026-10-28T16:13:20 -> 16:13:20
  const m = /T(\d{2}:\d{2}:\d{2})/.exec(iso || '');
  return m ? m[1] : (iso || '');
}

// ---------------------------------------------------------------- database

let pool = null;
let dbHost = '127.0.0.1';
if (!NO_DB) {
  try {
    require(path.join(BACKEND, 'node_modules', 'dotenv')).config({
      path: path.join(BACKEND, '.env'),
    });
    const { Pool } = require(path.join(BACKEND, 'node_modules', 'pg'));

    // PENTING: `backend/.env` berisi DB_HOST_POSTGRE=energy-postgres, yaitu nama
    // container Docker. Nama itu hanya resolve di dalam jaringan Docker, BUKAN
    // dari host. Backend tetap jalan karena pm2 menyuntik
    // DB_HOST_POSTGRE=127.0.0.1 ke environment-nya, dan dotenv tidak menimpa
    // env yang sudah ada. Skrip ini dijalankan langsung dari host, jadi pakai
    // 127.0.0.1 lebih dulu dan baru jatuh ke nilai .env bila perlu.
    const kandidat = [];
    const dariArg = (() => {
      const i = argv.indexOf('--db-host');
      return i >= 0 ? argv[i + 1] : null;
    })();
    if (dariArg) kandidat.push(dariArg);
    kandidat.push('127.0.0.1');
    if (process.env.DB_HOST_POSTGRE && !kandidat.includes(process.env.DB_HOST_POSTGRE)) {
      kandidat.push(process.env.DB_HOST_POSTGRE);
    }

    pool = new Pool({
      host: kandidat[0],
      user: process.env.DB_USER_POSTGRE,
      password: process.env.DB_PASSWORD_POSTGRE,
      database: process.env.DB_DATABASE_POSTGRE,
      port: Number(process.env.DB_PORT_POSTGRE) || 5432,
      max: 2,
      connectionTimeoutMillis: 3000,
    });
    pool.on('error', () => { /* koneksi putus: enrichment dilewati saja */ });

    // Uji koneksi sekali; bila host pertama gagal, coba kandidat berikutnya.
    pool
      .query('SELECT 1')
      .then(() => { dbHost = kandidat[0]; })
      .catch(async () => {
        for (const h of kandidat.slice(1)) {
          const uji = new Pool({
            host: h,
            user: process.env.DB_USER_POSTGRE,
            password: process.env.DB_PASSWORD_POSTGRE,
            database: process.env.DB_DATABASE_POSTGRE,
            port: Number(process.env.DB_PORT_POSTGRE) || 5432,
            max: 2,
            connectionTimeoutMillis: 3000,
          });
          try {
            await uji.query('SELECT 1');
            await pool.end().catch(() => {});
            pool = uji;
            dbHost = h;
            return;
          } catch {
            await uji.end().catch(() => {});
          }
        }
        await pool.end().catch(() => {});
        pool = null;
      });
  } catch {
    pool = null;
  }
}

async function q(sql, params) {
  if (!pool) return null;
  try {
    return (await pool.query(sql, params)).rows;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- parser

const RE_LINE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}):\s?(.*)$/;

// Baris yang tidak ada hubungannya dengan OCPP. Disaring lebih awal supaya
// tidak membanjiri layar saat mesin sedang diuji.
const NOISE = [
  /^Running refund trouble charging job/,
  /^\[chargingState\]/,
  /^pong /,
  /^\[.*\] Heartbeat from/,
];

function klasifikasi(iso, teks) {
  let m;

  if ((m = /^(\S+) connected$/.exec(teks))) {
    return { jenis: 'CONNECT', identitas: m[1] };
  }
  if ((m = /^disconnect (\S+)$/.exec(teks))) {
    return { jenis: 'DISCONNECT', identitas: m[1] };
  }
  if (/^Tolak identity chargebox tak terdaftar: (.+)$/.test(teks)) {
    const id = /^Tolak identity chargebox tak terdaftar: (.+)$/.exec(teks)[1];
    return { jenis: 'DITOLAK', identitas: id, detail: 'identity tidak ada di t_chargebox' };
  }
  if ((m = /^Server got BootNotificationnn from (\S+):/.exec(teks))) {
    return { jenis: 'BOOT', identitas: m[1] };
  }
  if ((m = /^Server got Authorize from (\S+):/.exec(teks))) {
    return { jenis: 'AUTHORIZE', identitas: m[1] };
  }
  if ((m = /^Server got StatusNotification from (\S+):/.exec(teks))) {
    return { jenis: 'STATUS', identitas: m[1] };
  }
  if ((m = /^Server got StopTransactionnn from (\S+):/.exec(teks))) {
    return { jenis: 'STOP', identitas: m[1] };
  }
  if (/^Charging station started charging using ID Tag:/.test(teks)) {
    return { jenis: 'START', identitas: null };
  }
  if ((m = /^metervalues (\{.*\})$/.exec(teks))) {
    return { jenis: 'METERVALUES', identitas: null, json: m[1] };
  }
  if ((m = /^Serverr goti (\w+) from (\S+):/.exec(teks))) {
    return { jenis: 'METHOD', identitas: m[2], method: m[1] };
  }
  if ((m = /^\[.*\] Heartbeat from (\S+)$/.exec(teks))) {
    return { jenis: 'HEARTBEAT', identitas: m[1] };
  }
  return null;
}

// Objek params dicetak Node sebagai multi-baris. Kumpulkan sampai kurung
// seimbang, lalu tampilkan apa adanya (bukan di-parse: itu util.inspect, bukan
// JSON, dan mem-parse-nya rawan salah).
function seimbang(teks) {
  let d = 0;
  for (const ch of teks) {
    if (ch === '{' || ch === '[') d++;
    else if (ch === '}' || ch === ']') d--;
  }
  return d <= 0;
}

// ---------------------------------------------------------------- tampilan

const LABEL = {
  CONNECT: { tag: bgGreen(' CONNECT '), warna: green },
  DISCONNECT: { tag: bgRed(' DISCONNECT '), warna: red },
  DITOLAK: { tag: bgRed(' DITOLAK '), warna: red },
  BOOT: { tag: bgBlue(' BOOT '), warna: blue },
  HEARTBEAT: { tag: dim(' hb '), warna: grey },
  AUTHORIZE: { tag: bgYellow(' AUTHORIZE '), warna: yellow },
  STATUS: { tag: bgYellow(' STATUS '), warna: yellow },
  START: { tag: bgGreen(' START '), warna: green },
  STOP: { tag: bgRed(' STOP '), warna: red },
  METERVALUES: { tag: magenta(' METER '), warna: magenta },
  METHOD: { tag: cyan(' METHOD '), warna: cyan },
};

let hitung = Object.create(null);
let terakhirStatus = new Map();

function ringkasJson(json) {
  // metervalues: ambil measurand yang dipakai server (lihat handle.js)
  try {
    const p = JSON.parse(json);
    const sv = p.meterValue?.[0]?.sampledValue || [];
    const penting = ['Energy.Active.Import.Register', 'Temperature', 'Current.Import', 'Voltage', 'SoC'];
    const bagian = [];
    for (const s of sv) {
      if (!penting.includes(s.measurand)) continue;
      const unit = s.unit ? ' ' + s.unit : '';
      const fasa = s.phase ? '/' + s.phase : '';
      bagian.push(`${s.measurand}${fasa}=${s.value}${unit}`);
    }
    if (bagian.length === 0) return `connector=${p.connectorId} (tidak ada measurand yang dipakai server)`;
    return `connector=${p.connectorId}  ${bagian.join('  ')}`;
  } catch {
    return json.slice(0, 160);
  }
}

function cetak(ev) {
  const label = LABEL[ev.jenis] || { tag: ev.jenis, warna: (x) => x };
  const id = ev.identitas ? bold(ev.identitas) : dim('(tanpa identity di log)');
  const head = `${grey(jam(ev.iso))} ${label.tag} ${id}`;
  hitung[ev.jenis] = (hitung[ev.jenis] || 0) + 1;

  if (ev.jenis === 'HEARTBEAT' && !VERBOSE) {
    // Heartbeat tiap 60 detik akan mengubur event lain. Tampilkan hanya satu
    // baris ringkas, dan hanya bila ada perubahan status sejak heartbeat lalu.
    const n = hitung.HEARTBEAT;
    if (n % 10 !== 0) return;
    console.log(`${head} ${dim(`(ke-${n})`)}`);
    return;
  }

  console.log(head);

  if (ev.jenis === 'METERVALUES') {
    console.log(`         ${ringkasJson(ev.json)}`);
  } else if (ev.jenis === 'DITOLAK') {
    console.log(`         ${red(ev.detail)}`);
  } else if (ev.detail) {
    console.log(`         ${dim(ev.detail)}`);
  }
}

// ---------------------------------------------------------------- pengayaan DB

async function statusSekarang(identitas) {
  if (!identitas || !pool) return;
  const rows = await q(
    `SELECT connector_id, status, waktu FROM konektor
      WHERE chargebox_id = $1 ORDER BY connector_id`,
    [identitas]
  );
  if (!rows || rows.length === 0) return;
  const teks = rows
    .map((r) => `c${r.connector_id}=${r.status || '-'}`)
    .join('  ');
  const kunci = identitas + teks;
  if (terakhirStatus.get(identitas) === kunci) return; // tidak berubah, diamkan
  terakhirStatus.set(identitas, kunci);
  console.log(`         ${dim('status konektor sekarang:')} ${teks}`);
}

// Ringkasan kondisi saat ini. Penting karena putus koneksi TIDAK selalu
// menghasilkan baris "disconnect" di log: kalau socket mati mendadak, handler
// close tidak jalan dan log terlihat seolah semuanya normal.
async function snapshot() {
  if (!pool) return;
  const rows = await q(
    `SELECT c.chargebox_id, c.nama_chargebox, c.last_ping,
            EXTRACT(EPOCH FROM (now() - c.last_ping))::int AS umur,
            (SELECT string_agg('c' || k.connector_id || '=' || COALESCE(k.status,'-'), '  '
                               ORDER BY k.connector_id)
               FROM konektor k WHERE k.chargebox_id = c.chargebox_id) AS konektor
       FROM t_chargebox c
      ORDER BY c.chargebox_id`,
    []
  );
  if (!rows || rows.length === 0) return;

  console.log(bold('  Kondisi saat monitor dibuka'));
  for (const r of rows) {
    let info;
    if (r.last_ping == null) {
      info = dim('belum pernah tersambung');
    } else if (r.umur != null && r.umur > 300) {
      info = red(`TIDAK ADA HEARTBEAT selama ${Math.floor(r.umur / 60)} menit (kemungkinan putus)`);
    } else if (r.umur != null && r.umur > 90) {
      info = yellow(`heartbeat terakhir ${r.umur} detik lalu`);
    } else {
      info = green(`heartbeat ${r.umur}s lalu`);
    }
    console.log(`   ${bold(r.chargebox_id.padEnd(9))} ${info}`);
    if (r.konektor) console.log(`   ${' '.repeat(9)} ${dim(r.konektor)}`);
  }
  console.log('');
}

async function lastPing(identitas) {
  if (!identitas || !pool) return;
  const rows = await q(
    `SELECT last_ping, now() - last_ping AS selisih FROM t_chargebox WHERE chargebox_id = $1`,
    [identitas]
  );
  if (!rows || !rows[0] || !rows[0].last_ping) return;
  const s = rows[0].selisih;
  console.log(`         ${dim('last_ping:')} ${String(s).split('.')[0]} lalu`);
}

// ---------------------------------------------------------------- mesin baris

let buf = null; // { iso, teks, identitas, jenis, lines: [] }

// Query DB berjalan async; di mode --replay proses selesai sebelum promise
// selesai, jadi hasilnya harus ditunggu sebelum keluar.
const pending = [];
function lacak(p) {
  pending.push(p.catch(() => {}));
}

function prosesBaris(mentah) {
  const line = mentah.replace(/\r$/, '');
  const m = RE_LINE.exec(line);

  if (buf) {
    buf.lines.push(line);
    if (seimbang(buf.lines.join('\n'))) {
      const selesai = buf;
      buf = null;
      if (selesai.jenis === 'BOOT') {
        const isi = selesai.lines.join('\n');
        const v = /chargePointVendor:\s*'([^']*)'/.exec(isi);
        const mo = /chargePointModel:\s*'([^']*)'/.exec(isi);
        const fw = /firmwareVersion:\s*'([^']*)'/.exec(isi);
        selesai.detail = [v && `vendor=${v[1]}`, mo && `model=${mo[1]}`, fw && `fw=${fw[1]}`]
          .filter(Boolean).join('  ');
      }
      if (selesai.jenis === 'STATUS') {
        const isi = selesai.lines.join('\n');
        const cid = /connectorId:\s*(\d+)/.exec(isi);
        const st = /status:\s*'([^']*)'/.exec(isi);
        const ec = /errorCode:\s*'([^']*)'/.exec(isi);
        selesai.detail = [
          cid && `connector=${cid[1]}`,
          st && `status=${st[1]}`,
          ec && `errorCode=${ec[1]}`,
        ].filter(Boolean).join('  ');
      }
      if (selesai.jenis === 'STOP') {
        const isi = selesai.lines.join('\n');
        const tid = /transactionId:\s*(\d+)/.exec(isi);
        const mr = /reason:\s*'([^']*)'/.exec(isi);
        const ms = /meterStop:\s*(\d+)/.exec(isi);
        selesai.detail = [
          tid && `transactionId=${tid[1]}`,
          mr && `reason=${mr[1]}`,
          ms && `meterStop=${ms[1]}`,
        ].filter(Boolean).join('  ');
      }
      if (selesai.jenis === 'START') {
        const isi = selesai.lines.join('\n');
        const tag = /idTag:\s*'([^']*)'/.exec(isi);
        const cid = /connectorId:\s*(\d+)/.exec(isi);
        const mstart = /meterStart:\s*(\d+)/.exec(isi);
        selesai.detail = [
          tag && `idTag=${tag[1]}`,
          cid && `connector=${cid[1]}`,
          mstart && `meterStart=${mstart[1]}`,
        ].filter(Boolean).join('  ');
      }
      if (selesai.jenis === 'AUTHORIZE') {
        const isi = selesai.lines.join('\n');
        const tag = /idTag:\s*'([^']*)'/.exec(isi);
        selesai.detail = tag ? `idTag=${tag[1]}` : '';
      }
      cetak(selesai);
      if (selesai.identitas && ['STATUS', 'START', 'STOP'].includes(selesai.jenis)) {
        lacak(statusSekarang(selesai.identitas));
      }
      if (selesai.identitas && selesai.jenis === 'HEARTBEAT' && VERBOSE) {
        lacak(lastPing(selesai.identitas));
      }
    }
    return;
  }

  if (!m) return;
  const iso = m[1];
  const teks = m[2];

  // Noise disaring SETELAH heartbeat diklasifikasi, karena pola noise
  // `Heartbeat from` bertabrakan dengan event yang ingin ditampilkan.
  const ev = klasifikasi(iso, teks);
  if (!ev) {
    if (NOISE.some((r) => r.test(teks)) && !VERBOSE) return;
    return;
  }
  // `klasifikasi` tidak menyentuh iso; tempelkan di sini supaya semua cabang
  // (termasuk CONNECT/HEARTBEAT yang detailnya satu baris) punya cap waktu.
  ev.iso = iso;

  if (ev.jenis === 'HEARTBEAT') {
    cetak(ev);
    return;
  }

  if (ev.jenis === 'METERVALUES') {
    cetak(ev);
    return;
  }

  // Event yang detailnya multi-baris
  if (/[:{[]\s*$/.test(teks)) {
    buf = { iso, teks, ...ev, lines: [teks] };
    if (seimbang(teks)) {
      const selesai = buf;
      buf = null;
      cetak(selesai);
      if (selesai.identitas && ['STATUS', 'START', 'STOP'].includes(selesai.jenis)) {
        lacak(statusSekarang(selesai.identitas));
      }
    }
    return;
  }

  cetak(ev);
  if (ev.identitas && ['STATUS', 'START', 'STOP'].includes(ev.jenis)) {
    lacak(statusSekarang(ev.identitas));
  }
}

// ---------------------------------------------------------------- mode

async function header() {
  console.log('');
  console.log(bold('  Pemantau event OCPP — SPKLU'));
  console.log(dim(`  log: ${LOG}`));
  console.log(dim(`  db : ${pool ? 'aktif via ' + dbHost + ' (enrichment status konektor)' : 'nonaktif'}`));
  console.log(dim('  Ctrl+C untuk berhenti'));
  console.log('');
  await snapshot();
}

function footer() {
  const urut = ['CONNECT', 'DISCONNECT', 'DITOLAK', 'BOOT', 'HEARTBEAT', 'AUTHORIZE',
    'STATUS', 'START', 'STOP', 'METERVALUES', 'METHOD'];
  const ada = urut.filter((k) => hitung[k]);
  if (ada.length === 0) return;
  console.log('');
  console.log(dim('  ringkasan: ' + ada.map((k) => `${k}=${hitung[k]}`).join('  ')));
}

async function replay(n) {
  const data = fs.readFileSync(LOG, 'utf8').split('\n');
  // Ambil cukup banyak baris dari belakang; event OCPP jarang, jadi ambil
  // sebagian besar file bila perlu.
  const mulai = Math.max(0, data.length - Math.max(n * 400, 4000));
  await header();
  for (let i = mulai; i < data.length; i++) {
    prosesBaris(data[i]);
    // Tunggu enrichment DB sebelum baris berikutnya, supaya baris status
    // tercetak di bawah event yang benar (bukan menempel ke event sesudahnya).
    if (pending.length) await Promise.all(pending.splice(0));
  }
  footer();
}

async function follow() {
  await header();
  const tail = spawn('tail', ['-F', '-n', '0', LOG], { stdio: ['ignore', 'pipe', 'ignore'] });
  let sisa = '';
  tail.stdout.on('data', (chunk) => {
    sisa += chunk.toString('utf8');
    const baris = sisa.split('\n');
    sisa = baris.pop() || '';
    for (const b of baris) prosesBaris(b);
  });
  tail.on('error', (e) => {
    console.error(red(`Gagal menjalankan tail: ${e.message}`));
    process.exit(1);
  });

  const berhenti = async () => {
    footer();
    tail.kill();
    if (pool) await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', berhenti);
  process.on('SIGTERM', berhenti);
}

if (!fs.existsSync(LOG)) {
  console.error(red(`File log tidak ditemukan: ${LOG}`));
  console.error('Cari path yang benar: pm2 describe spklu-backend | grep "out log path"');
  process.exit(1);
}

if (REPLAY != null) {
  replay(Number.isFinite(REPLAY) && REPLAY > 0 ? REPLAY : 30).then(async () => {
    if (pool) await pool.end().catch(() => {});
  });
} else {
  follow();
}
