'use strict';

/**
 * Sumber tunggal mutasi saldo pengguna (`t_saldo_user`).
 *
 * Keputusan produk 2026-11-03:
 *   - `t_saldo_user` adalah SATU-SATUNYA sumber kebenaran saldo.
 *   - DOKU hanya dipakai untuk top up; pembelian energi & refund sepenuhnya lokal.
 *   - `t_user_mobile.id_wallet` adalah identitas penampung saldo milik kita
 *     (format `WLT-xxxxxx`), bukan sub-account DOKU.
 *
 * ATURAN KERAS untuk semua fungsi di sini:
 *   1. Setiap mutasi WAJIB di dalam transaksi DB.
 *   2. Baris saldo dikunci dengan `SELECT ... FOR UPDATE` sebelum dibaca,
 *      supaya dua request bersamaan tidak lolos cek saldo yang sama.
 *   3. Setiap mutasi WAJIB menulis jejak ke `t_histori_saldo` dalam transaksi
 *      yang sama. Tidak boleh ada uang bergerak tanpa jejak.
 *   4. Operasi wajib idempoten berdasarkan (no_trans, jenis) — unique index
 *      `uq_histori_saldo_jenis_trans` menjadi pengaman terakhir di level DB.
 *
 * PENTING — saldo TIDAK di-update langsung dari sini.
 *
 * `t_histori_saldo` sudah punya trigger `thistorisaldo_ai`:
 *
 *   CREATE TRIGGER thistorisaldo_ai AFTER INSERT ON t_histori_saldo
 *   EXECUTE FUNCTION trg_thistorisaldo_ai();
 *   -- fungsi: UPDATE t_saldo_user SET saldo = saldo + NEW.jumlah WHERE id_user = NEW.id_user;
 *
 * Artinya `jumlah` harus BERTANDA: kredit positif, debit NEGATIF. Trigger yang
 * menulis `t_saldo_user`. Menulis saldo langsung di sini akan bertabrakan dengan
 * trigger dan nilainya kembali ke semula (pernah terjadi: UPDATE 70.000 lalu
 * trigger menambah +30.000 sehingga kembali 100.000).
 */

const db = require('./database.service');
const { query, run, pool } = db;

/** Jenis mutasi yang dikenal. */
const JENIS = Object.freeze({
  DEBIT_BELI: 'debit_beli',
  KREDIT_TOPUP: 'kredit_topup',
  KREDIT_REFUND: 'kredit_refund',
  KOREKSI: 'koreksi',
});

/** Saldo terkini. Mengembalikan 0 bila baris saldo belum ada. */
async function getSaldo(idUser, client = null) {
  const q = client ? (s, p) => client.query(s, p).then((r) => r.rows) : query;
  const rows = await q(
    'SELECT saldo FROM t_saldo_user WHERE id_user = $1 ORDER BY id DESC LIMIT 1',
    [idUser]
  );
  return rows.length ? Number(rows[0].saldo) : 0;
}

/**
 * Pastikan baris saldo ada. Trigger tusermobile_ai membuatnya saat registrasi,
 * tetapi data lama bisa saja belum punya.
 */
async function pastikanBarisSaldo(client, idUser) {
  await client.query(
    `INSERT INTO t_saldo_user (id_user, saldo, updated_at)
     SELECT $1, 0, now()
      WHERE NOT EXISTS (SELECT 1 FROM t_saldo_user WHERE id_user = $1)`,
    [idUser]
  );
}

/** Sudah pernah tercatat mutasi (no_trans, jenis)? Dipakai untuk idempotensi. */
async function sudahTercatat(client, noTrans, jenis) {
  const { rows } = await client.query(
    'SELECT 1 FROM t_histori_saldo WHERE no_trans = $1::bigint AND jenis = $2 LIMIT 1',
    [noTrans, jenis]
  );
  return rows.length > 0;
}

/**
 * Terapkan satu mutasi saldo di dalam transaksi yang sudah berjalan.
 * Mengembalikan { ok, saldo_awal, saldo_akhir, duplikat }.
 *
 * @param {object} client
 * @param {{idUser:number, noTrans:string|number|null, jenis:string, jumlah:number, keterangan?:string, hanyaJikaCukup?:boolean}} o
 */
