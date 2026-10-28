'use strict';

/**
 * Test lapisan database: fungsi promo (validasi, klaim, batal, tutup periode).
 * Tidak lewat HTTP. Membuktikan logika SQL benar terlepas dari controller.
 *
 * Jalankan: npm run test:db
 */

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { query, kode, buatPromo, cleanup } = h;

before(async () => { await cleanup(); });
after(async () => { await cleanup(); });

describe('fn_promo_validasi', () => {
  test('kode tidak dikenal', async () => {
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, 'TIDAK_ADA_KODE', 'EZ81920', 1, 20, CURRENT_DATE)`
    );
    assert.equal(r[0].valid, false);
    assert.equal(r[0].alasan, 'KODE_TIDAK_DITEMUKAN');
  });

  test('kode kosong', async () => {
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, '', 'EZ81920', 1, 20, CURRENT_DATE)`
    );
    assert.equal(r[0].valid, false);
    assert.equal(r[0].alasan, 'KODE_KOSONG');
  });

  test('promo valid menghitung potongan per_kwh', async () => {
    const { kodePromo } = await buatPromo({ suffix: 'V1', nilai: 600, budget: 1000000 });
    const r = await query(
      `SELECT valid, potongan_rupiah, potongan_perkwh, sisa_budget
         FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].valid, true);
    assert.equal(Number(r[0].potongan_rupiah), 12000); // 600 x 20
    assert.equal(Number(r[0].potongan_perkwh), 600);
    assert.equal(Number(r[0].sisa_budget), 1000000);
  });

  test('huruf kecil tetap dikenali', async () => {
    const { kodePromo } = await buatPromo({ suffix: 'V2', nilai: 600 });
    const r = await query(
      `SELECT valid, kode_promo FROM fn_promo_validasi(8, lower($1), 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].valid, true);
    assert.equal(r[0].kode_promo, kodePromo);
  });

  test('kedaluwarsa', async () => {
    const { kodePromo } = await buatPromo({
      suffix: 'V3', mulai: '2020-01-01', selesai: '2020-12-31',
    });
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].alasan, 'KEDALUWARSA');
  });

  test('belum mulai', async () => {
    const { kodePromo } = await buatPromo({
      suffix: 'V4', mulai: '2030-01-01', selesai: '2030-12-31',
    });
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].alasan, 'BELUM_MULAI');
  });

  test('promo nonaktif', async () => {
    const { idPromo, kodePromo } = await buatPromo({ suffix: 'V5' });
    await query(`UPDATE t_promo SET aktif=false WHERE id_promo=$1`, [idPromo]);
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].alasan, 'PROMO_NONAKTIF');
  });

  test('butuh peserta: belum terdaftar', async () => {
    const { kodePromo } = await buatPromo({ suffix: 'V6', butuhPeserta: true });
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].alasan, 'BUKAN_PESERTA');
  });

  test('potong sebagian saat budget kurang (keputusan #1)', async () => {
    const { idPromo, kodePromo } = await buatPromo({ suffix: 'V7', nilai: 600, budget: 15000 });
    await query(`UPDATE t_promo SET budget_terpakai = 10000 WHERE id_promo=$1`, [idPromo]);

    const r = await query(
      `SELECT valid, potongan_rupiah, potongan_dibatasi, sisa_budget
         FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].valid, true, 'transaksi tetap sah');
    assert.equal(Number(r[0].potongan_rupiah), 5000, 'dipotong sampai sisa budget');
    assert.equal(r[0].potongan_dibatasi, true);
  });

  test('budget habis total', async () => {
    const { idPromo, kodePromo } = await buatPromo({ suffix: 'V8', budget: 10000 });
    await query(`UPDATE t_promo SET budget_terpakai = budget_rupiah WHERE id_promo=$1`, [idPromo]);
    const r = await query(
      `SELECT valid, alasan FROM fn_promo_validasi(8, $1, 'EZ81920', 1, 20, CURRENT_DATE)`,
      [kodePromo]
    );
    assert.equal(r[0].alasan, 'BUDGET_HABIS');
  });
});

describe('fn_promo_pakai — idempotensi', () => {
  test('klaim dua kali pada no_trans sama tidak menggandakan budget', async () => {
    const { idPromo, kodePromo } = await buatPromo({ suffix: 'P1', budget: 500000 });

    const k1 = await query(
      `SELECT fn_promo_pakai($1, NULL, 8, 'TEST_TRX_P1', 20, 2466, 12000, 600, 1866) AS ok`,
      [idPromo]
    );
    assert.equal(k1[0].ok, true);

    const k2 = await query(
      `SELECT fn_promo_pakai($1, NULL, 8, 'TEST_TRX_P1', 20, 2466, 12000, 600, 1866) AS ok`,
      [idPromo]
    );
    assert.equal(k2[0].ok, true, 'retry harus sukses, bukan error');

    const b = await query(`SELECT budget_terpakai FROM t_promo WHERE id_promo=$1`, [idPromo]);
    assert.equal(Number(b[0].budget_terpakai), 12000, 'budget tidak boleh dobel');

    const n = await query(
      `SELECT count(*)::int AS n FROM t_promo_pemakaian WHERE no_trans='TEST_TRX_P1'`
    );
    assert.equal(n[0].n, 1, 'ledger tetap satu baris');
  });

  test('klaim gagal saat budget tidak cukup, ledger dibatalkan', async () => {
    const { idPromo } = await buatPromo({ suffix: 'P2', budget: 5000 });
    const r = await query(
      `SELECT fn_promo_pakai($1, NULL, 8, 'TEST_TRX_P2', 20, 2466, 12000, 600, 1866) AS ok`,
      [idPromo]
    );
    assert.equal(r[0].ok, false);

    const n = await query(
      `SELECT count(*)::int AS n FROM t_promo_pemakaian WHERE no_trans='TEST_TRX_P2'`
    );
    assert.equal(n[0].n, 0, 'baris ledger harus dihapus agar no_trans bisa dipakai klaim gagal');

    const b = await query(`SELECT budget_terpakai FROM t_promo WHERE id_promo=$1`, [idPromo]);
    assert.equal(Number(b[0].budget_terpakai), 0, 'budget tidak berubah');
  });

  test('fn_promo_klaim_gagal mencatat eksposur tanpa mengubah budget', async () => {
    const { idPromo } = await buatPromo({ suffix: 'P3', budget: 5000 });
    const r = await query(
      `SELECT fn_promo_klaim_gagal($1, 8, 'TEST_TRX_P3', 20, 2466, 12000, 600, 1866, 'BUDGET_HABIS') AS ok`,
      [idPromo]
    );
    assert.equal(r[0].ok, true);

    const row = await query(
      `SELECT status, alasan FROM t_promo_pemakaian WHERE no_trans='TEST_TRX_P3'`
    );
    assert.equal(row[0].status, 'gagal_klaim');
    assert.equal(row[0].alasan, 'BUDGET_HABIS');

    const b = await query(`SELECT budget_terpakai FROM t_promo WHERE id_promo=$1`, [idPromo]);
    assert.equal(Number(b[0].budget_terpakai), 0);

    const eks = await query(
      `SELECT count(*)::int AS n FROM v_promo_eksposur WHERE no_trans='TEST_TRX_P3'`
    );
    assert.equal(eks[0].n, 1, 'harus muncul di view eksposur');
  });
});

describe('fn_promo_batal', () => {
  test('membalik klaim aktif', async () => {
    const { idPromo } = await buatPromo({ suffix: 'B1', budget: 500000 });
    await query(
      `SELECT fn_promo_pakai($1, NULL, 8, 'TEST_TRX_B1', 20, 2466, 12000, 600, 1866)`,
      [idPromo]
    );
    const r = await query(`SELECT fn_promo_batal('TEST_TRX_B1') AS ok`);
    assert.equal(r[0].ok, true);

    const b = await query(`SELECT budget_terpakai FROM t_promo WHERE id_promo=$1`, [idPromo]);
    assert.equal(Number(b[0].budget_terpakai), 0, 'budget kembali');
  });

  test('tidak menyentuh baris gagal_klaim', async () => {
    const { idPromo } = await buatPromo({ suffix: 'B2', budget: 5000 });
    await query(
      `SELECT fn_promo_klaim_gagal($1, 8, 'TEST_TRX_B2', 20, 2466, 12000, 600, 1866, 'BUDGET_HABIS')`,
      [idPromo]
    );
    const r = await query(`SELECT fn_promo_batal('TEST_TRX_B2') AS ok`);
    assert.equal(r[0].ok, false, 'tidak ada budget yang pernah dipotong');

    const row = await query(`SELECT status FROM t_promo_pemakaian WHERE no_trans='TEST_TRX_B2'`);
    assert.equal(row[0].status, 'gagal_klaim', 'status tidak berubah');
  });

  test('idempoten: batal dua kali', async () => {
    const { idPromo } = await buatPromo({ suffix: 'B3', budget: 500000 });
    await query(
      `SELECT fn_promo_pakai($1, NULL, 8, 'TEST_TRX_B3', 20, 2466, 12000, 600, 1866)`,
      [idPromo]
    );
    const a = await query(`SELECT fn_promo_batal('TEST_TRX_B3') AS ok`);
    const b = await query(`SELECT fn_promo_batal('TEST_TRX_B3') AS ok`);
    assert.equal(a[0].ok, true);
    assert.equal(b[0].ok, false);

    const bud = await query(`SELECT budget_terpakai FROM t_promo WHERE id_promo=$1`, [idPromo]);
    assert.equal(Number(bud[0].budget_terpakai), 0);
  });
});

describe('fn_promo_tutup_periode', () => {
  test('kebijakan hangus: sisa tidak dipindah', async () => {
    const { idPromo } = await buatPromo({
      suffix: 'H1', budget: 100000, mulai: '2026-01-01', selesai: '2026-01-31',
      kebijakan: 'hangus',
    });
    await query(`UPDATE t_promo SET budget_terpakai = 30000 WHERE id_promo=$1`, [idPromo]);

    const r = await query(
      `SELECT status, jumlah FROM fn_promo_tutup_periode($1, DATE '2026-02-01')`, [idPromo]
    );
    assert.equal(r[0].status, 'HANGUS');
    assert.equal(Number(r[0].jumlah), 70000);
  });

  test('kebijakan rollover: sisa pindah ke lanjutan', async () => {
    const asal = await buatPromo({
      suffix: 'R1', budget: 100000, mulai: '2026-01-01', selesai: '2026-01-31',
      kebijakan: 'rollover',
    });
    const tujuan = await buatPromo({
      suffix: 'R2', budget: 50000, mulai: '2026-02-01', selesai: '2026-12-31',
      kebijakan: 'rollover',
    });
    await query(`UPDATE t_promo SET budget_terpakai = 20000 WHERE id_promo=$1`, [asal.idPromo]);
    await query(`UPDATE t_promo SET id_promo_lanjutan=$1 WHERE id_promo=$2`, [tujuan.idPromo, asal.idPromo]);

    const r = await query(
      `SELECT status, id_promo_tujuan, jumlah FROM fn_promo_tutup_periode($1, DATE '2026-02-01')`,
      [asal.idPromo]
    );
    assert.equal(r[0].status, 'ROLLOVER');
    assert.equal(Number(r[0].id_promo_tujuan), Number(tujuan.idPromo));
    assert.equal(Number(r[0].jumlah), 80000);

    const t = await query(`SELECT budget_rupiah FROM t_promo WHERE id_promo=$1`, [tujuan.idPromo]);
    assert.equal(Number(t[0].budget_rupiah), 130000, '50000 + 80000');

    const a = await query(
      `SELECT budget_rupiah, budget_terpakai, aktif FROM t_promo WHERE id_promo=$1`, [asal.idPromo]
    );
    assert.equal(Number(a[0].budget_terpakai), Number(a[0].budget_rupiah), 'sisa asal jadi 0');
    assert.equal(a[0].aktif, false);

    const audit = await query(
      `SELECT count(*)::int AS n FROM t_promo_rollover WHERE id_promo_asal=$1`, [asal.idPromo]
    );
    assert.equal(audit[0].n, 1, 'audit rollover tercatat');
  });

  test('rollover tanpa lanjutan ditolak', async () => {
    const { idPromo } = await buatPromo({
      suffix: 'R3', budget: 100000, mulai: '2026-01-01', selesai: '2026-01-31',
      kebijakan: 'rollover',
    });
    const r = await query(
      `SELECT status FROM fn_promo_tutup_periode($1, DATE '2026-02-01')`, [idPromo]
    );
    assert.equal(r[0].status, 'LANJUTAN_BELUM_DITETAPKAN');
  });

  test('periode belum berakhir', async () => {
    const { idPromo } = await buatPromo({
      suffix: 'R4', mulai: '2026-01-01', selesai: '2027-12-31',
    });
    const r = await query(
      `SELECT status FROM fn_promo_tutup_periode($1, CURRENT_DATE)`, [idPromo]
    );
    assert.equal(r[0].status, 'BELUM_BERAKHIR');
  });

  test('tutup dua kali tidak menggandakan', async () => {
    const asal = await buatPromo({
      suffix: 'R5', budget: 100000, mulai: '2026-01-01', selesai: '2026-01-31',
      kebijakan: 'rollover',
    });
    const tujuan = await buatPromo({
      suffix: 'R6', budget: 50000, mulai: '2026-02-01', selesai: '2026-12-31',
      kebijakan: 'rollover',
    });
    await query(`UPDATE t_promo SET id_promo_lanjutan=$1 WHERE id_promo=$2`, [tujuan.idPromo, asal.idPromo]);

    await query(`SELECT fn_promo_tutup_periode($1, DATE '2026-02-01')`, [asal.idPromo]);
    const r2 = await query(
      `SELECT status FROM fn_promo_tutup_periode($1, DATE '2026-02-02')`, [asal.idPromo]
    );
    assert.notEqual(r2[0].status, 'ROLLOVER', 'tidak boleh rollover dua kali');

    const t = await query(`SELECT budget_rupiah FROM t_promo WHERE id_promo=$1`, [tujuan.idPromo]);
    assert.equal(Number(t[0].budget_rupiah), 150000, 'hanya ditambah sekali');
  });
});

describe('fn_promo_iklan_untuk_user', () => {
  test('batas tayang dihitung per pengguna', async () => {
    const { idIklan } = await buatPromo({ suffix: 'I1', maksTayang: 1 });

    const sebelum = await query(
      `SELECT tayang_hari_ini, masih_bisa_tayang FROM fn_promo_iklan_untuk_user(8, CURRENT_DATE)
        WHERE id_iklan = $1`, [idIklan]
    );
    assert.equal(sebelum[0].tayang_hari_ini, 0);
    assert.equal(sebelum[0].masih_bisa_tayang, true);

    await query(
      `INSERT INTO t_promo_iklan_tayang (id_iklan, id_user, tanggal)
       VALUES ($1, 8, CURRENT_DATE)`, [idIklan]
    );

    const sesudah = await query(
      `SELECT tayang_hari_ini, masih_bisa_tayang FROM fn_promo_iklan_untuk_user(8, CURRENT_DATE)
        WHERE id_iklan = $1`, [idIklan]
    );
    assert.equal(sesudah[0].tayang_hari_ini, 1);
    assert.equal(sesudah[0].masih_bisa_tayang, false, 'jatah pengguna 8 habis');

    const lain = await query(
      `SELECT tayang_hari_ini, masih_bisa_tayang FROM fn_promo_iklan_untuk_user(999, CURRENT_DATE)
        WHERE id_iklan = $1`, [idIklan]
    );
    assert.equal(lain[0].tayang_hari_ini, 0, 'pengguna lain punya jatah sendiri');
    assert.equal(lain[0].masih_bisa_tayang, true);
  });
});

describe('constraint skema', () => {
  test('kode promo huruf kecil ditolak', async () => {
    await assert.rejects(
      () => query(
        `INSERT INTO t_promo (kode_promo, id_mitra_promo, nama, tipe_potongan,
                              nilai_potongan, budget_rupiah, tanggal_mulai, tanggal_selesai)
         VALUES ('test_hurufkecil', 1, 'x', 'per_kwh', 100, 1000,
                 CURRENT_DATE, CURRENT_DATE)`
      ),
      /t_promo_kode_format_ck|violates check constraint/
    );
  });

  test('api_key_hash duplikat ditolak', async () => {
    const a = await buatPromo({ suffix: 'K1' });
    const b = await buatPromo({ suffix: 'K2' });
    const hash = 'a'.repeat(64);
    await query(`UPDATE t_promo_mitra SET api_key_hash=$1 WHERE id_mitra_promo=$2`, [hash, a.idMitra]);
    await assert.rejects(
      () => query(`UPDATE t_promo_mitra SET api_key_hash=$1 WHERE id_mitra_promo=$2`, [hash, b.idMitra]),
      /t_promo_mitra_api_key_unique|duplicate key/
    );
  });
});
