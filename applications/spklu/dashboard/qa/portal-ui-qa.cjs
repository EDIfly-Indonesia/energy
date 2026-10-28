// QA UI akun portal di halaman Mitra Promo.
// Jalankan di VM: node qa/portal-ui-qa.cjs
const { chromium } = require('playwright');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';

require('/opt/energy/applications/spklu/backend/node_modules/dotenv')
  .config({ path: '/opt/energy/applications/spklu/backend/.env' });

// Kredensial admin TIDAK boleh ditulis di skrip (akan masuk repo).
// Isi lewat environment: QA_ADMIN_USER / QA_ADMIN_PASSWORD.
const QA_ADMIN_USER = process.env.QA_ADMIN_USER || 'admin';
const QA_ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD;
if (!QA_ADMIN_PASSWORD) {
  console.error('QA_ADMIN_PASSWORD belum diset. Jalankan dengan: QA_ADMIN_PASSWORD=... node ' + __filename);
  process.exit(2);
}
// `.env` memakai nama container; dari host harus lewat 127.0.0.1.
process.env.DB_HOST_POSTGRE = '127.0.0.1';
const db = require('/opt/energy/applications/spklu/backend/src/services/database.service');
const { query } = db;

const hasil = [];
function cek(nama, ok, info) {
  hasil.push({ nama, ok });
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${info ? '  ' + info : ''}`);
}

function decodeCode(b64) {
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
}

async function adminToken() {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const l = await fetch(`${API}/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: QA_ADMIN_USER, password: QA_ADMIN_PASSWORD,
      captcha_id: c.data.id, captcha: decodeCode(c.data.image.split(',')[1]),
    }),
  }).then((r) => r.json());
  return l.token;
}

const MK = 'TM_QAUI';
const EMAIL = 'fo-ui@qa.test';

async function bersihkan() {
  await query(`DELETE FROM t_portal_user WHERE id_mitra_promo IN (SELECT id_mitra_promo FROM t_promo_mitra WHERE kode=$1)`, [MK]);
  await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [MK]);
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };
  const AHd = { Authorization: `Bearer ${AT}` };

  await fetch(`${API}/admin/promo-mitra`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ jenis_mitra: 'hotel', kode: MK, nama: 'Hotel UI QA' }),
  });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, AT);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });

  await page.goto(`${BASE}/promo-mitra`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(1500);

  // buka panel akun portal untuk mitra uji
  const baris = page.locator('tr', { hasText: MK });
  await baris.getByRole('button', { name: /Akun Portal/ }).click();
  await page.waitForTimeout(1500);

  const panelTeks = (await page.locator('.panel').first().textContent()) || '';
  cek('panel akun portal terbuka', panelTeks.includes('Akun Portal'),
      panelTeks.slice(0, 50).replace(/\s+/g, ' '));
  cek('panel menjelaskan password tidak bisa dilihat lagi',
      panelTeks.includes('tidak bisa dilihat lagi'));

  // isi form
  await page.fill('.panel input[type="email"]', EMAIL);
  await page.fill('.panel input[placeholder="minimal 8 karakter"]', 'rahasia123');
  await page.fill('.panel input[placeholder*="Front Office"]', 'FO UI');
  await page.getByRole('button', { name: /Buat Akun Portal/ }).click();
  await page.waitForTimeout(2000);

  const setelah = (await page.locator('.panel').first().textContent()) || '';
  cek('akun muncul di tabel panel', setelah.includes(EMAIL),
      setelah.match(/Akun portal dibuat[^\n]*/)?.[0] ?? '-');

  // verifikasi lewat API bahwa akun benar-benar bisa login
  const login = await fetch(`${API}/portal/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'rahasia123' }),
  }).then((r) => r.json());
  cek('akun buatan UI bisa login ke portal', login.success === true);

  // password tidak tampil di UI
  cek('password tidak tampil di tabel', !setelah.includes('rahasia123'));

  await page.screenshot({ path: 'qa/screenshots/mitra-portal-user.png' });

  cek('tidak ada error konsol', errs.length === 0, errs.slice(0, 2).join(' | '));

  await browser.close();
  await bersihkan();

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error('QA GAGAL:', e.message);
  await bersihkan().catch(() => {});
  process.exit(1);
});
