const db = require('../services/database.service');
const { query, run } = db;
const saldoService = require('../services/saldo.service');

async function runJob() {
  try {
    const sql = `SELECT now() AS now1, now() - interval '5 minutes' AS now2, t.tgl_trans, t.tgl_bayar, t.status_transaksi,
              u.id_wallet, t.no_trans, t.chargebox_id, t.grand_total, t.id_user, u.nama
      FROM t_transaction t
      LEFT JOIN t_user_mobile u ON u.id_user = t.id_user
      WHERE t.status_transaksi = 'ready'
      AND t.ttl_refund = 0
      AND t.tgl_bayar <= now() - interval '10 minutes'`;

    const results = await query(sql);

    for (const row of results) {
      console.log(`Processing transaction: ${row.no_trans}`);

      const data = {
        id_wallet: row.id_wallet,
        jml_refund: row.grand_total,
        no_trans_doku: Date.parse(new Date().toISOString()),
        id_user: row.id_user,
        nama: row.nama,
      };

      console.log(data);

      // Refund dikreditkan ke SALDO LOKAL, bukan wallet DOKU (keputusan
      // 2026-11-03). Sebelumnya hasil `bmsdoku.topup` ditimpa dengan
      // `{ status: '0000' }` sehingga refund SELALU dianggap berhasil walau
      // gateway gagal. Sekarang hasil nyata yang dipakai.
      let hasilRefund;
      try {
        hasilRefund = await saldoService.kredit({
          idUser: row.id_user,
          noTrans: row.no_trans,
          jenis: saldoService.JENIS.KREDIT_REFUND,
          jumlah: Number(row.grand_total),
          keterangan: `refund otomatis ${row.no_trans}`,
        });
      } catch (e) {
        hasilRefund = { ok: false, alasan: e.message };
      }

      console.log(`[refundUnused] no_trans=${row.no_trans} ->`, JSON.stringify(hasilRefund));

      if (hasilRefund.ok) {
        console.log('Refund berhasil');
        await run(
          `INSERT INTO t_refund( id_user,no_trans,jml_transaksi,jumlah,status,tgl_buat,tgl_done) values($1,$2,$3,$4,$5,$6,$7)`,
          [row.id_user, row.no_trans, row.grand_total, row.grand_total, 'done', new Date(), new Date()]
        );
        await run(`UPDATE t_transaction SET status_transaksi='expired', ttl_refund=$1 WHERE no_trans = $2`, [row.grand_total, row.no_trans]);

        const isiberita = `Refund Rp.${row.grand_total.toLocaleString()} transaksi ${row.no_trans} telah berhasil!`;
        await run(`INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5)`, [row.id_user, row.no_trans, 'refundsukses', 'Refund sukses', isiberita]);
      } else {
        console.log('Refund pending');
        await run(`INSERT INTO t_refund( id_user,no_trans,jumlah,status,tgl_buat) values($1,$2,$3,$4,$5)`, [row.id_user, row.no_trans, row.grand_total, 'pending', new Date()]);

        const isiberita = `Refund ${row.grand_total.toLocaleString()} transaksi ${row.no_trans}, diproses max 3x24 jam!`;
        await run(`INSERT INTO berita( id_user,no_trans,jenis_berita,judul,isi) values($1,$2,$3,$4,$5)`, [row.id_user, row.no_trans, 'refundpending', 'Refund pending', isiberita]);
      }
      break; // legacy behavior: only first row per run
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = { run: runJob };
