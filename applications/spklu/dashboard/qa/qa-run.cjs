const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

function decodeCode(svgB64) {
  const svg = Buffer.from(svgB64, 'base64').toString('utf8');
  const chars = [];
  const re = /<text[^>]*>([^<]+)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) chars.push(m[1]);
  return chars.join('');
}

async function getToken() {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const code = decodeCode(c.data.image.split(',')[1]);
  const login = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Pltsapp2026**', captcha_id: c.data.id, captcha: code }),
  }).then((r) => r.json());
  return login.token;
}

const results = [];

async function testPage(page, route, opts = {}) {
  const errors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text().slice(0, 200)); };
  const onPageError = (err) => errors.push('pageerror: ' + err.message.slice(0, 200));
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1, table, .datatable', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200); // biarkan data termuat

  const title = (await page.textContent('h1').catch(() => null)) || '(tanpa h1)';
  const shotName = (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_')) + '.png';
  const shot = path.join(OUT, shotName);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

  let interaction = '';
  try {
    if (opts.modalButton) {
      const btn = page.getByRole('button', { name: opts.modalButton }).first();
      await btn.click({ timeout: 5000 });
      const modalVisible = await page.locator('.modal').isVisible({ timeout: 3000 }).catch(() => false);
      interaction = `modal-open=${modalVisible}`;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const modalClosed = !(await page.locator('.modal').isVisible().catch(() => false));
      interaction += `, modal-close-esc=${modalClosed}`;
    }
    if (opts.search) {
      const inp = page.locator('.dt-search input').first();
      if (await inp.isVisible({ timeout: 3000 }).catch(() => false)) {
        await inp.fill('zzz-tidak-ada');
        await page.waitForTimeout(300);
        interaction += (interaction ? ', ' : '') + 'search=ok';
      } else {
        interaction += (interaction ? ', ' : '') + 'search=INPUT-TIDAK-DITEMUKAN';
      }
    }
  } catch (e) {
    interaction += (interaction ? ', ' : '') + 'ERR: ' + e.message.slice(0, 120);
  }

  page.removeListener('console', onConsole);
  page.removeListener('pageerror', onPageError);
  results.push({ route: route || '/', title, interaction, errors, shot });
}

(async () => {
  const token = await getToken();
  if (!token) { console.log('GAGAL dapat token'); process.exit(1); }
  console.log('Token didapat. Mulai QA...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP energy.edifly-si.com 127.0.0.1'],
  });

  // --- Context tanpa token: uji halaman login ---
  const loginCtx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
  const loginPage = await loginCtx.newPage();
  const loginErrors = [];
  loginPage.on('pageerror', (e) => loginErrors.push(e.message));
  await loginPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await loginPage.waitForTimeout(1500);
  const hasCaptchaImg = await loginPage.locator('.captcha-img').isVisible().catch(() => false);
  const loginTitle = await loginPage.textContent('h1').catch(() => null);
  const hasBg = await loginPage.evaluate(() => {
    const el = document.querySelector('.login-page');
    return el ? getComputedStyle(el).backgroundImage : 'none';
  }).catch(() => 'none');
  await loginPage.screenshot({ path: path.join(OUT, 'login.png'), fullPage: true });
  console.log(`LOGIN PAGE: title="${loginTitle}", captcha-img=${hasCaptchaImg}, bg=${hasBg.slice(0, 60)}..., pageerrors=${loginErrors.length}`);
  await loginCtx.close();

  // --- Context dengan token: uji 7 halaman ---
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, token);
  const page = await ctx.newPage();

  await testPage(page, '/chargebox', { modalButton: /Tambah Chargebox/, search: true });
  await testPage(page, '/area', { modalButton: /Tambah Area/, search: true });
  await testPage(page, '/mitra', { modalButton: /Tambah Mitra/, search: true });
  await testPage(page, '/pengguna', { modalButton: /Tambah Pengguna/, search: true });
  await testPage(page, '/transaction', { search: true });
  await testPage(page, '/wallet', { search: true });
  await testPage(page, '/laporan', { search: true });

  await browser.close();

  console.log('\n=== HASIL QA ===');
  let pass = 0, fail = 0;
  for (const r of results) {
    const errCount = r.errors.length;
    const status = errCount === 0 ? 'PASS' : 'FAIL';
    if (errCount === 0) pass++; else fail++;
    console.log(`[${status}] ${r.route} | h1="${r.title}" | ${r.interaction || '-'} | console/pageerror=${errCount}`);
    for (const e of r.errors) console.log(`    ↳ ${e}`);
  }
  console.log(`\nRingkasan: ${pass} PASS, ${fail} FAIL. Screenshot di ${OUT}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('QA GAGAL:', e.message); process.exit(1); });
