// QA fungsional: buat mitra + promo LEWAT FORM (bukan API), lalu verifikasi
// datanya muncul dan bisa dipakai. Data uji dibersihkan di akhir.
// Jalankan di VM: node qa/promo-qa3.cjs
const { chromium } = require('playwright');

// Kredensial admin TIDAK boleh ditulis di skrip (masuk repo + riwayat git).
// Isi lewat environment: QA_ADMIN_USER / QA_ADMIN_PASSWORD.
const QA_ADMIN_USER = process.env.QA_ADMIN_USER || 'admin';
const QA_ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD;
if (!QA_ADMIN_PASSWORD) {
  console.error('QA_ADMIN_PASSWORD belum diset. Jalankan: QA_ADMIN_PASSWORD=... node ' + __filename);
  process.exit(2);
}

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';

function decodeCode(b64) {
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
}

async function getToken() {
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

const hasil = [];
function cek(nama, ok, info) {
  hasil.push({ nama, ok });
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${info ? '  ' + info : ''}`);
}

// Prefix disamakan dengan konvensi test backend (helpers.cleanup):
// mitra TM_*, promo TEST_*. Dengan begitu sisa data bisa dibersihkan oleh
// `npm run test:db` di backend, bukan tertinggal sebagai baris nonaktif.
// CATATAN: DELETE di API adalah SOFT delete (aktif=false), jadi baris tetap
// ada setelah QA — pembersihan keras harus lewat SQL/cleanup backend.
const KODE_MITRA = 'TM_QAUI';
const KODE_PROMO = 'TEST_QAPROMO';

(async () => {
  const token = await getToken();
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  // DELETE TANPA Content-Type: Fastify menolak body kosong bila header JSON
  // dipasang. Tanpa ini, pembersihan gagal diam-diam dan data uji tertinggal.
  const HAPUS = { Authorization: `Bearer ${token}` };

  // bersihkan sisa sebelumnya
  const list = await fetch(`${API}/admin/promo-mitra`, { headers: H }).then((r) => r.json());
  for (const m of (list.data || []).filter((x) => x.kode === KODE_MITRA)) {
    await fetch(`${API}/admin/promo-mitra/${m.id_mitra_promo}`, { method: 'DELETE', headers: HAPUS });
  }
  const lp = await fetch(`${API}/admin/promo`, { headers: H }).then((r) => r.json());
  for (const p of (lp.data || []).filter((x) => x.kode_promo === KODE_PROMO)) {
    await fetch(`${API}/admin/promo/${p.id_promo}`, { method: 'DELETE', headers: HAPUS });
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, token);
  const page = await ctx.newPage();

  // ---------- 1. Buat mitra lewat form ----------
  await page.goto(`${BASE}/promo-mitra`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.getByRole('button', { name: /Tambah Mitra/ }).first().click();
  await page.waitForSelector('.modal');

  await page.selectOption('.modal select >> nth=0', 'atpm');
  await page.fill('.modal input >> nth=0', KODE_MITRA);
  await page.fill('.modal input >> nth=1', 'Mitra QA UI');
  await page.fill('.modal input >> nth=2', 'Jl. QA No. 1');
  await page.getByRole('button', { name: /^Simpan$/ }).click();
  await page.waitForTimeout(2000);

  const mitraTampil = await page.locator('table').textContent().catch(() => '');
  cek('mitra dibuat lewat form muncul di tabel', mitraTampil.includes(KODE_MITRA));

  // ---------- 2. Buat promo lewat form ----------
  await page.goto(`${BASE}/promo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.getByRole('button', { name: /Tambah Promo/ }).first().click();
  await page.waitForSelector('.modal');

  await page.fill('.modal input >> nth=0', KODE_PROMO);
  // pilih mitra yang baru dibuat
  const opsiMitra = await page.locator('.modal select >> nth=0').locator('option').evaluateAll(
    (os) => os.map((o) => ({ v: o.value, t: o.textContent }))
  );
  const target = opsiMitra.find((o) => o.t.includes(KODE_MITRA));
  if (target) await page.selectOption('.modal select >> nth=0', target.v);
  await page.fill('.modal input >> nth=1', 'Promo QA UI');

  // Aturan potongan: tipe per_kwh (default), nilai 600
  await page.fill('.modal input >> nth=2', '600');
  // Budget: cari input dengan placeholder 1000000
  await page.fill('.modal input[placeholder="mis. 1000000"]', '500000');

  await page.getByRole('button', { name: /^Simpan$/ }).click();
  await page.waitForTimeout(2000);

  const pesan = await page.locator('.msg').first().textContent().catch(() => '');
  const promoTampil = await page.locator('table').textContent().catch(() => '');
  cek('promo dibuat lewat form muncul di tabel', promoTampil.includes(KODE_PROMO), `msg="${(pesan || '').trim()}"`);

  // ---------- 3. Verifikasi lewat API ----------
  const lp2 = await fetch(`${API}/admin/promo`, { headers: H }).then((r) => r.json());
  const dibuat = (lp2.data || []).find((p) => p.kode_promo === KODE_PROMO);
  cek('promo tersimpan di DB dengan budget benar', !!dibuat && Number(dibuat.budget_rupiah) === 500000,
      dibuat ? `budget=${dibuat.budget_rupiah} mitra=${dibuat.nama_mitra}` : 'tidak ada');

  // ---------- 4. Halaman iklan & peserta mengenali promo baru ----------
  await page.goto(`${BASE}/promo-iklan`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(1200);
  const opsiIklan = await page.locator('.panel select option').evaluateAll((os) => os.map((o) => o.textContent));
  cek('promo baru muncul di pilihan Iklan', opsiIklan.some((t) => (t || '').includes(KODE_PROMO)));

  await page.goto(`${BASE}/promo-peserta`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(1200);
  const opsiPeserta = await page.locator('.panel select option').evaluateAll((os) => os.map((o) => o.textContent));
  cek('promo baru muncul di pilihan Peserta', opsiPeserta.some((t) => (t || '').includes(KODE_PROMO)));

  await browser.close();

  // ---------- bersihkan ----------
  const lp3 = await fetch(`${API}/admin/promo`, { headers: H }).then((r) => r.json());
  for (const p of (lp3.data || []).filter((x) => x.kode_promo === KODE_PROMO)) {
    await fetch(`${API}/admin/promo/${p.id_promo}`, { method: 'DELETE', headers: HAPUS });
  }
  const lm = await fetch(`${API}/admin/promo-mitra`, { headers: H }).then((r) => r.json());
  for (const m of (lm.data || []).filter((x) => x.kode === KODE_MITRA)) {
    await fetch(`${API}/admin/promo-mitra/${m.id_mitra_promo}`, { method: 'DELETE', headers: HAPUS });
  }
  console.log('data uji dibersihkan');

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error('QA GAGAL:', e.message); process.exit(1); });
