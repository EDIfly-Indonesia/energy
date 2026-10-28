import { useEffect, useState } from 'react';
import { get } from '../api';
import DataTable from '../components/DataTable';

/**
 * Eksposur promo — transaksi yang SUDAH dibayar dengan diskon promo, tetapi
 * klaim budget gagal karena budget habis di antara order dan pembayaran.
 *
 * Selisih ini ditanggung EZ Charge. Halaman ini ada supaya angkanya terlihat,
 * bukan tersembunyi. Endpoint: GET /admin/promo/eksposur (API-PROMO.md §7.5).
 */
interface Eksposur {
  id: number;
  no_trans: string;
  id_promo: number;
  kode_promo: string;
  nama_promo: string;
  nama_mitra: string;
  id_user: number;
  kwh: number;
  potongan_rupiah: number;
  alasan: string;
  created_at: string;
}

interface Ringkasan {
  jumlah_transaksi: number;
  total_rupiah: number;
}

function rp(v: number | string | null): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));
}

function waktu(v: string): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

export default function PromoEksposurPage() {
  const [rows, setRows] = useState<Eksposur[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan>({ jumlah_transaksi: 0, total_rupiah: 0 });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get<{ data: Eksposur[]; ringkasan: Ringkasan }>('/admin/promo/eksposur').then((r) => {
      if (r.success) {
        setRows(r.data.data);
        setRingkasan(r.data.ringkasan);
      } else {
        setMsg(r.message);
      }
    });
  }, []);

  return (
    <div>
      <h1>Eksposur Promo</h1>

      <p className="mb-4 text-sm text-slate-400">
        Transaksi yang sudah <strong>dibayar</strong> dengan diskon promo, tetapi budget
        mitra tidak cukup saat klaim (habis dipakai transaksi lain di antara order dan
        pembayaran). Nominal yang sudah dibayar tidak berubah — selisihnya ditanggung
        EZ Charge. Angka di bawah adalah biaya nyata dari kebijakan klaim-saat-bayar.
      </p>

      <div className="grid-2">
        <div className="stat">
          <span>Jumlah transaksi</span>
          <strong>{ringkasan.jumlah_transaksi}</strong>
        </div>
        <div className="stat">
          <span>Total ditanggung EZ Charge</span>
          <strong>{rp(ringkasan.total_rupiah)}</strong>
        </div>
      </div>

      <DataTable
        data={rows}
        rowKey={(e) => e.id}
        searchPlaceholder="Cari no. transaksi / kode promo…"
        columns={[
          { header: 'No. Transaksi', value: (e) => e.no_trans, render: (e) => <code>{e.no_trans}</code> },
          { header: 'Kode Promo', value: (e) => e.kode_promo, render: (e) => e.kode_promo },
          {
            header: 'Mitra',
            value: (e) => e.nama_mitra,
            render: (e) => (
              <span>
                {e.nama_mitra}
                <br />
                <span className="text-xs text-slate-400">{e.nama_promo}</span>
              </span>
            ),
          },
          { header: 'Pengguna', value: (e) => e.id_user, render: (e) => `#${e.id_user}` },
          { header: 'kWh', value: (e) => e.kwh, render: (e) => Number(e.kwh).toFixed(2) },
          {
            header: 'Potongan',
            value: (e) => e.potongan_rupiah,
            render: (e) => <span className="text-amber-400">{rp(e.potongan_rupiah)}</span>,
          },
          {
            header: 'Alasan',
            value: (e) => e.alasan,
            render: (e) => <span className="text-xs">{e.alasan}</span>,
          },
          { header: 'Waktu', value: (e) => e.created_at, render: (e) => waktu(e.created_at) },
        ]}
      />

      {rows.length === 0 && !msg && (
        <p className="text-slate-400">Tidak ada eksposur. Semua klaim promo berhasil.</p>
      )}
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
