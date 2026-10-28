/**
 * Uji integrasi: kendaraan yang ditambahkan PENGGUNA dari aplikasi harus
 * memenuhi syarat promo ATPM (cek_kendaraan = true).
 *
 * Ini rantai yang menghubungkan fitur profil dengan fitur promo:
 *   POST /user/kendaraan (merek BYD)
 *     -> id_mitra_promo terisi otomatis
 *     -> fn_promo_validasi lolos untuk promo ATPM BYD
 *
 * Jalankan di VM: DB_HOST_POSTGRE=127.0.0.1 node qa/kendaraan-promo-qa.cjs
 */
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
const jwt = require('/opt/energy/applications/spklu/backend/node_modules/jsonwebtoken');
const crypto = require('crypto');

const hasil = [];
function cek(nama, ok, info) {
  hasil.push({ nama, ok });
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${nama}${info ? '  ' + info : ''}`);
}

function token() {
  const email = 'ariefsumaila@gmail.com';
  const data = { id_user: 8, email, nama: 'Arief' };
  const key = crypto.createHmac('sha256', process.env.PENGACAK).update(email).digest('hex');
  return jwt.sign({ data, key }, process.env.SECRET_KEY, { expiresIn: '30m' });
}

function adminToken() {
  return (async () => {
    const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
    const svg = Buffer.from(c.data.image.split(',')[1], 'base64').toString('utf8');
    const code = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
    const l = await fetch(`${API}/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: QA_ADMIN_USER, password: QA_ADMIN_PASSWORD,
        captcha_id: c.data.id, captcha: code,
      }),
    }).then((r) => r.json());
    return l.token;
  })();
}

const MK = 'TM_QAKEND';
const PK = 'TEST_QAKEND';
const MEREK = 'QAKEND';

async function bersihkan() {
  await query(`DELETE FROM t_user_kendaraan WHERE merek ILIKE '${MEREK}%'`);
  await query(`DELETE FROM t_promo_pemakaian WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo_peserta WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo WHERE kode_promo=$1`, [PK]);
  await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [MK]);
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };
  const T = token();
  const MH = { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' };

  // ---- admin buat mitra + promo ATPM yang mensyaratkan kendaraan ----
  const m = await fetch(`${API}/admin/promo-mitra`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ jenis_mitra: 'atpm', kode: MK, nama: MEREK }),
  }).then((r) => r.json());
  const idMitra = m.data.id_mitra_promo;

  const p = await fetch(`${API}/admin/promo`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({
      kode_promo: PK, id_mitra_promo: idMitra, nama: 'Promo Kendaraan QA',
      tipe_potongan: 'per_kwh', nilai_potongan: 500, budget_rupiah: 1000000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
      butuh_peserta: true, cek_kendaraan: true,
    }),
  }).then((r) => r.json());
  const idPromo = p.data.id_promo;

  // ---- 1. belum punya kendaraan & belum jadi peserta -> ditolak ----
  const v1 = await query(
    `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
    [PK]
  );
  cek('tanpa kendaraan & peserta: ditolak', v1[0].valid === false,
      `alasan=${v1[0].alasan}`);

  // ---- 2. pengguna menambahkan kendaraan dari aplikasi ----
  const tambah = await fetch(`${API}/user/kendaraan`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({ merek: MEREK, tipe: 'Test EV', tahun: 2025 }),
  }).then((r) => r.json());
  cek('pengguna tambah kendaraan dari aplikasi', tambah.success === true,
      `id=${tambah.data?.id_kendaraan}`);
  cek('id_mitra_promo terisi otomatis dari merek',
      tambah.data.id_mitra_promo === idMitra,
      `id_mitra=${tambah.data?.id_mitra_promo} vs ${idMitra}`);

  // ---- 3. daftarkan peserta (peran ATPM) ----
  const peserta = await query(
    `INSERT INTO t_promo_peserta (id_promo, id_user, status)
     VALUES ($1, 8, 'active') RETURNING id_peserta`, [idPromo]
  );
  cek('peserta terdaftar', peserta.length === 1, `id=${peserta[0]?.id_peserta}`);

  // ---- 4. dua syarat terpenuhi -> valid ----
  const v2 = await query(
    `SELECT valid, alasan, potongan_rupiah FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
    [PK]
  );
  cek('kendaraan dari aplikasi memenuhi syarat promo ATPM', v2[0].valid === true,
      `alasan=${v2[0].alasan ?? '-'} potongan=${v2[0].potongan_rupiah}`);

  // ---- 5. hapus kendaraan -> syarat gugur lagi ----
  const hapus = await fetch(`${API}/user/kendaraan/${tambah.data.id_kendaraan}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${T}` },
  }).then((r) => r.json());
  cek('hapus kendaraan dari aplikasi', hapus.success === true);

  const v3 = await query(
    `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
    [PK]
  );
  cek('setelah kendaraan dihapus: syarat gugur',
      v3[0].valid === false && v3[0].alasan === 'KENDARAAN_TIDAK_COCOK',
      `alasan=${v3[0].alasan}`);

  // ---- 6. dua unit merek sama (yang tadinya diblok unique index) ----
  const a = await fetch(`${API}/user/kendaraan`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({ merek: MEREK, tipe: 'Unit A' }),
  }).then((r) => r.json());
  const b = await fetch(`${API}/user/kendaraan`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({ merek: MEREK, tipe: 'Unit B' }),
  }).then((r) => r.json());
  cek('dua unit merek sama tersimpan', a.success === true && b.success === true,
      `${a.message} / ${b.message}`);

  await bersihkan();

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error('QA GAGAL:', e.message);
  await bersihkan().catch(() => {});
  process.exit(1);
});
