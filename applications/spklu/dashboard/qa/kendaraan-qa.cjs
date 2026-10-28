/**
 * Uji endpoint daftar kendaraan pengguna.
 * Jalankan di VM: DB_HOST_POSTGRE=127.0.0.1 node qa/kendaraan-qa.cjs
 */
const API = 'http://127.0.0.1:8080';

require('/opt/energy/applications/spklu/backend/node_modules/dotenv')
  .config({ path: '/opt/energy/applications/spklu/backend/.env' });
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

function tokenUntuk(idUser, email) {
  const data = { id_user: idUser, email, nama: 'QA' };
  const key = crypto.createHmac('sha256', process.env.PENGACAK).update(email).digest('hex');
  return jwt.sign({ data, key }, process.env.SECRET_KEY, { expiresIn: '30m' });
}

const EMAIL_A = 'ariefsumaila@gmail.com';
const EMAIL_B = 'qa-kendaraan-b@test.local';

async function bersihkan() {
  await query(`DELETE FROM t_user_kendaraan WHERE id_user = 8 AND merek LIKE 'QA%'`);
  await query(`DELETE FROM t_user_kendaraan WHERE id_user IN (SELECT id_user FROM t_user_mobile WHERE email = $1)`, [EMAIL_B]);
  await query(`DELETE FROM t_user_mobile WHERE email = $1`, [EMAIL_B]);
}

