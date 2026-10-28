'use strict';

/**
 * Test lapisan HTTP: admin promo CRUD, portal mitra, ATPM, iklan mobile.
 * Butuh server backend HIDUP (test memanggil API sungguhan).
 *
 * Jalankan: npm run test:api
 */

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const h = require('./helpers');

const { query, makeClient, adminToken, mobileToken, cleanup, kode } = h;

let admin;   // client ber-token admin
let mobile;  // client ber-token mobile
let ctx = {}; // id yang dibuat di before

before(async () => {
  await cleanup();

  const ok = await h.pastikanServerHidup();
  assert.ok(ok, `Server tidak hidup di ${h.API}. Jalankan backend dulu.`);

  admin = makeClient(await adminToken());
  mobile = makeClient(mobileToken());
});

after(async () => { await cleanup(); });

describe('admin — mitra promo', () => {
  test('buat mitra ATPM', async () => {
    const r = await admin.post('/admin/promo-mitra', {
      jenis_mitra: 'atpm', kode: 'TM_A1', nama: 'ATPM Test', kontak_email: 'a@test.local',
    });
    assert.equal(r.body.success, true, JSON.stringify(r.body));
    ctx.idMitraAtpm = r.body.data.id_mitra_promo;
  });

  test('buat mitra hotel', async () => {
    const r = await admin.post('/admin/promo-mitra', {
      jenis_mitra: 'hotel', kode: 'TM_H1', nama: 'Hotel Test',
    });
    assert.equal(r.body.success, true);
    ctx.idMitraHotel = r.body.data.id_mitra_promo;
  });

  test('kode mitra duplikat ditolak 409', async () => {
    const r = await admin.post('/admin/promo-mitra', {
      jenis_mitra: 'atpm', kode: 'TM_A1', nama: 'Duplikat',
    });
    assert.equal(r.status, 409);
  });

  test('jenis mitra tidak valid ditolak 400', async () => {
    const r = await admin.post('/admin/promo-mitra', {
      jenis_mitra: 'ngawur', kode: 'TM_X1', nama: 'X',
    });
    assert.equal(r.status, 400, 'validasi harus 400, bukan 200');
  });

  test('daftar mitra memuat data yang dibuat', async () => {
    const r = await admin.get('/admin/promo-mitra');
    assert.equal(r.body.success, true);
    assert.ok(r.body.data.some((m) => m.kode === 'TM_A1'));
  });

  test('API key hanya untuk ATPM', async () => {
    const r = await admin.post(`/admin/promo-mitra/${ctx.idMitraHotel}/api-key`, {});
    assert.equal(r.status, 400);
  });

  test('buat API key ATPM, plaintext 48 karakter', async () => {
    const r = await admin.post(`/admin/promo-mitra/${ctx.idMitraAtpm}/api-key`, {});
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.api_key.length, 48);
    ctx.apiKey = r.body.data.api_key;
  });
});

describe('admin — promo', () => {
  test('buat promo ATPM', async () => {
    const r = await admin.post('/admin/promo', {
      kode_promo: kode('A1'),
      id_mitra_promo: ctx.idMitraAtpm,
      nama: 'Promo Test ATPM',
      tipe_potongan: 'per_kwh', nilai_potongan: 600, budget_rupiah: 1000000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
      butuh_peserta: true, cek_kendaraan: true,
    });
    assert.equal(r.body.success, true, JSON.stringify(r.body));
    ctx.idPromoAtpm = r.body.data.id_promo;
  });

  test('kode huruf kecil otomatis uppercase', async () => {
    const r = await admin.post('/admin/promo', {
      kode_promo: kode('h1').toLowerCase(),
      id_mitra_promo: ctx.idMitraHotel,
      nama: 'Promo Hotel', tipe_potongan: 'nominal', nilai_potongan: 25000,
      budget_rupiah: 500000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
    });
    assert.equal(r.body.success, true);
    ctx.idPromoHotel = r.body.data.id_promo;

    const cek = await query(`SELECT kode_promo FROM t_promo WHERE id_promo=$1`, [ctx.idPromoHotel]);
    assert.equal(cek[0].kode_promo, kode('h1').toUpperCase());
  });

  test('kode terlalu pendek ditolak 400', async () => {
    const r = await admin.post('/admin/promo', {
      kode_promo: 'ab', id_mitra_promo: ctx.idMitraAtpm, nama: 'X',
      tipe_potongan: 'per_kwh', nilai_potongan: 100, budget_rupiah: 1000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2026-12-31',
    });
    assert.equal(r.status, 400);
  });

  test('periode terbalik ditolak 400', async () => {
    const r = await admin.post('/admin/promo', {
      kode_promo: kode('BAD1'), id_mitra_promo: ctx.idMitraAtpm, nama: 'X',
      tipe_potongan: 'per_kwh', nilai_potongan: 100, budget_rupiah: 1000,
      tanggal_mulai: '2026-12-31', tanggal_selesai: '2026-01-01',
    });
    assert.equal(r.status, 400);
  });

  test('cek_kendaraan untuk non-ATPM ditolak 400', async () => {
    const r = await admin.post('/admin/promo', {
      kode_promo: kode('BAD2'), id_mitra_promo: ctx.idMitraHotel, nama: 'X',
      tipe_potongan: 'per_kwh', nilai_potongan: 100, budget_rupiah: 1000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2026-12-31',
      cek_kendaraan: true,
    });
    assert.equal(r.status, 400);
  });

  test('budget tidak boleh lebih kecil dari terpakai (409)', async () => {
    await query(`UPDATE t_promo SET budget_terpakai = 500000 WHERE id_promo=$1`, [ctx.idPromoAtpm]);
    const r = await admin.put(`/admin/promo/${ctx.idPromoAtpm}`, {
      kode_promo: kode('A1'), id_mitra_promo: ctx.idMitraAtpm, nama: 'Promo Test ATPM',
      tipe_potongan: 'per_kwh', nilai_potongan: 600, budget_rupiah: 100000,
      tanggal_mulai: '2026-01-01', tanggal_selesai: '2027-12-31',
    });
    assert.equal(r.status, 409);
    await query(`UPDATE t_promo SET budget_terpakai = 0 WHERE id_promo=$1`, [ctx.idPromoAtpm]);
  });

  test('daftar promo: sisa_budget berupa integer', async () => {
    const r = await admin.get('/admin/promo');
    assert.equal(r.body.success, true);
    const p = r.body.data.find((x) => x.id_promo === ctx.idPromoAtpm);
    assert.ok(p, 'promo ada di daftar');
    assert.ok(Number.isInteger(p.sisa_budget), `sisa_budget=${p.sisa_budget}`);
    assert.ok(Number.isInteger(p.budget_rupiah));
  });

  test('detail promo memuat iklan', async () => {
    const r = await admin.get(`/admin/promo/${ctx.idPromoAtpm}`);
    assert.equal(r.body.success, true);
    assert.ok(Array.isArray(r.body.data.iklan));
  });
});

