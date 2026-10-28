import { useEffect, useState } from 'react';
import { get } from '../api';
import { RefreshCw } from 'lucide-react';
import DataTable from '../components/DataTable';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
const rp = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('id-ID');

interface Summary {
  periode: { from: string; to: string };
  transaksi: { jum: number; total: number; kwh: number };
  topup: { jum: number; total: number };
  refund: { jum: number; total: number };
  pemasukan: number;
  pengeluaran: number;
  net: number;
  saldo_user: number;
}

interface TransactionRow {
  periode: string;
  jum_transaksi: number;
  kwh: number;
  ppn: number;
  pbjt: number;
  pju: number;
  grand_total: number;
}
interface TransactionReport {
  rows: TransactionRow[];
  summary: { jum_transaksi: number; kwh: number; grand_total: number };
}

interface TopupRow {
  no_trans: string;
  tgl_topup: string | null;
  tgl_bayar: string | null;
  jumlah: number;
  status_bayar: string;
  status_topup: string;
  nama: string | null;
  email: string | null;
}
interface TopupReport {
  rows: TopupRow[];
  total: number;
  jum: number;
}

interface RefundRow {
  id: number;
  no_trans: string;
  jml_transaksi: number;
  jumlah: number;
  status: string;
  tgl_buat: string | null;
  tgl_done: string | null;
  nama: string | null;
  email: string | null;
}
interface RefundReport {
  rows: RefundRow[];
  total: number;
  jum: number;
}

interface MitraRow {
  id_mitra: number;
  mitra: string;
  jum_transaksi: number;
  kwh: number;
  total: number;
}

