// QA responsif portal + regresi dashboard admin.
// Jalankan di VM: node qa/portal-qa2.cjs
const { chromium } = require('playwright');
const crypto = require('crypto');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';

require('/opt/energy/applications/spklu/backend/node_modules/dotenv')
  .config({ path: '/opt/energy/applications/spklu/backend/.env' });

// Kredensial admin TIDAK boleh ditulis di skrip (masuk repo + riwayat git).
// Isi lewat environment: QA_ADMIN_USER / QA_ADMIN_PASSWORD.
const QA_ADMIN_USER = process.env.QA_ADMIN_USER || 'admin';
const QA_ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD;
if (!QA_ADMIN_PASSWORD) {
  console.error('QA_ADMIN_PASSWORD belum diset. Jalankan: QA_ADMIN_PASSWORD=... node ' + __filename);
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

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const MK = 'TM_QARESP';
const PK = 'TEST_QARESP';
const EMAIL = 'fo-resp@qa.test';
const PASS = 'resp12345';

async function bersihkan() {
  await query(`DELETE FROM t_promo_pemakaian WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo_peserta WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo WHERE kode_promo=$1`, [PK]);
  await query(`DELETE FROM t_portal_user WHERE id_mitra_promo IN (SELECT id_mitra_promo FROM t_promo_mitra WHERE kode=$1)`, [MK]);
  await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [MK]);
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };

  const m = await fetch(`${API}/admin/promo-mitra`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ jenis_mitra: 'hotel', kode: MK, nama: 'Hotel QA Responsif' }),
  }).then((r) => r.json());
  const idMitra = m.data.id_mitra_promo;

  await fetch(`${API}/admin/promo`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({
      kode_promo: PK, id_mitra_promo: idMitra, nama: 'Promo Responsif',
      tipe_potongan: 'nominal', nilai_potongan: 25000, budget_rupiah: 500000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
      butuh_peserta: true, cek_kendaraan: false,
    }),
  });
  await query(
    `INSERT INTO t_portal_user (id_mitra_promo, email, password_hash, nama, role)
     VALUES ($1,$2,$3,'FO Resp','operator')`,
    [idMitra, EMAIL, sha(PASS)]
  );

  const browser = await chromium.launch();

  // ---------- portal di 600px ----------
  const pctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 600, height: 900 } });
  const page = await pctx.newPage();
  await page.goto(`${BASE}/portal/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.getByRole('button', { name: /Masuk/ }).click();
  await page.waitForURL(/\/portal\/promo/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const overflowPromo = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  cek('portal 600px: daftar promo tanpa overflow', !overflowPromo);
  await page.screenshot({ path: 'qa/screenshots/portal-promo-600.png' });

  await page.getByRole('button', { name: /Kelola Peserta/ }).first().click();
  await page.waitForTimeout(1500);

  const overflowPeserta = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  cek('portal 600px: halaman peserta tanpa overflow', !overflowPeserta);

  const sidebar = await page.evaluate(() => {
    const s = document.querySelector('.sidebar');
    const c = document.querySelector('.content');
    if (!s || !c) return null;
    return {
      sidebarW: Math.round(s.getBoundingClientRect().width),
      contentW: Math.round(c.getBoundingClientRect().width),
    };
  });
  cek('portal 600px: sidebar jadi bar atas (konten lebar penuh)',
      sidebar && sidebar.contentW > 500, sidebar ? `sidebar=${sidebar.sidebarW} konten=${sidebar.contentW}` : '-');
  await page.screenshot({ path: 'qa/screenshots/portal-peserta-600.png' });
  await pctx.close();

  // ---------- regresi dashboard admin ----------
  const actx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 950 } });
  await actx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, AT);
  const apage = await actx.newPage();
  const errs = [];
  apage.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  apage.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });

  for (const r of ['/', '/promo-mitra', '/promo', '/promo-iklan', '/promo-peserta', '/promo-eksposur', '/berita', '/biaya']) {
    await apage.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
    await apage.waitForTimeout(1200);
  }
  cek('dashboard admin tetap sehat setelah tambah portal', errs.length === 0, errs.slice(0, 2).join(' | '));

  // sesi admin & portal tidak saling menimpa
  const keys = await apage.evaluate(() => ({
    admin: !!localStorage.getItem('spklu_token'),
    portal: localStorage.getItem('portal_token'),
  }));
  cek('sesi admin tidak tercemar token portal', keys.admin && keys.portal === null,
      `admin=${keys.admin} portal=${keys.portal}`);

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
