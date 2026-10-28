/**
 * Service klaim & pelepasan budget promo.
 *
 * KEPUTUSAN BISNIS (TODO-PROMO.md §0.B):
 *   - Budget diklaim saat PEMBAYARAN TERKONFIRMASI, bukan saat order dibuat.
 *   - simpanorder hanya memvalidasi + menyimpan snapshot.
 *   - Refund sebagian TIDAK mengembalikan budget.
 *   - Refund/pembatalan PENUH mengembalikan budget (fn_promo_batal).
 *
 * KENAPA DIPUSATKAN DI SINI
 * Klaim dipanggil dari beberapa jalur (callback VA, paywithsaldo, dan nanti
 * endpoint lain). Semua harus berperilaku sama: idempoten, tidak pernah
 * melempar error ke pemanggil, dan selalu mencatat kegagalan sebagai eksposur.
 *
 * ATURAN PENTING: fungsi-fungsi di sini TIDAK PERNAH melempar exception.
 * Jalur pembayaran sudah menerima uang; kegagalan klaim promo tidak boleh
 * membuat transaksi gagal atau callback balas error (gateway akan retry terus).
 * Semua kegagalan dicatat ke log + tabel eksposur.
 */

const db = require('./database.service');
const { query, run } = db;

/**
 * Klaim budget promo untuk satu transaksi.
 *
 * Idempoten: aman dipanggil berulang untuk no_trans yang sama (gateway retry).
 *
 * @param {string} noTrans nomor transaksi (t_promo_pemakaian.no_trans)
 * @returns {Promise<{status: 'terklaim'|'sudah_terklaim'|'tidak_ada_promo'|'gagal_klaim', alasan?: string}>}
 */
async function klaimPromo(noTrans) {
  if (!noTrans) return { status: 'tidak_ada_promo' };

  let trx;
  try {
    // Ambil snapshot promo dari transaksi. Semua nilai yang dibutuhkan untuk
    // klaim sudah tersimpan di sini (ditulis simpanorder), jadi klaim tidak
    // bergantung pada kondisi promo saat ini.
    const rows = await query(
      `SELECT id_promo, kode_promo, id_peserta_promo, id_user,
              potongan_rupiah, potongan_perkwh, harga_normal_satuan,
              jml_kwh_order, status_bayar, status_transaksi
         FROM t_transaction
        WHERE no_trans = $1`,
      [noTrans]
    );
    trx = rows[0];
  } catch (e) {
    console.error('[promo.klaimPromo.read]', e.message);
    return { status: 'gagal_klaim', alasan: 'GAGAL_BACA_TRANSAKSI' };
  }

  if (!trx) return { status: 'tidak_ada_promo' };

  // Tanpa id_promo berarti transaksi memang tidak memakai promo.
  if (trx.id_promo == null) return { status: 'tidak_ada_promo' };

  // Hanya klaim untuk transaksi yang benar-benar sudah dibayar.
  if (trx.status_bayar !== 'paid') {
    return { status: 'tidak_ada_promo', alasan: 'BELUM_DIBAYAR' };
  }

  const potongan = Number(trx.potongan_rupiah ?? 0);
  if (!(potongan > 0)) return { status: 'tidak_ada_promo' };

  // kWh: kolom menyimpan Wh, fungsi promo memakai kWh.
  const kwh = Number(trx.jml_kwh_order ?? 0) / 1000;

  // Cek ledger SEBELUM klaim, untuk membedakan klaim baru vs retry.
  // (Setelah fn_promo_pakai, jumlah baris selalu 1 karena ON CONFLICT.)
  let sudahAdaLedger = false;
  try {
    const ada = await query(
      `SELECT 1 FROM t_promo_pemakaian WHERE no_trans = $1 LIMIT 1`,
      [noTrans]
    );
    sudahAdaLedger = ada.length > 0;
  } catch (e) {
    console.error('[promo.klaimPromo.cekLedger]', e.message);
  }

  try {
    const rows = await query(
      `SELECT fn_promo_pakai($1, $2, $3, $4, $5, $6, $7, $8, $9) AS ok`,
      [
        trx.id_promo,
        trx.id_peserta_promo,
        trx.id_user,
        noTrans,
        kwh,
        Number(trx.harga_normal_satuan ?? 0),
        potongan,
        Number(trx.potongan_perkwh ?? 0),
        // harga efektif per kWh, untuk ledger
        Number(trx.harga_normal_satuan ?? 0) - Number(trx.potongan_perkwh ?? 0),
      ]
    );

    const ok = rows[0] && rows[0].ok === true;

    if (ok) {
      return { status: sudahAdaLedger ? 'sudah_terklaim' : 'terklaim' };
    }

    // Budget tidak cukup: catat sebagai eksposur (EZ Charge menanggung
    // selisih), transaksi TETAP sah. Lihat TODO-PROMO.md §0.A lapis 3.
    await query(
      `SELECT fn_promo_klaim_gagal($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        trx.id_promo,
        trx.id_user,
        noTrans,
        kwh,
        Number(trx.harga_normal_satuan ?? 0),
        potongan,
        Number(trx.potongan_perkwh ?? 0),
        Number(trx.harga_normal_satuan ?? 0) - Number(trx.potongan_perkwh ?? 0),
        'BUDGET_HABIS',
      ]
    ).catch((e) => console.error('[promo.klaimPromo.klaimGagal]', e.message));

    console.warn(
      `[promo] klaim gagal no_trans=${noTrans} promo=${trx.kode_promo} potongan=${potongan} -> eksposur EZ Charge`
    );
    return { status: 'gagal_klaim', alasan: 'BUDGET_HABIS' };
  } catch (e) {
    console.error('[promo.klaimPromo.pakai]', e.message);
    return { status: 'gagal_klaim', alasan: 'ERROR_DB' };
  }
}

/**
 * Lepas klaim promo untuk pembatalan SELURUH sesi.
 *
 * Dipakai saat: pembayaran gagal setelah klaim, refund penuh, pembatalan admin.
 * TIDAK dipakai untuk refund sebagian (keputusan §2.2: budget tidak kembali).
 *
 * Idempoten: memanggil ulang tidak berefek karena fn_promo_batal hanya
 * menyentuh baris berstatus 'aktif'.
 *
 * @param {string} noTrans
 * @returns {Promise<{status: 'dilepas'|'tidak_ada_klaim'|'gagal'}>}
 */
async function lepasPromo(noTrans) {
  if (!noTrans) return { status: 'tidak_ada_klaim' };

  try {
    const rows = await query(`SELECT fn_promo_batal($1) AS ok`, [noTrans]);
    const ok = rows[0] && rows[0].ok === true;
    return { status: ok ? 'dilepas' : 'tidak_ada_klaim' };
  } catch (e) {
    console.error('[promo.lepasPromo]', e.message);
    return { status: 'gagal' };
  }
}

/**
 * Cek apakah transaksi memakai promo. Dipakai untuk memutuskan apakah
 * pembatalan perlu melepas klaim.
 *
 * @param {string} noTrans
 * @returns {Promise<boolean>}
 */
async function punyaPromo(noTrans) {
  if (!noTrans) return false;
  try {
    const rows = await query(
      `SELECT 1 FROM t_transaction
        WHERE no_trans = $1 AND id_promo IS NOT NULL AND potongan_rupiah > 0
        LIMIT 1`,
      [noTrans]
    );
    return rows.length > 0;
  } catch (e) {
    console.error('[promo.punyaPromo]', e.message);
    return false;
  }
}

module.exports = { klaimPromo, lepasPromo, punyaPromo };