async function terapkan(client, o) {
  const { idUser, noTrans, jenis, jumlah, keterangan } = o;
  const nilai = Number(jumlah);

  if (!Number.isFinite(nilai) || nilai <= 0) {
    throw new Error(`jumlah mutasi tidak valid: ${jumlah}`);
  }

  await pastikanBarisSaldo(client, idUser);

  // Idempotensi: mutasi dengan (no_trans, jenis) sama tidak diulang.
  if (noTrans != null && (await sudahTercatat(client, noTrans, jenis))) {
    const saldo = await getSaldo(idUser, client);
    return { ok: true, saldo_awal: saldo, saldo_akhir: saldo, duplikat: true };
  }

  // Kunci baris SEBELUM membaca angka. Tanpa ini, dua pembayaran bersamaan
  // membaca saldo yang sama dan keduanya lolos.
  const { rows } = await client.query(
    'SELECT id, saldo FROM t_saldo_user WHERE id_user = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE',
    [idUser]
  );
  const saldoAwal = Number(rows[0].saldo);

  const kredit = jenis !== JENIS.DEBIT_BELI;
  const jumlahBertanda = kredit ? nilai : -nilai;
  const saldoAkhir = saldoAwal + jumlahBertanda;

  if (!kredit && saldoAwal < nilai) {
    return { ok: false, alasan: 'SALDO_KURANG', saldo_awal: saldoAwal, saldo_akhir: saldoAwal };
  }
  if (saldoAkhir < 0) {
    return { ok: false, alasan: 'SALDO_MINUS', saldo_awal: saldoAwal, saldo_akhir: saldoAwal };
  }

  // TIDAK menulis t_saldo_user di sini — trigger thistorisaldo_ai yang
  // melakukannya saat baris histori di-INSERT (saldo = saldo + NEW.jumlah).
  await client.query(
    `INSERT INTO t_histori_saldo
       (id_user, tgl, jumlah, keterangan, jenis, no_trans, saldo_awal, saldo_akhir)
     VALUES ($1, now(), $2, $3, $4, $5::bigint, $6, $7)`,
    [idUser, jumlahBertanda, keterangan || jenis, jenis, noTrans ?? null, saldoAwal, saldoAkhir]
  );

  // Baca ulang agar nilai kembalian akurat (setelah trigger berjalan).
  const { rows: after } = await client.query(
    'SELECT saldo FROM t_saldo_user WHERE id_user = $1 ORDER BY id DESC LIMIT 1',
    [idUser]
  );
  const saldoTercatat = Number(after[0].saldo);

  return { ok: true, saldo_awal: saldoAwal, saldo_akhir: saldoTercatat, duplikat: false };
}

/**
 * Debit saldo untuk pembelian energi, sekaligus menandai transaksi lunas.
 *
 * PENTING: pendebitan TIDAK dilakukan di sini. Sudah ada trigger DB
 * `trg_ttransaction_au` yang mendebit saldo otomatis ketika status berubah
 * `order` -> `ready` dengan `id_carabayar = 2`:
 *
 *   INSERT INTO t_histori_saldo (..., jumlah, ..., jenis)
 *   VALUES (..., -1 * NEW.grand_total, ..., 'transaksi');
 *
 * Menulis debit sendiri di sini akan membuat saldo terdebit DUA KALI
 * (pernah terjadi: satu pembayaran 15.000 mengurangi saldo 30.000).
 *
 * Yang dilakukan di sini hanya: kunci transaksi, kunci saldo, pastikan saldo
 * cukup, lalu picu trigger lewat UPDATE status.
 */
async function debitPembelian({ idUser, noTrans, jumlah }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kunci transaksi lebih dulu agar status tidak berubah di tengah jalan.
    const { rows } = await client.query(
      `SELECT id, status_transaksi, status_bayar, grand_total
         FROM t_transaction WHERE no_trans = $1::bigint AND id_user = $2 FOR UPDATE`,
      [noTrans, idUser]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, alasan: 'TRANSAKSI_TIDAK_DITEMUKAN' };
    }
    if (rows[0].status_transaksi !== 'order' || rows[0].status_bayar !== 'unpaid') {
      await client.query('ROLLBACK');
      return { ok: false, alasan: 'SUDAH_DIBAYAR', status: rows[0].status_transaksi };
    }

    // Tagihan dari server, bukan angka kiriman klien.
    const tagihan = Number(rows[0].grand_total);
    if (jumlah != null && Number(jumlah) !== tagihan) {
      console.warn(`[saldo] jumlah klien ${jumlah} != grand_total ${tagihan}; memakai grand_total`);
    }

    await pastikanBarisSaldo(client, idUser);

    // Kunci baris saldo SEBELUM dibaca: dua pembayaran bersamaan tidak boleh
    // sama-sama lolos cek saldo.
    const s = await client.query(
      'SELECT id, saldo FROM t_saldo_user WHERE id_user = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE',
      [idUser]
    );
    const saldoAwal = Number(s.rows[0].saldo);

    if (saldoAwal < tagihan) {
      await client.query('ROLLBACK');
      return { ok: false, alasan: 'SALDO_KURANG', saldo_awal: saldoAwal, tagihan };
    }

    // id_carabayar=2 dipaksa agar trigger pendebitan pasti berjalan.
    await client.query(
      `UPDATE t_transaction
          SET status_transaksi = 'ready', status_bayar = 'paid',
              id_carabayar = 2, tgl_bayar = now(), update_at = now()
        WHERE no_trans = $1::bigint AND id_user = $2 AND status_transaksi = 'order'`,
      [noTrans, idUser]
    );

    // Reservasi ikut menjadi 'ready' bila ada.
    await client.query(
      `UPDATE t_reservasi SET status = 'ready' WHERE transaction_id = $1::bigint`,
      [noTrans]
    );

    const after = await client.query(
      'SELECT saldo FROM t_saldo_user WHERE id_user = $1 ORDER BY id DESC LIMIT 1',
      [idUser]
    );
    const saldoAkhir = Number(after.rows[0].saldo);

    await client.query('COMMIT');
    return { ok: true, saldo_awal: saldoAwal, saldo_akhir: saldoAkhir, duplikat: false };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Kredit saldo (top up atau refund). Idempoten per (no_trans, jenis). */
async function kredit({ idUser, noTrans, jenis, jumlah, keterangan }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hasil = await terapkan(client, { idUser, noTrans, jenis, jumlah, keterangan });
    if (!hasil.ok) {
      await client.query('ROLLBACK');
      return hasil;
    }
    await client.query('COMMIT');
    return hasil;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  JENIS,
  getSaldo,
  terapkan,
  debitPembelian,
  kredit,
};
