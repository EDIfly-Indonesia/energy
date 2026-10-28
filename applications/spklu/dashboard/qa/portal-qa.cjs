// QA Portal Mitra: login, isolasi data antar mitra, input peserta massal,
// dan pemakaian kode oleh peserta terdaftar.
// Jalankan di VM: node qa/portal-qa.cjs
const { chromium } = require('playwright');
const crypto = require('crypto');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';
// dotenv harus dimuat dengan path ABSOLUT: configs/postgre.js memakai
// './.env' relatif terhadap cwd, dan skrip ini dijalankan dari dashboard/.
require('/opt/energy/applications/spklu/backend/node_modules/dotenv')
  .config({ path: '/opt/energy/applications/spklu/backend/.env' });
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
      username: 'admin', password: 'Pltsapp2026**',
      captcha_id: c.data.id, captcha: decodeCode(c.data.image.split(',')[1]),
    }),
  }).then((r) => r.json());
  return l.token;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const MITRA_A = { kode: 'TM_QAHA', nama: 'Hotel QA A', email: 'fo-a@qa.test', pass: 'passA123' };
const MITRA_B = { kode: 'TM_QAHB', nama: 'Hotel QA B', email: 'fo-b@qa.test', pass: 'passB123' };
const PROMO_A = 'TEST_QAPROMA';
const PROMO_B = 'TEST_QAPROMB';

