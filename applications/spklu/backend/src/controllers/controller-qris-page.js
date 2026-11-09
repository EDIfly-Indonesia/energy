'use strict';

/**
 * Halaman QR pembayaran (publik) untuk QRIS Xendit.
 *
 * Aplikasi mobile membuka `data.payment.url` di WebView (tidak merender QR dari
 * string). Xendit hanya mengembalikan `qr_string` (kode EMV QRIS), bukan URL.
 * Endpoint ini merender `qr_string` menjadi QR (SVG, tanpa dependensi eksternal)
 * plus menampilkan nominal, supaya WebView menampilkan QR yang bisa di-scan.
 *
 * Data QR diambil dari `t_topup.pembayaran` (kolom jsonb) — sama seperti cara
 * DOKU menyimpan respons createva. JADI TIDAK ADA secret dalam URL: hanya no_trans.
 */

const QRCode = require('qrcode');
const db = require('../services/database.service');
const { query } = db;

/** Escape HTML sederhana untuk teks yang disisipkan ke template. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function qrisPage(req, res) {
  const no_trans = String(req.params?.no_trans ?? req.query?.no_trans ?? '').trim();
  if (!no_trans) {
    return res.status(400).send({ success: false, message: 'no_trans wajib diisi', data: null });
  }

  try {
    const rows = await query(
      `SELECT jumlah, status_bayar, status_topup, pembayaran
         FROM t_topup WHERE no_trans = $1 ORDER BY id_topup DESC LIMIT 1`,
      [no_trans]
    );
    if (!rows.length) {
      return res.status(404).send({ success: false, message: 'Topup tidak ditemukan', data: null });
    }

    const row = rows[0];
    const pembayaran = row.pembayaran || {};
    const qrString = pembayaran.qr_string || pembayaran.qr_code || '';

    const jumlah = Number(row.jumlah) || 0;
    const status = row.status_bayar || row.status_topup || '';

    if (!qrString) {
      return res.status(404).send({ success: false, message: 'QRIS belum tersedia untuk transaksi ini', data: null });
    }

    // Render QR sebagai SVG data-URI (QRCode.toDataURL juga valid; SVG lebih tajam).
    const svg = await QRCode.toString(qrString, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });
    const qrDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

    const rupiah = 'Rp ' + new Intl.NumberFormat('id-ID').format(jumlah);

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Bayar QRIS</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         background: #f4f6f8; color: #1f2937; min-height: 100vh; display: flex;
         align-items: center; justify-content: center; padding: 24px; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.08);
          width: 100%; max-width: 360px; padding: 28px 24px; text-align: center; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
  .sub { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
  .amount { font-size: 28px; font-weight: 800; color: #0f766e; margin-bottom: 18px; }
  .qr { display: flex; justify-content: center; }
  .qr img { width: 280px; height: 280px; }
  .hint { margin-top: 18px; font-size: 13px; color: #6b7280; line-height: 1.5; }
  .no-trans { margin-top: 12px; font-size: 11px; color: #9ca3af; }
  .paid { color: #16a34a; font-weight: 700; }
  .expired { color: #dc2626; font-weight: 700; }
</style>
</head>
<body>
  <div class="card">
    <h1>Bayar dengan QRIS</h1>
    <div class="sub">Scan kode QR di bawah menggunakan aplikasi pembayaran Anda</div>
    <div class="amount">${rupiah}</div>
    <div class="qr"><img src="${qrDataUri}" alt="QRIS"></div>
    <div class="hint">
      Buka aplikasi e-wallet atau mobile banking yang mendukung QRIS,
      pindai kode QR, lalu selesaikan pembayaran sesuai nominal.
    </div>
    <div class="no-trans">${esc(no_trans)}</div>
    ${status === 'paid' ? '<div class="paid">✓ Sudah dibayar</div>' : ''}
    ${status === 'expired' ? '<div class="expired">Kedaluwarsa</div>' : ''}
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[qrisPage]', err);
    return res.status(500).send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

module.exports = { qrisPage };