export default function Laporan() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayLocal());
  const [group, setGroup] = useState<'day' | 'month'>('day');
  const [tab, setTab] = useState<'transaksi' | 'topup' | 'refund' | 'mitra'>('transaksi');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TransactionReport | null>(null);
  const [topups, setTopups] = useState<TopupReport | null>(null);
  const [refunds, setRefunds] = useState<RefundReport | null>(null);
  const [mitras, setMitras] = useState<MitraRow[]>([]);
  const [error, setError] = useState('');

  const qs = `from=${from}&to=${to}&group=${group}`;

  async function load() {
    setError('');
    try {
      const [s, t, tp, rf, m] = await Promise.all([
        get<Summary>(`/admin/report/summary?from=${from}&to=${to}`),
        get<TransactionReport>(`/admin/report/transaction?${qs}`),
        get<TopupReport>(`/admin/report/topup?from=${from}&to=${to}`),
        get<RefundReport>(`/admin/report/refund?from=${from}&to=${to}`),
        get<MitraRow[]>(`/admin/report/mitra?from=${from}&to=${to}`),
      ]);
      if (s.success) setSummary(s.data);
      if (t.success) setTransactions(t.data);
      if (tp.success) setTopups(tp.data);
      if (rf.success) setRefunds(rf.data);
      if (m.success) setMitras(m.data);
      if (!s.success) setError(s.message);
    } catch {
      setError('Gagal memuat data');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1>Laporan</h1>

      <div className="panel">
        <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>
            Dari
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Sampai
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Periode
            <select value={group} onChange={(e) => setGroup(e.target.value as 'day' | 'month')}>
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
            </select>
          </label>
          <button onClick={load}>
            <RefreshCw size={16} /> Muat
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid">
          <div className="stat">
            <span>Pemasukan (transaksi + topup)</span>
            <strong>Rp {rp(summary.pemasukan)}</strong>
          </div>
          <div className="stat">
            <span>Pengeluaran (refund)</span>
            <strong>Rp {rp(summary.pengeluaran)}</strong>
          </div>
          <div className="stat">
            <span>Net</span>
            <strong>Rp {rp(summary.net)}</strong>
          </div>
          <div className="stat">
            <span>Saldo user outstanding</span>
            <strong>Rp {rp(summary.saldo_user)}</strong>
          </div>
          <div className="stat">
            <span>Transaksi selesai</span>
            <strong>{rp(summary.transaksi.jum)}</strong>
          </div>
          <div className="stat">
            <span>Topup masuk</span>
            <strong>{rp(summary.topup.jum)}</strong>
          </div>
          <div className="stat">
            <span>Refund</span>
            <strong>{rp(summary.refund.jum)}</strong>
          </div>
          <div className="stat">
            <span>kWh terpakai</span>
            <strong>{rp(summary.transaksi.kwh)}</strong>
          </div>
        </div>
      )}

      {error && <p className="msg">{error}</p>}

      <div className="row" style={{ marginBottom: 12 }}>
        <button className={tab === 'transaksi' ? '' : 'ghost'} onClick={() => setTab('transaksi')}>
          Transaksi
        </button>
        <button className={tab === 'topup' ? '' : 'ghost'} onClick={() => setTab('topup')}>
          Topup
        </button>
        <button className={tab === 'refund' ? '' : 'ghost'} onClick={() => setTab('refund')}>
          Refund
        </button>
        <button className={tab === 'mitra' ? '' : 'ghost'} onClick={() => setTab('mitra')}>
          Per Mitra
        </button>
      </div>

      {tab === 'transaksi' && (
        <>
          {transactions && (
            <div className="panel">
              <h3>
                Total: {rp(transactions.summary.jum_transaksi)} transaksi · {rp(transactions.summary.kwh)} kWh · Rp{' '}
                {rp(transactions.summary.grand_total)}
              </h3>
            </div>
          )}
          <DataTable
            data={transactions?.rows ?? []}
            rowKey={(r) => r.periode}
            searchPlaceholder="Cari periode…"
            columns={[
              { header: 'Periode', value: (r) => r.periode, render: (r) => r.periode },
              { header: 'Jml Transaksi', value: (r) => r.jum_transaksi, render: (r) => rp(r.jum_transaksi) },
              { header: 'kWh', value: (r) => r.kwh, render: (r) => rp(r.kwh) },
              { header: 'PPN', value: (r) => r.ppn, render: (r) => rp(r.ppn) },
              { header: 'PBJT', value: (r) => r.pbjt, render: (r) => rp(r.pbjt) },
              { header: 'PJU', value: (r) => r.pju, render: (r) => rp(r.pju) },
              { header: 'Grand Total (Rp)', value: (r) => r.grand_total, render: (r) => rp(r.grand_total) },
            ]}
          />
        </>
      )}

      {tab === 'topup' && (
        <>
          {topups && (
            <div className="panel">
              <h3>
                Total topup masuk: {rp(topups.jum)} transaksi · Rp {rp(topups.total)}
              </h3>
            </div>
          )}
          <DataTable
            data={topups?.rows ?? []}
            rowKey={(r) => r.no_trans}
            searchPlaceholder="Cari topup…"
            columns={[
              { header: 'No Transaksi', value: (r) => r.no_trans, render: (r) => r.no_trans },
              { header: 'User', value: (r) => r.nama ?? r.email ?? '', render: (r) => r.nama ?? r.email ?? '-' },
              { header: 'Jumlah (Rp)', value: (r) => r.jumlah, render: (r) => rp(r.jumlah) },
              { header: 'Status', value: (r) => r.status_bayar, render: (r) => r.status_bayar },
              {
                header: 'Tanggal Bayar',
                value: (r) => r.tgl_bayar ?? '',
                render: (r) => (r.tgl_bayar ? new Date(r.tgl_bayar).toLocaleString('id-ID') : '-'),
              },
            ]}
          />
        </>
      )}

      {tab === 'refund' && (
        <>
          {refunds && (
            <div className="panel">
              <h3>
                Total refund: {rp(refunds.jum)} transaksi · Rp {rp(refunds.total)}
              </h3>
            </div>
          )}
          <DataTable
            data={refunds?.rows ?? []}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari refund…"
            columns={[
              { header: 'No Transaksi', value: (r) => r.no_trans, render: (r) => r.no_trans },
              { header: 'User', value: (r) => r.nama ?? r.email ?? '', render: (r) => r.nama ?? r.email ?? '-' },
              { header: 'Nilai Transaksi (Rp)', value: (r) => r.jml_transaksi, render: (r) => rp(r.jml_transaksi) },
              { header: 'Refund (Rp)', value: (r) => r.jumlah, render: (r) => rp(r.jumlah) },
              { header: 'Status', value: (r) => r.status, render: (r) => r.status },
              {
                header: 'Tanggal',
                value: (r) => r.tgl_done ?? '',
                render: (r) => (r.tgl_done ? new Date(r.tgl_done).toLocaleString('id-ID') : '-'),
              },
            ]}
          />
        </>
      )}

      {tab === 'mitra' && (
        <DataTable
          data={mitras}
          rowKey={(r) => r.id_mitra}
          searchPlaceholder="Cari mitra…"
          columns={[
            { header: 'Mitra', value: (r) => r.mitra, render: (r) => r.mitra },
            { header: 'Jml Transaksi', value: (r) => r.jum_transaksi, render: (r) => rp(r.jum_transaksi) },
            { header: 'kWh', value: (r) => r.kwh, render: (r) => rp(r.kwh) },
            { header: 'Total (Rp)', value: (r) => r.total, render: (r) => rp(r.total) },
          ]}
        />
      )}
    </div>
  );
}
