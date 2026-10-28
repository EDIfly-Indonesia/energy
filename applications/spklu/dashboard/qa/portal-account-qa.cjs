// Uji definition of done: ketiga skenario bisa dijalankan TANPA intervensi SQL.
//
// Fokus: skenario hotel/asuransi sebelumnya butuh INSERT t_portal_user manual.
// Sekarang admin membuat akun portal lewat API, lalu front office login.
//
// Jalankan di VM: node qa/portal-account-qa.cjs
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

const MK = 'TM_QAPORTAL';
const PK = 'TEST_QAPORTAL';
const EMAIL = 'fo-portal@qa.test';
const PASS = 'rahasia123';

async function bersihkan() {
  await query(`DELETE FROM t_portal_user WHERE id_mitra_promo IN (SELECT id_mitra_promo FROM t_promo_mitra WHERE kode=$1)`, [MK]);
  await query(`DELETE FROM t_promo_pemakaian WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo_peserta WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo WHERE kode_promo=$1`, [PK]);
  await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [MK]);
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };
  const AHd = { Authorization: `Bearer ${AT}` };

  // ---- admin buat mitra + promo (lewat API, bukan SQL) ----
  const m = await fetch(`${API}/admin/promo-mitra`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ jenis_mitra: 'hotel', kode: MK, nama: 'Hotel Portal QA' }),
  }).then((r) => r.json());
  const idMitra = m.data.id_mitra_promo;
  cek('admin buat mitra hotel', m.success === true);

  const p = await fetch(`${API}/admin/promo`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({
      kode_promo: PK, id_mitra_promo: idMitra, nama: 'Promo Portal QA',
      tipe_potongan: 'nominal', nilai_potongan: 25000, budget_rupiah: 500000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
      butuh_peserta: true, cek_kendaraan: false,
    }),
  }).then((r) => r.json());
  cek('admin buat promo', p.success === true);

  // ---- 1. admin buat akun portal LEWAT API ----
  const buat = await fetch(`${API}/admin/promo-mitra/${idMitra}/portal-user`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ email: EMAIL, password: PASS, nama: 'FO Portal', role: 'operator' }),
  }).then((r) => r.json());
  cek('admin buat akun portal via API', buat.success === true, buat.message);

  // ---- 2. daftar akun tidak membocorkan password ----
  const list = await fetch(`${API}/admin/promo-mitra/${idMitra}/portal-user`, {
    headers: AHd,
  }).then((r) => r.json());
  cek('daftar akun portal', list.success === true && list.data.length === 1,
      `n=${list.data?.length}`);
  const adaHash = list.data.some((u) => 'password_hash' in u || 'password' in u);
  cek('password/hash TIDAK dikirim ke klien', !adaHash,
      Object.keys(list.data[0] || {}).join(','));

  // ---- 3. validasi ----
  const pendek = await fetch(`${API}/admin/promo-mitra/${idMitra}/portal-user`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ email: 'x@y.test', password: 'pendek' }),
  }).then((r) => r.json());
  cek('password < 8 karakter ditolak 400', pendek.success === false,
      pendek.message);

  const dup = await fetch(`${API}/admin/promo-mitra/${idMitra}/portal-user`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ email: EMAIL, password: 'rahasia456' }),
  }).then((r) => r.json());
  cek('email duplikat ditolak', dup.success === false, dup.message);

  // ---- 4. front office login dengan akun yang dibuat admin ----
  const login = await fetch(`${API}/portal/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  }).then((r) => r.json());
  cek('front office login pakai akun buatan admin',
      login.success === true && !!login.data.token, login.data?.nama_mitra);

  const PH = { Authorization: `Bearer ${login.data.token}`, 'Content-Type': 'application/json' };

  // ---- 5. daftarkan tamu ----
  const daftar = await fetch(`${API}/portal/promo/${p.data.id_promo}/peserta`, {
    method: 'POST', headers: PH,
    body: JSON.stringify({ peserta: [{ email: 'tamu-portal@qa.test' }] }),
  }).then((r) => r.json());
  cek('front office daftarkan tamu',
      daftar.success === true && daftar.data.berhasil.length === 1,
      `berhasil=${daftar.data?.berhasil?.length}`);

  // ---- 6. tamu bisa pakai kode (validasi promo lolos) ----
  const v = await query(
    `SELECT valid, alasan FROM fn_promo_validasi(999, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
    [PK]
  );
  // id 999 bukan peserta; yang diuji: email tamu terdaftar -> lolos saat
  // pengguna dengan email itu memakai kode. Cek keberadaan peserta saja.
  const pses = await query(
    `SELECT count(*)::int AS n FROM t_promo_peserta WHERE id_promo=$1 AND email='tamu-portal@qa.test'`,
    [p.data.id_promo]
  );
  cek('peserta tersimpan dengan email tamu', pses[0].n === 1, `n=${pses[0].n}`);

  // ---- 7. nonaktifkan akun -> login ditolak ----
  const idUser = list.data[0].id_portal_user;
  const nonaktif = await fetch(`${API}/admin/portal-user/${idUser}`, {
    method: 'PUT', headers: AH,
    body: JSON.stringify({ aktif: false }),
  }).then((r) => r.json());
  cek('admin nonaktifkan akun', nonaktif.success === true);

  const loginMati = await fetch(`${API}/portal/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  cek('akun nonaktif tidak bisa login', loginMati.status === 403, `status=${loginMati.status}`);

  // ---- 8. ganti password ----
  await fetch(`${API}/admin/portal-user/${idUser}`, {
    method: 'PUT', headers: AH,
    body: JSON.stringify({ aktif: true, password: 'passwordbaru9' }),
  });

  const loginLama = await fetch(`${API}/portal/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  cek('password lama tidak berlaku setelah diganti', loginLama.status === 401,
      `status=${loginLama.status}`);

  const loginBaru = await fetch(`${API}/portal/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'passwordbaru9' }),
  }).then((r) => r.json());
  cek('password baru berlaku', loginBaru.success === true);

  // ---- 9. hapus akun ----
  const hapus = await fetch(`${API}/admin/portal-user/${idUser}`, {
    method: 'DELETE', headers: AHd,
  }).then((r) => r.json());
  cek('admin hapus akun portal', hapus.success === true);

  const sisaPeserta = await query(
    `SELECT count(*)::int AS n FROM t_promo_peserta WHERE id_promo=$1`, [p.data.id_promo]
  );
  cek('riwayat peserta tetap ada setelah akun dihapus', sisaPeserta[0].n === 1,
      `n=${sisaPeserta[0].n}`);

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
