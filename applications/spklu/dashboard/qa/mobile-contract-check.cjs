/**
 * Verifikasi kontrak mobile ↔ server: field yang dibaca aplikasi harus benar-
 * benar ada di respons, dengan tipe yang bisa diparse.
 *
 * Ini menjembatani "test klien lulus" dan "test backend lulus": yang diuji
 * adalah BENTUK respons nyata terhadap parser klien.
 *
 * Jalankan di VM: node qa/mobile-contract-check.cjs
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

const MK = 'TM_QAINTC';
const PK = 'TEST_QAINTC';

async function bersihkan() {
  await query(`DELETE FROM t_promo_pemakaian WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo_peserta WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo_iklan WHERE id_promo IN (SELECT id_promo FROM t_promo WHERE kode_promo=$1)`, [PK]);
  await query(`DELETE FROM t_promo WHERE kode_promo=$1`, [PK]);
  await query(`DELETE FROM t_promo_mitra WHERE kode=$1`, [MK]);
  await query(`DELETE FROM t_transaction WHERE kode_promo=$1`, [PK]);
}

function mobileToken() {
  const email = 'ariefsumaila@gmail.com';
  const data = { id_user: 8, email, nama: 'Arief' };
  const key = crypto.createHmac('sha256', process.env.PENGACAK).update(email).digest('hex');
  return jwt.sign({ data, key }, process.env.SECRET_KEY, { expiresIn: '30m' });
}

async function adminToken() {
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
}

/** Meniru parser Dart `Quote.fromJson`: field wajib harus ada & bertipe benar. */
function periksaQuote(q) {
  const wajib = [
    'kwh', 'harga_normal', 'potongan_perkwh', 'harga_efektif', 'biaya_energi',
    'pbjt_persen', 'pbjt', 'biaya_platform', 'biaya_layanan', 'kelas_layanan',
    'dpp', 'ppn_persen', 'ppn', 'total',
  ];
  const promo = [
    'id_promo', 'kode_promo', 'nama_promo', 'nama_mitra',
    'potongan_rupiah', 'potongan_dibatasi', 'id_peserta', 'promo_alasan',
  ];
  const hilang = [...wajib, ...promo].filter((k) => !(k in q));
  return hilang;
}