(async () => {
  await bersihkan();

  // pengguna kedua untuk uji isolasi
  const ub = await query(
    `INSERT INTO t_user_mobile (email, nama, id_mitra, id_jenismember, id_wallet)
     VALUES ($1, 'QA B', 0, 0, '') RETURNING id_user`,
    [EMAIL_B]
  );
  const idB = ub[0].id_user;

  const TA = tokenUntuk(8, EMAIL_A);
  const TB = tokenUntuk(idB, EMAIL_B);
  const HA = { Authorization: `Bearer ${TA}`, 'Content-Type': 'application/json' };
  const HB = { Authorization: `Bearer ${TB}`, 'Content-Type': 'application/json' };
  const HAd = { Authorization: `Bearer ${TA}` };

  const call = async (method, path, body, headers) => {
    const h = { ...headers };
    if (method === 'DELETE') delete h['Content-Type'];
    const opts = { method, headers: h };
    if (body !== undefined && method !== 'DELETE') {
      h['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(API + path, opts);
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  // ---- 1. tanpa token ----
  const noAuth = await call('GET', '/user/kendaraan', undefined, {});
  // Kontrak mobile (mobileTokenAuth) membalas 200 + success:false 'invalid0',
  // bukan 401. Yang wajib: tidak ada data yang bocor.
  cek('tanpa token: ditolak, tanpa data',
      noAuth.body.success === false && noAuth.body.data === null,
      `status=${noAuth.status} msg=${noAuth.body.message}`);

  // ---- 2. daftar awal kosong ----
  const awal = await call('GET', '/user/kendaraan', undefined, HAd);
  cek('daftar awal berhasil', awal.body.success === true, `n=${awal.body.data?.length}`);

  // ---- 3. tambah kendaraan ----
  const c1 = await call('POST', '/user/kendaraan', {
    merek: 'QA Toyota', tipe: 'Avanza', tahun: 2023, nomor_polisi: 'dk 1234 qa',
  }, HA);
  cek('tambah kendaraan', c1.body.success === true, `id=${c1.body.data?.id_kendaraan}`);
  const idK1 = c1.body.data.id_kendaraan;

  const c2 = await call('POST', '/user/kendaraan', {
    merek: 'QA Honda', tipe: 'Brio', tahun: 2022,
  }, HA);
  cek('tambah kendaraan kedua', c2.body.success === true, `id=${c2.body.data?.id_kendaraan}`);

  // ---- 4. dua unit merek SAMA harus boleh (bug yang diperbaiki migrasi) ----
  const c3 = await call('POST', '/user/kendaraan', {
    merek: 'QA Toyota', tipe: 'Yaris', tahun: 2024,
  }, HA);
  cek('dua unit merek sama diterima', c3.body.success === true,
      `id=${c3.body.data?.id_kendaraan} ${c3.body.message}`);

  // ---- 5. validasi ----
  const cKosong = await call('POST', '/user/kendaraan', { tipe: 'X' }, HA);
  cek('merek kosong ditolak 400', cKosong.status === 400, `status=${cKosong.status}`);

  const cTahun = await call('POST', '/user/kendaraan', { merek: 'QA X', tahun: 1800 }, HA);
  cek('tahun tidak valid ditolak 400', cTahun.status === 400, `status=${cTahun.status}`);

  const cVin = await call('POST', '/user/kendaraan', { merek: 'QA Y', vin: 'AB' }, HA);
  cek('VIN terlalu pendek ditolak 400', cVin.status === 400, `status=${cVin.status}`);

  // ---- 6. VIN duplikat per pengguna ----
  const v1 = await call('POST', '/user/kendaraan', { merek: 'QA Vin1', vin: 'QAVIN1234567890' }, HA);
  const v2 = await call('POST', '/user/kendaraan', { merek: 'QA Vin2', vin: 'qavin1234567890' }, HA);
  cek('VIN duplikat ditolak 409 (case-insensitive)', v2.status === 409,
      `status=${v2.status} ${v2.body.message}`);

  // ---- 7. daftar memuat semua + nomor polisi uppercase ----
  const daftar = await call('GET', '/user/kendaraan', undefined, HAd);
  const qa = (daftar.body.data || []).filter((k) => k.merek.startsWith('QA'));
  // c1 (Toyota Avanza), c2 (Honda Brio), c3 (Toyota Yaris), v1 (QA Vin1).
  // v2 gagal karena VIN duplikat, jadi 4 adalah jumlah yang benar.
  cek('daftar memuat semua kendaraan QA', qa.length === 4, `n=${qa.length}`);
  const toyota = qa.find((k) => k.merek === 'QA Toyota' && k.tipe === 'Avanza');
  cek('nomor polisi disimpan uppercase', toyota?.nomor_polisi === 'DK 1234 QA',
      `np=${toyota?.nomor_polisi}`);

  // ---- 8. isolasi: pengguna B tidak melihat kendaraan A ----
  const daftarB = await call('GET', '/user/kendaraan', undefined, HB);
  cek('pengguna B tidak melihat kendaraan A', (daftarB.body.data || []).length === 0,
      `n=${daftarB.body.data?.length}`);

  const ubahLain = await call('PUT', `/user/kendaraan/${idK1}`, { merek: 'Dibajak' }, HB);
  cek('pengguna B tidak bisa mengubah kendaraan A (404)', ubahLain.status === 404,
      `status=${ubahLain.status}`);

  const hapusLain = await call('DELETE', `/user/kendaraan/${idK1}`, undefined, HB);
  cek('pengguna B tidak bisa menghapus kendaraan A (404)', hapusLain.status === 404,
      `status=${hapusLain.status}`);

  // ---- 9. update milik sendiri ----
  const upd = await call('PUT', `/user/kendaraan/${idK1}`, {
    merek: 'QA Toyota', tipe: 'Avanza G', tahun: 2023, nomor_polisi: 'DK 1234 QA',
  }, HA);
  cek('update kendaraan sendiri', upd.body.success === true, upd.body.message);

  const cekUpd = await query(`SELECT tipe FROM t_user_kendaraan WHERE id_kendaraan=$1`, [idK1]);
  cek('perubahan tersimpan', cekUpd[0].tipe === 'Avanza G', `tipe=${cekUpd[0].tipe}`);

  // ---- 10. hapus ----
  const hapus = await call('DELETE', `/user/kendaraan/${idK1}`, undefined, HAd);
  cek('hapus kendaraan sendiri', hapus.body.success === true, hapus.body.message);

  const hapusLagi = await call('DELETE', `/user/kendaraan/${idK1}`, undefined, HAd);
  cek('hapus dua kali -> 404', hapusLagi.status === 404, `status=${hapusLagi.status}`);

  // ---- 11. merek cocok mitra promo -> id_mitra_promo terisi ----
  await query(`DELETE FROM t_promo_mitra WHERE kode = 'QAMITRA'`);
  await query(`INSERT INTO t_promo_mitra (jenis_mitra, kode, nama) VALUES ('atpm','QAMITRA','QA Mitra')`);
  const cocok = await call('POST', '/user/kendaraan', { merek: 'qamitra', tipe: 'X1' }, HA);
  cek('merek cocok mitra -> id_mitra_promo terisi',
      cocok.body.success === true && cocok.body.data.id_mitra_promo !== null,
      `id_mitra=${cocok.body.data?.id_mitra_promo}`);

  await bersihkan();
  await query(`DELETE FROM t_promo_mitra WHERE kode = 'QAMITRA'`);

  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(`\n=== RINGKASAN: ${hasil.length - gagal} lulus, ${gagal} gagal ===`);
  if (gagal) console.log('GAGAL:', hasil.filter((h) => !h.ok).map((h) => h.nama).join('; '));
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error('QA GAGAL:', e.message);
  await bersihkan().catch(() => {});
  process.exit(1);
});
