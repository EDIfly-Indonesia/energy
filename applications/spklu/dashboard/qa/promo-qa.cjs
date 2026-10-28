// QA halaman promo: buka tiap halaman, cek judul, modal, dan error konsol.
// Jalankan di VM: node qa/promo-qa.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

function decodeCode(svgB64) {
  const svg = Buffer.from(svgB64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
}

async function getToken() {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const login = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'Pltsapp2026**',
      captcha_id: c.data.id,
      captcha: decodeCode(c.data.image.split(',')[1]),
    }),
  }).then((r) => r.json());
  return login.token;
}

const HALAMAN = [
  { route: '/promo-mitra', judul: 'Mitra Promo', modal: /Tambah Mitra/ },
  { route: '/promo', judul: 'Promo', modal: /Tambah Promo/ },
  { route: '/promo-iklan', judul: 'Iklan Promo', modal: null },
  { route: '/promo-peserta', judul: 'Peserta Promo', modal: null },
  { route: '/promo-eksposur', judul: 'Eksposur Promo', modal: null },
];

(async () => {
  const token = await getToken();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 950 },
  });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, token);

  const page = await ctx.newPage();
  const hasil = [];

  for (const h of HALAMAN) {
    const errors = [];
    const onErr = (e) => errors.push('pageerror: ' + e.message.slice(0, 160));
    const onConsole = (m) => {
      if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160));
    };
    page.on('pageerror', onErr);
    page.on('console', onConsole);

    await page.goto(`${BASE}${h.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const h1 = (await page.textContent('h1').catch(() => null)) || '(tidak ada h1)';
    const judulOk = h1.trim() === h.judul;

    let modalInfo = '-';
    if (h.modal) {
      const btn = page.getByRole('button', { name: h.modal }).first();
      const bisaKlik = await btn.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (bisaKlik) {
        const terlihat = await page.locator('.modal').isVisible({ timeout: 3000 }).catch(() => false);
        // hitung field di dalam modal
        const jumlahField = await page.locator('.modal label').count().catch(() => 0);
        modalInfo = `modal=${terlihat} field=${jumlahField}`;
        await page.screenshot({ path: path.join(OUT, `promo${h.route.replace(/\//g, '-')}-modal.png`) });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        modalInfo = 'tombol-tidak-ditemukan';
      }
    }

    await page.screenshot({ path: path.join(OUT, `promo${h.route.replace(/\//g, '-')}.png`) });

    page.off('pageerror', onErr);
    page.off('console', onConsole);

    const ok = judulOk && errors.length === 0;
    hasil.push({ route: h.route, h1, judulOk, modalInfo, errors, ok });
    console.log(
      `${ok ? 'LULUS' : 'GAGAL'}  ${h.route.padEnd(18)} h1="${h1}" ${modalInfo} error=${errors.length}`
    );
    for (const e of errors.slice(0, 3)) console.log(`        ↳ ${e}`);
  }

  // Cek menu sidebar memuat semua item promo
  const menu = await page.$$eval('.sidebar nav a', (as) => as.map((a) => a.textContent.trim()));
  const wajib = ['Mitra Promo', 'Promo', 'Iklan Promo', 'Peserta Promo', 'Eksposur Promo'];
  const menuOk = wajib.every((w) => menu.includes(w));
  console.log(`${menuOk ? 'LULUS' : 'GAGAL'}  menu sidebar: ${menu.filter((m) => m.includes('Promo')).join(', ')}`);
  hasil.push({ route: 'menu', ok: menuOk });

  // Cek halaman lama tidak rusak
  for (const lama of ['/berita', '/biaya', '/chargebox']) {
    const errs = [];
    const c = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); };
    page.on('console', c);
    await page.goto(`${BASE}${lama}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    const h1 = (await page.textContent('h1').catch(() => null)) || '-';
    page.off('console', c);
    const ok = errs.length === 0;
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  regresi ${lama.padEnd(12)} h1="${h1.trim()}" error=${errs.length}`);
    hasil.push({ route: lama, ok });
  }

  await browser.close();
  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  process.exit(gagal ? 1 : 0);
})().catch((e) => {
  console.error('QA GAGAL:', e.message);
  process.exit(1);
});