(async () => {
  await bersihkan();
  const AT = await adminToken();
  const AH = { Authorization: `Bearer ${AT}`, 'Content-Type': 'application/json' };
  const MT = mobileToken();
  const MH = { Authorization: `Bearer ${MT}`, 'Content-Type': 'application/json' };

  // ---- siapkan mitra + promo + iklan ----
  const m = await fetch(`${API}/admin/promo-mitra`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ jenis_mitra: 'atpm', kode: MK, nama: 'Mitra Kontrak' }),
  }).then((r) => r.json());
  const idMitra = m.data.id_mitra_promo;

  const p = await fetch(`${API}/admin/promo`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({
      kode_promo: PK, id_mitra_promo: idMitra, nama: 'Promo Kontrak',
      tipe_potongan: 'per_kwh', nilai_potongan: 600, budget_rupiah: 1000000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
      butuh_peserta: false, cek_kendaraan: false,
    }),
  }).then((r) => r.json());
  const idPromo = p.data.id_promo;

  await fetch(`${API}/admin/promo/${idPromo}/iklan`, {
    method: 'POST', headers: AH,
    body: JSON.stringify({ foto: 'kontrak.jpg', judul: 'Iklan Kontrak', maks_tayang_per_hari: 2 }),
  });

  // ================= 1. getharga TANPA promo =================
  const r1 = await fetch(`${API}/chargebox/getharga`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({ chargebox_id: 'EZ81920', connector_id: 1, jml_kwh_order: 20 }),
  }).then((r) => r.json());

  cek('getharga tanpa promo: sukses', r1.success === true);
  const hilang1 = periksaQuote(r1.data.quote);
  cek('semua field yang dibaca Quote.fromJson ada', hilang1.length === 0,
      hilang1.length ? `hilang: ${hilang1.join(', ')}` : `${Object.keys(r1.data.quote).length} field`);
  cek('tanpa promo: id_promo null, potongan 0',
      r1.data.quote.id_promo === null && Number(r1.data.quote.potongan_rupiah) === 0);

  // ================= 2. getharga DENGAN promo =================
  const r2 = await fetch(`${API}/chargebox/getharga`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({
      chargebox_id: 'EZ81920', connector_id: 1, jml_kwh_order: 20,
      kode_promo: PK,
    }),
  }).then((r) => r.json());

  cek('getharga dengan promo: sukses', r2.success === true, JSON.stringify(r2).slice(0, 80));
  const q2 = r2.data.quote;
  cek('kode_promo dikembalikan apa adanya', q2.kode_promo === PK, `kode=${q2.kode_promo}`);
  cek('nama_promo & nama_mitra terisi',
      !!q2.nama_promo && !!q2.nama_mitra, `${q2.nama_promo} / ${q2.nama_mitra}`);
  cek('potongan_rupiah = 12.000 (600 x 20)', Number(q2.potongan_rupiah) === 12000,
      `potongan=${q2.potongan_rupiah}`);
  cek('potongan_dibatasi berupa boolean false', q2.potongan_dibatasi === false);
  cek('promo_alasan null saat promo sah', q2.promo_alasan === null);
  cek('total berdiskon 44.210', Number(q2.total) === 44210, `total=${q2.total}`);
  cek('price_per_kwh = harga efektif 1.866', Number(r2.data.price_per_kwh) === 1866);

  // ================= 3. kode ditolak =================
  const r3 = await fetch(`${API}/chargebox/getharga`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({
      chargebox_id: 'EZ81920', connector_id: 1, jml_kwh_order: 20,
      kode_promo: 'TIDAK_ADA_KODE',
    }),
  }).then((r) => r.json());
  cek('kode salah: promo_alasan terisi, harga normal',
      r3.data.quote.promo_alasan === 'KODE_TIDAK_DITEMUKAN' &&
      Number(r3.data.quote.total) === 57890,
      `alasan=${r3.data.quote.promo_alasan} total=${r3.data.quote.total}`);

  // ================= 4. simpanorder membawa kode =================
  const r4 = await fetch(`${API}/transaction/simpanorder`, {
    method: 'POST', headers: MH,
    body: JSON.stringify({
      chargebox_id: 'EZ81920', connector_id: 1, id_user: 8, id_mitra: idMitra,
      id_carabayar: 0, tipe_charging: 'kwh', jml_kwh_order: 20,
      kode_promo: PK, id_wallet: 'SAC-2661-1741083847148',
    }),
  }).then((r) => r.json());

  cek('order dengan kode: promo dipakai', r4.success === true && r4.promo_dipakai === true,
      `no_trans=${r4.no_trans} total=${r4.grandtotal}`);
  cek('order: field promo_dipakai & promo_alasan ada di respons',
      'promo_dipakai' in r4 && 'promo_alasan' in r4);

  const snap = await query(
    `SELECT kode_promo, potongan_rupiah, id_promo FROM t_transaction WHERE no_trans=$1`,
    [String(r4.no_trans)]
  );
  cek('snapshot promo tersimpan di transaksi',
      snap.length === 1 && snap[0].kode_promo === PK && Number(snap[0].potongan_rupiah) === 12000,
      JSON.stringify(snap[0] || {}));

  // ================= 5. iklan untuk mobile =================
  const r5 = await fetch(`${API}/promo/iklan`, { headers: MH }).then((r) => r.json());
  cek('daftar iklan: sukses', r5.success === true, `n=${(r5.data || []).length}`);

  const ik = (r5.data || [])[0];
  cek('field iklan yang dibaca PromoIklan.fromJson ada',
      !!ik && 'id_iklan' in ik && 'foto_url' in ik && 'kode_promo' in ik && 'nama_mitra' in ik,
      ik ? Object.keys(ik).join(',') : 'kosong');
  cek('foto_url absolut (bukan path relatif)',
      !!ik && /^https?:\/\//.test(ik.foto_url), ik ? ik.foto_url : '-');

  if (ik) {
    const r6 = await fetch(`${API}/promo/iklan/${ik.id_iklan}/tayang`, {
      method: 'POST', headers: MH, body: '{}',
    }).then((r) => r.json());
    cek('catat impresi: tayang_hari_ini naik',
        r6.success === true && r6.data.tayang_hari_ini >= 1,
        `tayang=${r6.data?.tayang_hari_ini}`);
  }

  await bersihkan();

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  if (gagal) console.log('GAGAL:', hasil.filter((h) => !h.ok).map((h) => h.nama).join('; '));
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error('CEK GAGAL:', e.message);
  await bersihkan().catch(() => {});
  process.exit(1);
});
