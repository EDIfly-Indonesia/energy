// QA lanjutan: modal panjang bisa digulir sampai tombol Simpan, dan layout
// responsif di 600px (TODO-PROMO.md 3.5).
// Jalankan di VM: node qa/promo-qa2.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

function decodeCode(b64) {
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
}

async function getToken() {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const l = await fetch(`${API}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin', password: 'Pltsapp2026**',
      captcha_id: c.data.id, captcha: decodeCode(c.data.image.split(',')[1]),
    }),
  }).then((r) => r.json());
  return l.token;
}

const hasil = [];
function cek(nama, ok, info) {
  hasil.push({ nama, ok });
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${info ? '  ' + info : ''}`);
}

(async () => {
  const token = await getToken();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, token);
  const page = await ctx.newPage();

  // ---------- 1. Modal promo panjang bisa digulir sampai Simpan ----------
  await page.goto(`${BASE}/promo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.getByRole('button', { name: /Tambah Promo/ }).first().click();
  await page.waitForSelector('.modal');

  const simpan = page.locator('.modal button[type="submit"]');
  const terlihatAwal = await simpan.isVisible().catch(() => false);

  // Gulir modal ke bawah
  await page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (m) m.scrollTop = m.scrollHeight;
  });
  await page.waitForTimeout(400);

  const dalamViewport = await simpan.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }).catch(() => false);

  cek('tombol Simpan terjangkau setelah gulir', dalamViewport, `terlihat-awal=${terlihatAwal}`);
  await page.screenshot({ path: path.join(OUT, 'promo-modal-bawah.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ---------- 2. Field kunci ada di modal promo ----------
  await page.getByRole('button', { name: /Tambah Promo/ }).first().click();
  await page.waitForSelector('.modal');
  const labelText = await page.$$eval('.modal label', (ls) =>
    ls.map((l) => (l.childNodes[0]?.textContent || '').trim())
  );
  const wajib = [
    'Kode Promo', 'Mitra', 'Nama Promo', 'Tipe Potongan', 'Nilai Potongan',
    'Maks Potongan (Rp)', 'Min kWh', 'Prioritas', 'Budget (Rp) — wajib',
    'Kuota kWh — opsional', 'Tanggal Mulai', 'Tanggal Selesai',
    'Sisa Budget', 'Wajib Peserta Terdaftar', 'Cek Merek Kendaraan', 'Status',
  ];
  const hilang = wajib.filter((w) => !labelText.some((t) => t.startsWith(w)));
  cek('semua field penting ada di modal promo', hilang.length === 0,
      hilang.length ? `hilang: ${hilang.join(', ')}` : `${labelText.length} label`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ---------- 3. Responsif 600px ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/promo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Tambah Promo/ }).first().click();
  await page.waitForSelector('.modal');
  await page.waitForTimeout(400);

  // Di bawah 720px, .grid-3 harus turun jadi 1 kolom: tiga label berurutan
  // harus punya y yang berbeda.
  const posisi = await page.evaluate(() => {
    const modal = document.querySelector('.modal');
    if (!modal) return null;
    const ambil = (awal) => {
      for (const l of modal.querySelectorAll('label')) {
        const t = (l.childNodes[0]?.textContent || '').trim();
        if (t.startsWith(awal)) {
          const r = l.getBoundingClientRect();
          return { y: Math.round(r.y), w: Math.round(r.width) };
        }
      }
      return null;
    };
    return {
      tipe: ambil('Tipe Potongan'),
      nilai: ambil('Nilai Potongan'),
      maks: ambil('Maks Potongan'),
      lebarModal: Math.round(modal.getBoundingClientRect().width),
    };
  });

  const menumpuk = posisi && posisi.tipe && posisi.nilai && posisi.maks &&
    posisi.tipe.y < posisi.nilai.y && posisi.nilai.y < posisi.maks.y;
  cek('modal 600px: grid turun jadi 1 kolom', !!menumpuk,
      posisi ? `y=${posisi.tipe?.y},${posisi.nilai?.y},${posisi.maks?.y} w=${posisi.lebarModal}` : 'tidak terukur');

  // Tidak boleh ada overflow horizontal
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  cek('tidak ada overflow horizontal di 600px', !overflow);
  await page.screenshot({ path: path.join(OUT, 'promo-modal-600.png') });

  await browser.close();
  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error('QA GAGAL:', e.message); process.exit(1); });
