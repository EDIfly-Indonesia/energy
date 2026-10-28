import { useEffect, useState } from 'react';
import { get } from '../api';
import DataTable from '../components/DataTable';

interface TransactionRow {
  no_trans: string;
  tgl_trans: string;
  chargebox_id: string;
  connector_id: number;
  grand_total: string;
  tipe_charging: string;
  status_transaksi: string;
  status_bayar: string;
  nama_chargebox: string | null;
}

export default function Transaction() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    get<TransactionRow[]>('/admin/transaction')
      .then((r) => (r.success ? setRows(r.data) : setError(r.message)))
      .catch(() => setError('Gagal memuat data'));
  }, []);

  if (error) return <p className="msg">{error}</p>;

  return (
    <div>
      <h1>Transaksi</h1>
      <DataTable
        data={rows}
        rowKey={(r) => r.no_trans}
        searchPlaceholder="Cari transaksi…"
        pageSize={15}
        columns={[
          { header: 'No Transaksi', value: (r) => r.no_trans, render: (r) => r.no_trans },
          {
            header: 'Tanggal',
            value: (r) => r.tgl_trans,
            render: (r) => new Date(r.tgl_trans).toLocaleString('id-ID'),
          },
          {
            header: 'Chargebox',
            value: (r) => r.nama_chargebox ?? r.chargebox_id,
            render: (r) => r.nama_chargebox ?? r.chargebox_id,
          },
          { header: 'Konektor', value: (r) => r.connector_id, render: (r) => r.connector_id },
          { header: 'Tipe', value: (r) => r.tipe_charging, render: (r) => r.tipe_charging },
          { header: 'Status', value: (r) => r.status_transaksi, render: (r) => r.status_transaksi },
          { header: 'Bayar', value: (r) => r.status_bayar, render: (r) => r.status_bayar },
          {
            header: 'Total (Rp)',
            value: (r) => Number(r.grand_total),
            render: (r) => Number(r.grand_total).toLocaleString('id-ID'),
          },
        ]}
      />
    </div>
  );
}
