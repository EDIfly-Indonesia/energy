#!/usr/bin/env node
'use strict';

/**
 * CLI penyediaan wallet DOKU (WaaS Sub Account) untuk SPKLU.
 *
 *   node scripts/doku-wallet.cjs status
 *   node scripts/doku-wallet.cjs create-central --name "..." --email "..." [--prod] [--force]
 *   node scripts/doku-wallet.cjs set-central SAC-xxxx [--prod]
 *   node scripts/doku-wallet.cjs create-user 8 [--force]
 *   node scripts/doku-wallet.cjs backfill [--limit 50] [--force] [--dry-run]
 *   node scripts/doku-wallet.cjs verify SAC-xxxx
 *
 * Tanpa --prod, semua perintah memakai kredensial & setting SANDBOX
 * (IS_PROD=0, t_setting.admin_wallet_sandbox). Ini disengaja: jangan sampai
 * wallet produksi tersentuh saat uji coba.
 */

const path = require('path');
const fs = require('fs');

const BACKEND = path.resolve(__dirname, '..', 'backend');
process.chdir(BACKEND);

require(path.join(BACKEND, 'node_modules', 'dotenv')).config({ path: path.join(BACKEND, '.env') });

// Host DB: `.env` memakai nama container (energy-postgres) yang tidak resolve
// dari host. pm2 menyuntik 127.0.0.1; skrip ini dijalankan dari host, jadi
// pakai 127.0.0.1 secara default (bisa ditimpa --db-host).
if (!process.argv.includes('--db-host')) {
  process.env.DB_HOST_POSTGRE = '127.0.0.1';
}

const argv = process.argv.slice(2);
const perintah = argv[0];
const has = (f) => argv.includes(f);
const valOf = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROD = has('--prod');
const FORCE = has('--force');
const DRY = has('--dry-run');

// `--prod` harus mengalihkan KREDENSIAL dan base URL juga, bukan hanya kunci
// t_setting. Sebelumnya flag ini hanya memilih admin_wallet vs
// admin_wallet_sandbox, sehingga `--prod` masih memanggil api-sandbox dengan
// kredensial produksi (dan gagal dengan pesan yang menyesatkan).
if (PROD) process.env.IS_PROD = '1';

const c = (kode) => (s) => (process.stdout.isTTY ? `\x1b[${kode}m${s}\x1b[0m` : String(s));
const bold = c('1'), dim = c('2'), red = c('31'), green = c('32'), yellow = c('33'), cyan = c('36');

function judul(t) {
  console.log('');
  console.log(bold(t));
  console.log(dim('─'.repeat(Math.max(t.length, 40))));
}

function mode() {
  return PROD ? yellow('PRODUKSI') : cyan('SANDBOX');
}

function gagal(pesan, saran) {
  console.error('');
  console.error(red('GAGAL: ') + pesan);
  if (saran) console.error(dim('  ' + saran));
  process.exitCode = 1;
}

const BANTUAN = `
Penyediaan wallet DOKU (WaaS Sub Account) — SPKLU

  status                          ringkasan wallet pusat + pelanggan
  create-central --name N --email E [--prod] [--force]
                                  buat sub account wallet PUSAT, simpan ke t_setting
  set-central <SAC-...> [--prod]  simpan ID wallet pusat yang sudah ada
  create-user <id_user> [--force] buat wallet untuk satu pelanggan
  backfill [--limit N] [--force] [--dry-run]
                                  buat wallet untuk pelanggan yang belum punya
  verify <SAC-...>                cek wallet benar-benar bisa dipakai (baca saldo)

Opsi global: --prod (default SANDBOX), --db-host HOST

Contoh commissioning:
  node scripts/doku-wallet.cjs status
  node scripts/doku-wallet.cjs create-central --name "GoCaz SPKLU" --email "wallet@edifly-si.com"
  node scripts/doku-wallet.cjs verify SAC-9914-1628075940045
  node scripts/doku-wallet.cjs backfill --dry-run
  node scripts/doku-wallet.cjs backfill
`;

