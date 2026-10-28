import { useEffect, useState } from 'react';
import { get, put } from '../api';
import { Check } from 'lucide-react';
import DataTable from '../components/DataTable';

interface RefundRow {
  id: number;
  no_trans: string;
  jml_transaksi: number;
  jml_refund: number;
  status: string;
  tgl_buat: string | null;
  tgl_done: string | null;
  nama: string | null;
  email: string | null;
  no_hp: string | null;
}

interface TopupRow {
  id: number;
  no_trans: string;
  jml_topup: number;
  tgl_topup: string | null;
  tgl_expired: string | null;
  status_topup: string;
  nama: string | null;
  email: string | null;
  no_hp: string | null;
}

export default function Wallet() {
  const [tab, setTab] = useState<'refund' | 'topup'>('refund');
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [msg, setMsg] = useState('');

  async function loadRefund() {
    const r = await get<RefundRow[]>('/admin/refund');
    if (r.success) setRefunds(r.data);
  }

  async function loadTopup() {
    const r = await get<TopupRow[]>('/admin/topup');
    if (r.success) setTopups(r.data);
  }

  useEffect(() => {
    loadRefund();
    loadTopup();
  }, []);

  async function markDone(id: number) {
    if (!confirm('Tandai refund ini selesai?')) return;
    const r = await put(`/admin/refund/${id}/done`, {});
    setMsg(r.message);
    if (r.success) loadRefund();
  }

  return (
    <div>
      <h1>Wallet</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={tab === 'refund' ? '' : 'ghost'} onClick={() => setTab('refund')}>
          Refund
        </button>
        <button className={tab === 'topup' ? '' : 'ghost'} onClick={() => setTab('topup')}>
          Topup
        </button>
      </div>

      {tab === 'refund' ? (
        <DataTable
          data={refunds}
          rowKey={(r) => r.id}
          searchPlaceholder="Cari refund…"
          columns={[
            { header: 'No Transaksi', value: (r) => r.no_trans, render: (r) => r.no_trans },
            { header: 'User', value: (r) => r.nama ?? '', render: (r) => r.nama ?? '-' },
            {
              header: 'Nilai Transaksi',
              value: (r) => r.jml_transaksi,
              render: (r) => Number(r.jml_transaksi).toLocaleString('id-ID'),
            },
            {
              header: 'Refund',
              value: (r) => r.jml_refund,
              render: (r) => Number(r.jml_refund).toLocaleString('id-ID'),
            },
            { header: 'Status', value: (r) => r.status, render: (r) => r.status },
            {
              header: 'Tanggal',
              value: (r) => r.tgl_buat ?? '',
              render: (r) => (r.tgl_buat ? new Date(r.tgl_buat).toLocaleString('id-ID') : '-'),
            },
            {
              header: 'Aksi',
              render: (r) => (
                <div className="row">
                  {r.status === 'pending' && (
                    <button className="ghost" onClick={() => markDone(r.id)}>
                      <Check size={16} /> Selesai
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <DataTable
          data={topups}
          rowKey={(r) => r.id}
          searchPlaceholder="Cari topup…"
          columns={[
            { header: 'No Transaksi', value: (r) => r.no_trans, render: (r) => r.no_trans },
            { header: 'User', value: (r) => r.nama ?? '', render: (r) => r.nama ?? '-' },
            {
              header: 'Jumlah',
              value: (r) => r.jml_topup,
              render: (r) => Number(r.jml_topup).toLocaleString('id-ID'),
            },
            { header: 'Status', value: (r) => r.status_topup, render: (r) => r.status_topup },
            {
              header: 'Topup',
              value: (r) => r.tgl_topup ?? '',
              render: (r) => (r.tgl_topup ? new Date(r.tgl_topup).toLocaleString('id-ID') : '-'),
            },
            {
              header: 'Expired',
              value: (r) => r.tgl_expired ?? '',
              render: (r) => (r.tgl_expired ? new Date(r.tgl_expired).toLocaleString('id-ID') : '-'),
            },
          ]}
        />
      )}
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