async function bersihkan() {
  for (const k of [PROMO_A, PROMO_B]) {
    await query(`DELETE FROM t_promo_pemakaian WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [k]);
    await query(`DELETE FROM t_promo_peserta WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [k]);
    await query(`DELETE FROM t_promo_iklan WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [k]);
    await query(`DELETE FROM t_promo WHERE kode_promo=$1`, [k]);
  }
  for (const m of [MITRA_A.kode, MITRA_B.kode]) {
    await query(`DELETE FROM t_portal_user WHERE id_mitra_promo IN (SELECT id_mitra_promo FROM t_promo_mitra WHERE kode=$1)`, [m]);
    await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [m]);
  }
  await query(`DELETE FROM t_transaction WHERE kode_promo LIKE 'TEST_QA%'`);
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };
  const AHd = { Authorization: `Bearer ${AT}` };

  // ---- siapkan 2 mitra + promo + akun portal ----
  const mk = async (m) => {
    const r = await fetch(`${API}/admin/promo-mitra`, {
      method: 'POST', headers: AH,
      body: JSON.stringify({ jenis_mitra: 'hotel', kode: m.kode, nama: m.nama }),
    }).then((r) => r.json());
    return r.data.id_mitra_promo;
  };
  const idA = await mk(MITRA_A);
  const idB = await mk(MITRA_B);

  const mkPromo = async (kode, idMitra, nama) => {
    const r = await fetch(`${API}/admin/promo`, {
      method: 'POST', headers: AH,
      body: JSON.stringify({
        kode_promo: kode, id_mitra_promo: idMitra, nama,
        tipe_potongan: 'nominal', nilai_potongan: 25000, budget_rupiah: 500000,
        tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
        butuh_peserta: true, cek_kendaraan: false,
      }),
    }).then((r) => r.json());
    return r.data?.id_promo;
  };
  await mkPromo(PROMO_A, idA, 'Promo Hotel A');
  await mkPromo(PROMO_B, idB, 'Promo Hotel B');

  await query(
    `INSERT INTO t_portal_user (id_mitra_promo, email, password_hash, nama, role)
     VALUES ($1,$2,$3,'FO A','operator'), ($4,$5,$6,'FO B','operator')`,
    [idA, MITRA_A.email, sha(MITRA_A.pass), idB, MITRA_B.email, sha(MITRA_B.pass)]
  );

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });

  // ---- 1. halaman login portal ----
  await page.goto(`${BASE}/portal/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1', { timeout: 15000 });
  const h1 = (await page.textContent('h1')).trim();
  cek('halaman login portal tampil', h1 === 'Portal Mitra', `h1="${h1}"`);
  await page.screenshot({ path: 'qa/screenshots/portal-login.png' });

  // ---- 2. password salah ----
  await page.fill('input[type="email"]', MITRA_A.email);
  await page.fill('input[type="password"]', 'salahbanget');
  await page.getByRole('button', { name: /Masuk/ }).click();
  await page.waitForTimeout(1500);
  const pesanSalah = (await page.locator('.msg').first().textContent().catch(() => '')) || '';
  cek('password salah ditolak dengan pesan', pesanSalah.includes('salah'), `msg="${pesanSalah.trim()}"`);

  // ---- 3. login benar ----
  await page.fill('input[type="password"]', MITRA_A.pass);
  await page.getByRole('button', { name: /Masuk/ }).click();
  await page.waitForURL(/\/portal\/promo/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const diPromo = page.url().includes('/portal/promo');
  cek('login berhasil masuk ke daftar promo', diPromo, page.url());

  const isi = await page.locator('.content').textContent().catch(() => '');
  cek('promo milik mitra A tampil', isi.includes(PROMO_A));
  cek('promo mitra B TIDAK tampil', !isi.includes(PROMO_B), 'isolasi antar mitra');
  await page.screenshot({ path: 'qa/screenshots/portal-promo.png' });

  // ---- 4. buka kelola peserta ----
  await page.getByRole('button', { name: /Kelola Peserta/ }).first().click();
  await page.waitForTimeout(1800);
  const diPeserta = /\/portal\/promo\/\d+/.test(page.url());
  cek('masuk ke halaman peserta', diPeserta, page.url());

  const adaTextarea = await page.locator('textarea').count();
  cek('form input massal tersedia', adaTextarea >= 1);

  // ---- 5. input massal ----
  // Sertakan email pengguna uji (id_user 8) supaya bisa dibuktikan bahwa
  // peserta terdaftar benar-benar lolos fn_promo_validasi.
  const daftar = [
    'tamu1@qa.test',
    'tamu2@qa.test',
    '081200000001',
    'tamu1@qa.test',            // duplikat
    '',                         // kosong
    'tamu3@qa.test',
    'ariefsumaila@gmail.com',   // akun mobile id_user 8
  ].join('\n');
  await page.locator('textarea').first().fill(daftar);
  await page.waitForTimeout(600);

  const pratinjau = (await page.locator('.panel').first().textContent()) || '';
  cek('pratinjau menghitung baris (6 valid dari 7)', pratinjau.includes('6 baris terdeteksi'),
      pratinjau.match(/\d+ baris terdeteksi[^\n]*/)?.[0] ?? 'tidak terdeteksi');

  // Baris ambigu (bukan email, bukan no HP wajar) harus DIPERINGATKAN,
  // bukan diam-diam dikirim sebagai no. HP.
  await page.locator('textarea').first().fill('abc def\ntamu9@qa.test');
  await page.waitForTimeout(500);
  const pratinjauAmbig = (await page.locator('.panel').first().textContent()) || '';
  cek('baris ambigu diberi peringatan', pratinjauAmbig.includes('tidak dikenali'),
      pratinjauAmbig.match(/\d+ baris tidak dikenali[^\n]*/)?.[0] ?? 'tidak terdeteksi');

  await page.locator('textarea').first().fill(daftar);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Daftarkan/ }).click();
  await page.waitForTimeout(2500);

  const hasilTeks = (await page.locator('.panel').first().textContent()) || '';
  cek('hasil massal menampilkan berhasil & ditolak',
      hasilTeks.includes('berhasil') && hasilTeks.includes('ditolak'),
      hasilTeks.match(/\d+ berhasil[^\n]*/)?.[0] ?? '-');
  cek('daftar yang berhasil bisa dilihat', hasilTeks.includes('yang berhasil'));
  await page.screenshot({ path: 'qa/screenshots/portal-peserta.png' });

  const jumlahDb = await query(
    `SELECT count(*)::int AS n FROM t_promo_peserta WHERE id_promo IN
       (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PROMO_A]
  );
  cek('peserta tersimpan di DB (5 unik)', jumlahDb[0].n === 5, `n=${jumlahDb[0].n}`);

  // ---- 6. peserta bisa memakai kode promo ----
  const validasi = await query(
    `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`, [PROMO_A]
  );
  cek('peserta (email terdaftar) lolos validasi promo', validasi[0].valid === true,
      `alasan=${validasi[0].alasan ?? '-'}`);

  // ---- 7. portal tidak bisa akses promo mitra lain lewat URL ----
  const promoB = await query(`SELECT id_promo FROM t_promo WHERE kode_promo=$1`, [PROMO_B]);
  await page.goto(`${BASE}/portal/promo/${promoB[0].id_promo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const halamanB = (await page.locator('.content').textContent().catch(() => '')) || '';
  cek('akses promo mitra lain lewat URL ditolak',
      halamanB.includes('Tidak Ditemukan') || halamanB.includes('tidak tersedia'),
      halamanB.slice(0, 60).replace(/\s+/g, ' '));

  // ---- 8. token portal tidak berlaku di admin ----
  const tokenPortal = await page.evaluate(() => localStorage.getItem('portal_token'));
  const rAdmin = await fetch(`${API}/admin/promo`, {
    headers: { Authorization: `Bearer ${tokenPortal}` },
  });
  cek('token portal ditolak di endpoint admin', rAdmin.status === 401, `status=${rAdmin.status}`);

  // ---- 9. logout ----
  await page.goto(`${BASE}/portal/promo`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Keluar/ }).click();
  await page.waitForTimeout(1200);
  cek('logout kembali ke halaman login portal', page.url().includes('/portal/login'), page.url());

  const sisaToken = await page.evaluate(() => localStorage.getItem('portal_token'));
  cek('token portal dihapus saat logout', sisaToken === null);

  // 401 (salah password) dan 404 (akses promo mitra lain) adalah respons
  // yang MEMANG diharapkan dari uji negatif di atas — bukan bug UI.
  const errsTakTerduga = errs.filter(
    (e) => !/401 \(Unauthorized\)/.test(e) && !/404 \(Not Found\)/.test(e)
  );
  cek('tidak ada error konsol tak terduga', errsTakTerduga.length === 0,
      errsTakTerduga.slice(0, 2).join(' | ') || `${errs.length} error diharapkan (401/404)`);

  await browser.close();
  await bersihkan();

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  if (gagal) console.log('GAGAL:', hasil.filter((h) => !h.ok).map((h) => h.nama).join('; '));
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error('QA GAGAL:', e.message);
  await bersihkan().catch(() => {});
  process.exit(1);
});