describe('admin — iklan', () => {
  test('tambah iklan', async () => {
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/iklan`, {
      foto: 'test-iklan.jpg', judul: 'Iklan Test', maks_tayang_per_hari: 2,
    });
    assert.equal(r.body.success, true);
    ctx.idIklan = r.body.data.id_iklan;
  });

  test('iklan tanpa foto ditolak 400', async () => {
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/iklan`, { judul: 'Tanpa foto' });
    assert.equal(r.status, 400);
  });

  test('daftar iklan', async () => {
    const r = await admin.get(`/admin/promo/${ctx.idPromoAtpm}/iklan`);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.length, 1);
  });
});

describe('admin — peserta', () => {
  test('tambah peserta, id_user diisi otomatis dari email', async () => {
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/peserta`, {
      email: 'ariefsumaila@gmail.com',
    });
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.id_user, 8);
    ctx.idPeserta = r.body.data.id_peserta;
  });

  test('peserta duplikat ditolak 409', async () => {
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/peserta`, {
      email: 'ariefsumaila@gmail.com',
    });
    assert.equal(r.status, 409);
  });

  test('tanpa identitas ditolak 400', async () => {
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/peserta`, {});
    assert.equal(r.status, 400);
  });
});

describe('ATPM', () => {
  test('tanpa API key ditolak 401', async () => {
    const r = await makeClient(null).post('/atpm/kendaraan', {
      email: 'ariefsumaila@gmail.com', kode_promo: kode('A1'),
    });
    assert.equal(r.status, 401);
  });

  test('daftar kendaraan berhasil', async () => {
    const r = await makeClient(null).post(
      '/atpm/kendaraan',
      { email: 'ariefsumaila@gmail.com', kode_promo: kode('A1') },
      { 'X-Api-Key': ctx.apiKey }
    );
    assert.equal(r.body.success, true, JSON.stringify(r.body));
    assert.equal(r.body.data.status, 'TERDAFTAR');
  });

  test('retry idempoten', async () => {
    const r = await makeClient(null).post(
      '/atpm/kendaraan',
      { email: 'ariefsumaila@gmail.com', kode_promo: kode('A1') },
      { 'X-Api-Key': ctx.apiKey }
    );
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.status, 'TERDAFTAR');

    const n = await query(
      `SELECT count(*)::int AS n FROM t_user_kendaraan WHERE id_user=8 AND id_mitra_promo=$1`,
      [ctx.idMitraAtpm]
    );
    assert.equal(n[0].n, 1, 'tidak menggandakan baris');
  });

  test('kode promo milik mitra lain ditolak 403', async () => {
    const r = await makeClient(null).post(
      '/atpm/kendaraan',
      { email: 'ariefsumaila@gmail.com', kode_promo: kode('h1') },
      { 'X-Api-Key': ctx.apiKey }
    );
    assert.equal(r.status, 403);
  });

  test('sumber kendaraan = atpm_endpoint', async () => {
    const r = await query(
      `SELECT sumber FROM t_user_kendaraan WHERE id_user=8 AND id_mitra_promo=$1`,
      [ctx.idMitraAtpm]
    );
    assert.equal(r[0].sumber, 'atpm_endpoint');
  });
});

describe('portal mitra', () => {
  before(async () => {
    const hash = crypto.createHash('sha256').update('rahasia-test').digest('hex');
    await query(
      `INSERT INTO t_portal_user (id_mitra_promo, email, password_hash, nama, role)
       VALUES ($1, 'fo@test.local', $2, 'FO Test', 'operator')`,
      [ctx.idMitraHotel, hash]
    );
  });

  test('login password salah ditolak 401', async () => {
    const r = await makeClient(null).post('/portal/login', {
      email: 'fo@test.local', password: 'salah',
    });
    assert.equal(r.status, 401);
  });

  test('login berhasil', async () => {
    const r = await makeClient(null).post('/portal/login', {
      email: 'fo@test.local', password: 'rahasia-test',
    });
    assert.equal(r.body.success, true);
    assert.ok(r.body.data.token);
    ctx.portal = makeClient(r.body.data.token);
  });

  test('portal hanya melihat promo miliknya', async () => {
    const r = await ctx.portal.get('/portal/promo');
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.length, 1);
    assert.equal(r.body.data[0].id_promo, ctx.idPromoHotel);
  });

  test('promo mitra lain -> 404 (bukan 403)', async () => {
    const r = await ctx.portal.get(`/portal/promo/${ctx.idPromoAtpm}/peserta`);
    assert.equal(r.status, 404, 'keberadaan promo mitra lain tidak boleh bocor');
  });

  test('input peserta massal: hasil per baris', async () => {
    const r = await ctx.portal.post(`/portal/promo/${ctx.idPromoHotel}/peserta`, {
      peserta: [
        { email: 'tamu1@test.local' },
        { email: 'tamu2@test.local' },
        { email: 'tamu1@test.local' }, // duplikat
        {},                            // tanpa identitas
      ],
    });
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.berhasil.length, 2);
    assert.equal(r.body.data.gagal.length, 2);
  });

  test('portal tidak bisa hapus peserta mitra lain', async () => {
    const r = await ctx.portal.del(`/portal/peserta/${ctx.idPeserta}`);
    assert.equal(r.status, 404);
  });

  test('portal bisa hapus peserta sendiri', async () => {
    const list = await ctx.portal.get(`/portal/promo/${ctx.idPromoHotel}/peserta`);
    const id = list.body.data[0].id_peserta;
    const r = await ctx.portal.del(`/portal/peserta/${id}`);
    assert.equal(r.body.success, true);
  });

  test('token portal ditolak di endpoint admin', async () => {
    const r = await ctx.portal.get('/admin/promo');
    assert.equal(r.status, 401);
  });
});

describe('mobile — iklan', () => {
  test('daftar iklan, foto_url dibentuk server', async () => {
    const r = await mobile.get('/promo/iklan');
    assert.equal(r.body.success, true);
    const ik = r.body.data.find((x) => x.id_iklan === ctx.idIklan);
    assert.ok(ik, 'iklan muncul');
    assert.ok(ik.foto_url.startsWith('https://'), ik.foto_url);
  });

  test('catat impresi 1 dan 2', async () => {
    const a = await mobile.post(`/promo/iklan/${ctx.idIklan}/tayang`, {});
    assert.equal(a.body.data.tayang_hari_ini, 1);
    const b = await mobile.post(`/promo/iklan/${ctx.idIklan}/tayang`, {});
    assert.equal(b.body.data.tayang_hari_ini, 2);
  });

  test('impresi ke-3 ditolak saat batas 2/hari', async () => {
    const r = await mobile.post(`/promo/iklan/${ctx.idIklan}/tayang`, {});
    assert.equal(r.body.data.tayang_hari_ini, 2, 'tidak bertambah');
  });

  test('iklan hilang dari daftar setelah batas', async () => {
    const r = await mobile.get('/promo/iklan');
    assert.ok(!r.body.data.some((x) => x.id_iklan === ctx.idIklan));
  });
});

describe('admin — tutup periode & laporan', () => {
  test('tutup periode hangus', async () => {
    await query(`UPDATE t_promo SET tanggal_selesai = CURRENT_DATE - 1 WHERE id_promo=$1`, [ctx.idPromoAtpm]);
    const r = await admin.post(`/admin/promo/${ctx.idPromoAtpm}/tutup-periode`, {});
    assert.equal(r.body.success, true, JSON.stringify(r.body));
    assert.equal(r.body.data.status, 'HANGUS');
  });

  test('tutup periode promo tidak ada -> 404', async () => {
    const r = await admin.post('/admin/promo/99999999/tutup-periode', {});
    assert.equal(r.status, 404);
  });

  test('endpoint eksposur', async () => {
    const r = await admin.get('/admin/promo/eksposur');
    assert.equal(r.body.success, true);
    assert.ok(typeof r.body.data.ringkasan.total_rupiah === 'number');
  });

  test('endpoint pemakaian', async () => {
    const r = await admin.get(`/admin/promo/${ctx.idPromoAtpm}/pemakaian`);
    assert.equal(r.body.success, true);
    assert.ok(Array.isArray(r.body.data));
  });
});