(async () => {
  if (!perintah || perintah === 'help' || has('--help')) {
    console.log(BANTUAN);
    return;
  }

  const wp = require(path.join(BACKEND, 'src/services/wallet-provision.js'));
  const waas = require(path.join(BACKEND, 'src/services/doku-waas.js'));
  const db = require(path.join(BACKEND, 'src/services/database.service.js'));

  const cfg = waas.configFromEnv(process.env);
  const kredensialSiap = cfg.ok;

  try {
    // ---------------------------------------------------------- status
    if (perintah === 'status') {
      judul(`Status wallet — mode ${mode()}`);
      console.log(dim(`  env      : IS_PROD=${process.env.IS_PROD ?? '0'}`));
      console.log(dim(`  base URL : ${cfg.baseUrl}`));
      console.log(
        '  kredensial: ' +
          (kredensialSiap
            ? green('lengkap') + dim(` (Client-Id ${String(cfg.clientId).slice(0, 8)}…)`)
            : red('BELUM DIISI') + dim(` — kurang: ${cfg.hilang.join(', ')}`))
      );
      console.log('');

      const r = await wp.ringkasan(PROD);
      const pusat = r.wallet_pusat;
      console.log(`  Wallet pusat (${wp.kunciSetting(PROD)}):`);
      if (pusat) {
        console.log(`    ${bold(pusat)}`);
        const v = await wp.verifyWallet(pusat).catch((e) => ({ ok: false, alasan: e.message }));
        if (v.ok) {
          console.log(`    ${green('bisa dipakai')}${v.saldo != null ? dim(` — saldo ${v.saldo}`) : ''}`);
        } else {
          console.log(`    ${red('belum terverifikasi')} ${dim(v.alasan || '')}`);
        }
      } else {
        console.log(`    ${red('BELUM DIATUR')} — jalankan: create-central`);
      }

      console.log('');
      console.log('  Pelanggan:');
      const p = r.pelanggan;
      console.log(`    total ${p.total}  |  punya wallet ${green(p.punya_wallet)}  |  belum ${p.belum ? yellow(p.belum) : 0}  |  gagal ${p.gagal ? red(p.gagal) : 0}`);
      return;
    }

    // ---------------------------------------------------------- create-central
    if (perintah === 'create-central') {
      const name = valOf('--name', null);
      const email = valOf('--email', null);
      if (!name || !email) return gagal('--name dan --email wajib diisi');

      judul(`Buat wallet PUSAT — mode ${mode()}`);
      const r = await wp.createCentralWallet({ name, email, isProd: PROD, force: FORCE });
      if (r.dilewati) {
        console.log(yellow('Dilewati: ') + r.alasan);
        console.log(`  ID sekarang: ${bold(r.id_wallet)}`);
        console.log(dim('  Pakai --force kalau memang ingin membuat sub account baru.'));
        return;
      }
      console.log(`  ID wallet : ${bold(r.id_wallet)}`);
      console.log(`  status    : ${r.status === 'ACTIVE' ? green(r.status) : yellow(r.status)}`);
      console.log(`  nama      : ${r.name}`);
      console.log(`  email     : ${r.email}`);
      console.log(`  tipe      : ${r.tipe}`);
      console.log('');
      console.log(green(`Tersimpan di t_setting.${wp.kunciSetting(PROD)}`));
      if (r.status !== 'ACTIVE') {
        console.log(dim('  Catatan: sub account baru berstatus PENDING. Verifikasi dengan: verify ' + r.id_wallet));
      }
      return;
    }

    // ---------------------------------------------------------- set-central
    if (perintah === 'set-central') {
      const id = argv[1];
      if (!id || !/^SAC-/.test(id)) return gagal('ID wallet harus berformat SAC-...');
      judul(`Simpan wallet PUSAT manual — mode ${mode()}`);
      const r = await wp.setCentralWalletId(id, PROD);
      console.log(`  ${r.nama_setting} = ${bold(r.value_setting)}`);
      const v = await wp.verifyWallet(id).catch((e) => ({ ok: false, alasan: e.message }));
      console.log(v.ok ? green('  terverifikasi bisa dipakai') : yellow('  belum terverifikasi: ' + (v.alasan || '')));
      return;
    }

    // ---------------------------------------------------------- create-user
    if (perintah === 'create-user') {
      const idUser = Number(argv[1]);
      if (!Number.isInteger(idUser) || idUser < 1) return gagal('id_user tidak valid');
      judul(`Buat wallet pelanggan #${idUser}`);
      const r = await wp.createUserWallet(idUser, { force: FORCE });
      if (!r.ok) return gagal(r.alasan || 'gagal');
      if (r.dilewati) {
        console.log(yellow('Dilewati: ') + 'sudah punya wallet');
        console.log(`  ID wallet: ${bold(r.id_wallet)}`);
        return;
      }
      console.log(`  ID wallet : ${bold(r.id_wallet)}`);
      console.log(`  status    : ${r.status === 'ACTIVE' ? green(r.status) : yellow(r.status)}`);
      return;
    }

    // ---------------------------------------------------------- backfill
    if (perintah === 'backfill') {
      const limit = Number(valOf('--limit', '100'));
      judul(`Backfill wallet pelanggan${DRY ? dim(' (dry-run)') : ''}`);
      if (!kredensialSiap && !DRY) {
        return gagal(
          `Kredensial DOKU belum diisi: ${cfg.hilang.join(', ')}`,
          'Isi dulu di backend/.env, lalu ulangi.'
        );
      }

      const r = await wp.backfillUserWallets({
        limit: Number.isFinite(limit) ? limit : 100,
        force: FORCE,
        dryRun: DRY,
        onProgress: (u, h) => {
          if (h.dryRun) console.log(`  ${dim('rencana')} #${u.id_user} ${u.email}`);
          else if (h.ok) console.log(`  ${green('ok')} #${u.id_user} ${u.email} -> ${h.id_wallet}`);
          else console.log(`  ${red('gagal')} #${u.id_user} ${u.email}: ${h.alasan}`);
        },
      });

      console.log('');
      console.log(`  total ${r.total} | berhasil ${green(r.berhasil)} | gagal ${r.gagal ? red(r.gagal) : 0}`);
      if (r.gagal) process.exitCode = 1;
      return;
    }

    // ---------------------------------------------------------- verify
    if (perintah === 'verify') {
      const id = argv[1];
      if (!id) return gagal('ID wallet wajib diisi');
      judul(`Verifikasi wallet ${id}`);
      const v = await wp.verifyWallet(id);
      if (v.ok) {
        console.log(green('  bisa dipakai'));
        if (v.saldo != null) console.log(`  saldo: ${bold(v.saldo)}`);
      } else {
        console.log(red('  belum bisa dipakai'));
        console.log(`  alasan: ${v.alasan}`);
        if (v.status) console.log(`  HTTP: ${v.status}`);
      }
      return;
    }

    gagal(`perintah tidak dikenal: ${perintah}`, 'Jalankan tanpa argumen untuk melihat bantuan.');
  } finally {
    // pool pg menahan proses tetap hidup
    if (db && db.pool && db.pool.end) await db.pool.end().catch(() => {});
  }
})().catch((e) => {
  console.error('');
  console.error(red('ERROR: ') + e.message);
  if (e.konfigurasi) {
    console.error(dim('  Isi kredensial DOKU di backend/.env, lalu ulangi.'));
  }
  process.exit(1);
});
