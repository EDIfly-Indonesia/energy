import { useEffect, useState } from 'react';
import { get } from '../api';

interface DashboardData {
  total_chargebox: number;
  total_mitra: number;
  total_user: number;
  charging_hari_ini: number;
  transaksi_hari_ini: { total: string; jum: number };
  transaksi_bulan_ini: { total: string; jum: number };
  grafik_bulanan: { month_key: string; total: string; jum: number }[];
}

function rupiah(v: string | number): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('id-ID') : '0';
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<DashboardData>('/admin/dashboard')
      .then((r) => (r.success ? setData(r.data) : setError(r.message)))
      .catch(() => setError('Gagal memuat data'));
  }, []);

  if (error) return <p className="msg">{error}</p>;
  if (!data) return <p className="msg">Memuat…</p>;

  return (
    <div>
      <h1>Beranda</h1>
      <div className="grid">
        <div className="stat">
          <span>Chargebox</span>
          <strong>{data.total_chargebox}</strong>
        </div>
        <div className="stat">
          <span>Mitra</span>
          <strong>{data.total_mitra}</strong>
        </div>
        <div className="stat">
          <span>User</span>
          <strong>{data.total_user}</strong>
        </div>
        <div className="stat">
          <span>Charging Hari Ini</span>
          <strong>{data.charging_hari_ini}</strong>
        </div>
        <div className="stat">
          <span>Transaksi Hari Ini (Rp)</span>
          <strong>{rupiah(data.transaksi_hari_ini.total)}</strong>
        </div>
        <div className="stat">
          <span>Transaksi Bulan Ini (Rp)</span>
          <strong>{rupiah(data.transaksi_bulan_ini.total)}</strong>
        </div>
      </div>

      <h2>Transaksi Bulanan (12 bulan terakhir)</h2>
      <table>
        <thead>
          <tr>
            <th>Bulan</th>
            <th>Jumlah</th>
            <th>Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {data.grafik_bulanan.map((g) => (
            <tr key={g.month_key}>
              <td>{g.month_key}</td>
              <td>{g.jum}</td>
              <td>{rupiah(g.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
