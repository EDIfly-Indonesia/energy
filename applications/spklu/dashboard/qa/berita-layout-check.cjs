// Verifikasi layout modal Berita: Jangkauan, Jenis, Status harus satu baris.
// Jalankan di VM: node qa/berita-layout-check.cjs
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
    body: JSON.stringify({
      username: 'admin',
      password: 'Pltsapp2026**',
      captcha_id: c.data.id,
      captcha: code,
    }),
  }).then((r) => r.json());
  return login.token;
}

// Ambil posisi semua label form di dalam modal.
async function labelBoxes(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('.modal');
    if (!modal) return null;
    const out = [];
    for (const l of modal.querySelectorAll('label')) {
      const name = (l.childNodes[0]?.textContent || '').trim();
      if (!name) continue;
      const r = l.getBoundingClientRect();
      out.push({
        name,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    return out;
  });
}

function pick(boxes, name) {
  return boxes.find((b) => b.name.toLowerCase().startsWith(name.toLowerCase()));
}

function sameRow(a, b) {
  return a && b && Math.abs(a.y - b.y) <= 2;
}

(async () => {
  const token = await getToken();
  if (!token) throw new Error('login gagal, token kosong');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 900 },
  });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, token);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });

  await page.goto(`${BASE}/berita`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('table, h1', { timeout: 15000 });
  await page.getByRole('button', { name: /Tambah Berita/ }).first().click();
  await page.waitForSelector('.modal', { timeout: 8000 });
  await page.waitForTimeout(400);

  const boxes = await labelBoxes(page);
  const j = pick(boxes, 'Jangkauan');
  const jen = pick(boxes, 'Jenis');
  const st = pick(boxes, 'Status');

  console.log('=== MODAL (jangkauan = semua) ===');
  for (const b of boxes) {
    console.log(`  ${b.name.padEnd(18)} x=${String(b.x).padStart(4)} y=${String(b.y).padStart(4)} w=${String(b.w).padStart(4)}`);
  }

  const row3 = sameRow(j, jen) && sameRow(jen, st);
  console.log(`\nJangkauan/Jenis/Status satu baris: ${row3 ? 'YA' : 'TIDAK'}`);
  if (j && jen && st) {
    console.log(`  urutan x: ${j.x} < ${jen.x} < ${st.x} -> ${j.x < jen.x && jen.x < st.x ? 'YA' : 'TIDAK'}`);
    console.log(`  lebar hampir sama: ${Math.abs(j.w - jen.w) <= 4 && Math.abs(jen.w - st.w) <= 4 ? 'YA' : 'TIDAK'}`);
    console.log(`  mengisi baris (total + gap ~= lebar modal): ${j.w + jen.w + st.w}`);
  }

  await page.screenshot({ path: path.join(OUT, 'berita-modal.png'), fullPage: false });

  // --- Mode radius: cek blok Radius/Latitude/Longitude ---
  await page.selectOption('.modal select >> nth=0', 'radius');
  await page.waitForTimeout(500);
  const boxes2 = await labelBoxes(page);
  const rad = pick(boxes2, 'Radius (km)');
  const lat = pick(boxes2, 'Latitude');
  const lng = pick(boxes2, 'Longitude');
  const j2 = pick(boxes2, 'Jangkauan');
  const jen2 = pick(boxes2, 'Jenis');
  const st2 = pick(boxes2, 'Status');

  console.log('\n=== MODAL (jangkauan = radius) ===');
  for (const b of boxes2) {
    console.log(`  ${b.name.padEnd(18)} x=${String(b.x).padStart(4)} y=${String(b.y).padStart(4)} w=${String(b.w).padStart(4)}`);
  }
  const row3b = sameRow(j2, jen2) && sameRow(jen2, st2);
  const rowRadius = sameRow(rad, lat) && sameRow(lat, lng);
  console.log(`\nJangkauan/Jenis/Status tetap satu baris: ${row3b ? 'YA' : 'TIDAK'}`);
  console.log(`Radius/Latitude/Longitude satu baris: ${rowRadius ? 'YA' : 'TIDAK'}`);

  await page.screenshot({ path: path.join(OUT, 'berita-modal-radius.png'), fullPage: false });

  // --- Layar sempit: harus turun jadi 1 kolom ---
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(500);
  const boxes3 = await labelBoxes(page);
  const js = pick(boxes3, 'Jangkauan');
  const jens = pick(boxes3, 'Jenis');
  const sts = pick(boxes3, 'Status');
  const stacked = js && jens && sts && js.y < jens.y && jens.y < sts.y;
  console.log(`\n=== viewport 600px ===`);
  console.log(`turun jadi 1 kolom: ${stacked ? 'YA' : 'TIDAK'} (y: ${js?.y}, ${jens?.y}, ${sts?.y})`);
  await page.screenshot({ path: path.join(OUT, 'berita-modal-600.png'), fullPage: false });

  console.log(`\nerror konsol: ${errors.length}`);
  for (const e of errors.slice(0, 5)) console.log(`  ↳ ${e}`);

  await browser.close();
  const ok = row3 && row3b && rowRadius && stacked && errors.length === 0;
  console.log(`\nHASIL: ${ok ? 'LULUS' : 'GAGAL'}`);
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('CEK GAGAL:', e.message);
  process.exit(1);
});
