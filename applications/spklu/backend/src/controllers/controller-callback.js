const db = require('../services/database.service');
const { pool, poolpostgre, query } = db;
const lib = require("../configs/lib");
const bmsdoku = require("../configs/bmsdoku");
const promoService = require('../services/promo.service');
const saldoService = require('../services/saldo.service');

/**
 * Normalisasi notifikasi pembayaran Xendit menjadi { externalId, amount, status, event }.
 *
 * Xendit mengirim beberapa bentuk payload bergantung produk:
 *   - VA  : event "callback_virtual_accounts" / "paid", data.external_id
 *   - QRIS: event "qr.payment", data.qr_code.external_id + data.payment.status
 * Ekstraksi dibuat defensif (root vs .data) supaya tidak menolak bentuk yang sah.
 */
function ekstrakXendit(body) {
  const root = body || {};
  const data = root.data || {};
  // QRIS Xendit menaruh objek QR di root (root.qr_code), BUKAN data.qr_code.
  const qr = root.qr_code || data.qr_code || {};
  const pay = data.payment || root.payment || {};

  const externalId = root.external_id
    || data.external_id
    || qr.external_id
    || data.reference_id
    || root.reference_id
    || null;

  let amount = root.amount ?? data.amount ?? pay.amount ?? qr.amount ?? null;

  let status = (root.status || data.status || pay.status || qr.status || '').toString().toUpperCase();
  const event = (root.event || '').toString().toLowerCase();

  return { externalId, amount, status, event };
}

/** Status yang menandakan pembayaran BENAR-BENAR diterima. */
const STATUS_SUKSES = new Set(['PAID', 'COMPLETED', 'SUCCEEDED', 'SUCCESS']);

function xenditSukses({ status, event }) {
  // event "paid" (VA legacy) = pembayaran diterima, apa pun kolom status-nya.
  if (event === 'paid') return true;
  return STATUS_SUKSES.has(status);
}

/**
 * Mutasi pembayaran yang diterima (sama untuk DOKU & Xendit).
 * invoiceNumber berformat `no_trans-id_user-jenis_trans[-idwallet]`.
 * Idempoten: update status DB aman diulang; kredit saldo sudah idempoten
 * per (no_trans, jenis) di saldo.service.js.
 */
async function prosesPembayaran(invoiceNumber, amount) {
  if (!invoiceNumber) throw new Error('invoice_number tidak ada di payload');

  const arr = String(invoiceNumber).split("-");
  const no_trans = arr[0];
  const id_user = arr[1];
  const jenis_trans = arr[2];

  if (jenis_trans === "trans") {
    const sql = `update t_transaction set status_transaksi='ready',status_bayar='paid',tgl_bayar=$1 where no_trans=$2;`;
    await pool.query(sql, [new Date(), no_trans]).catch((e) => console.error(e));

    // Klaim budget promo SETELAH pembayaran terkonfirmasi (keputusan
    // TODO-PROMO.md §0.B). Aman di-retry: klaimPromo idempoten.
    // Tidak boleh menggagalkan callback — uang sudah diterima.
    try {
      const hasilPromo = await promoService.klaimPromo(no_trans);
      if (hasilPromo.status !== 'tidak_ada_promo') {
        console.log(`[callback] promo no_trans=${no_trans} -> ${hasilPromo.status}${hasilPromo.alasan ? '/' + hasilPromo.alasan : ''}`);
      }
    } catch (e) {
      console.error('[callback.promo]', e.message);
    }

    var isiberita = `Pembayaran transaksi ${no_trans} berhasil!`;
    var jenisberita = "pembayaran";
    var judulberita = "Pembayaran Sukses";
  } else if (jenis_trans === "topup") {
    const jumlahtopup = amount;
    const sql = `update t_topup set status_topup='finish',status_bayar='paid',tgl_bayar=$1 where no_trans=$2;`;
    await pool.query(sql, [new Date(), no_trans]).catch((e) => console.error(e));

    var isiberita = `Pembayaran topup ${no_trans} berhasil!`;
    var jenisberita = "topup";
    var judulberita = "Pembayaran Topup Sukses";

    // Top up dikreditkan ke SALDO LOKAL (t_saldo_user), bukan ke wallet
    // gateway. Gateway hanya kanal bayar; saldo pembelian energi ada di DB.
    // Idempoten per (no_trans, kredit_topup) sehingga callback yang dikirim
    // ulang tidak menggandakan saldo.
    try {
      const hasilKredit = await saldoService.kredit({
        idUser: Number(id_user),
        noTrans: no_trans,
        jenis: saldoService.JENIS.KREDIT_TOPUP,
        jumlah: Number(jumlahtopup),
        keterangan: `top up ${no_trans}`,
      });
      console.log(`[callback] topup no_trans=${no_trans} ->`, JSON.stringify(hasilKredit));
    } catch (e) {
      console.error('[callback.kredit]', e.message);
    }
  } else {
    throw new Error(`jenis_trans tidak dikenal: ${jenis_trans}`);
  }

  const sqlpostgre = `INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5);`;
  await poolpostgre.query(sqlpostgre, [id_user, no_trans, jenisberita, judulberita, isiberita]).catch((e) => console.error(e));

  const sql = `select token from t_user_mobile where id_user=$1;`;
  const results = await query(sql, [id_user]);
  const token = results[0]?.token;
  try {
    if (token) lib.kirimnotif(token, no_trans, 'Pembayaran Sukses', isiberita, "pembayaran");
  } catch (e) {
    console.error('[callback.kirimnotif]', e.message);
  }
}

module.exports = {
  // Callback pembayaran VA / e-wallet (DOKU legacy)
  async va(req, res) {
    const invoiceNumber = req.body?.order?.invoice_number;
    const amount = req.body?.order?.amount;
    console.log(req.body);

    try {
      await prosesPembayaran(invoiceNumber, amount);
      res.send({ success: true, message: "Berhasil" });
    } catch (error) {
      console.error('[callback.va]', error.message);
      res.send({ success: false, message: "Terjadi kesalahan", data: null });
    }
  },

  // Callback pembayaran Xendit (VA / QRIS). Publik, diverifikasi lewat header
  // x-callback-token. Selalu 200 untuk callback yang tokennya valid supaya
  // Xendit tidak mengirim ulang — tapi kredit saldo HANYA untuk status sukses.
  async xendit(req, res) {
    const token = req.headers['x-callback-token'] || '';
    if (token !== process.env.XENDIT_CALLBACK_TOKEN) {
      return res.status(401).send({ success: false, message: 'Token callback tidak valid' });
    }

    console.log('[callback.xendit] body =', JSON.stringify(req.body || {}));

    try {
      const { externalId, amount, status, event } = ekstrakXendit(req.body);

      if (!xenditSukses({ status, event })) {
        // Bukan notifikasi pembayaran sukses (mis. VA dibuat / kedaluwarsa).
        // Balas 200 supaya Xendit berhenti retry, tanpa mengubah data apa pun.
        console.log(`[callback.xendit] diabaikan: event=${event} status=${status} external=${externalId}`);
        return res.send({ success: true, message: 'Diterima (bukan pembayaran sukses)' });
      }

      await prosesPembayaran(externalId, amount);
      return res.send({ success: true, message: 'Berhasil' });
    } catch (error) {
      console.error('[callback.xendit]', error.message);
      return res.send({ success: false, message: 'Terjadi kesalahan', data: null });
    }
  },
};
