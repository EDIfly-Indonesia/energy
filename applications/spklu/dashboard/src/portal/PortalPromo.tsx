import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalGet } from './portal-api';

/**
 * Daftar promo milik mitra yang sedang login.
 *
 * Backend memfilter dengan id_mitra_promo dari TOKEN, jadi halaman ini tidak
 * perlu (dan tidak boleh) mengirim id mitra sebagai parameter — kalau dikirim
 * pun akan diabaikan server.
 */
interface Promo {
  id_promo: number;
  kode_promo: string;
  nama: string;
  deskripsi: string | null;
  tipe_potongan: string;
  nilai_potongan: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
  jumlah_peserta: number;
  jumlah_pemakaian: number;
}

function rp(v: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(v));
}

function nilaiTampil(p: Promo): string {
  if (p.tipe_potongan === 'per_kwh') return `${rp(p.nilai_potongan)} / kWh`;
  if (p.tipe_potongan === 'persen') return `${p.nilai_potongan}%`;
  return `${rp(p.nilai_potongan)} / transaksi`;
}

function tgl(v: string): string {
  if (!v) return '-';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
}

function statusPeriode(p: Promo): { label: string; warna: string } {
  const hariIni = new Date().toISOString().slice(0, 10);
  if (!p.aktif) return { label: 'Nonaktif', warna: '#94a3b8' };
  if (hariIni < p.tanggal_mulai) return { label: 'Belum mulai', warna: '#f59e0b' };
  if (hariIni > p.tanggal_selesai) return { label: 'Berakhir', warna: '#ef4444' };
  return { label: 'Berjalan', warna: '#10b981' };
}

export default function PortalPromo() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    portalGet<Promo[]>('/portal/promo')
      .then((r) => {
        if (r.success) setRows(r.data);
        else setPesan(r.message);
      })
      .catch(() => setPesan('Gagal memuat daftar promo.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Promo Saya</h1>

      <p className="mb-4 text-sm text-slate-400">
        Pilih promo untuk mendaftarkan pelanggan yang berhak memakai kodenya.
        Hanya promo milik mitra Anda yang tampil di sini.
      </p>

      {loading && <p className="text-slate-400">Memuat…</p>}

      {!loading && rows.length === 0 && (
        <div className="panel">
          <p className="text-slate-300">Belum ada promo untuk mitra Anda.</p>
          <p className="text-sm text-slate-400">
            Promo dibuat oleh admin EZ Charge. Hubungi admin bila promo yang
            dijanjikan belum muncul.
          </p>
        </div>
      )}

      {rows.map((p) => {
        const st = statusPeriode(p);
        return (
          <div key={p.id_promo} className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3>
                  <code>{p.kode_promo}</code> — {p.nama}
                </h3>
                <p className="text-sm text-slate-400">
                  Potongan {nilaiTampil(p)} · berlaku {tgl(p.tanggal_mulai)} s.d.{' '}
                  {tgl(p.tanggal_selesai)}
                </p>
              </div>
              <span style={{ color: st.warna, fontWeight: 600 }}>{st.label}</span>
            </div>

            {p.deskripsi && <p className="text-sm text-slate-300">{p.deskripsi}</p>}

            <div className="row">
              <span className="text-sm text-slate-400">
                {p.jumlah_peserta} peserta terdaftar · {p.jumlah_pemakaian} pemakaian
              </span>
            </div>

            <div className="row">
              <Link to={`/portal/promo/${p.id_promo}`}>
                <button type="button">Kelola Peserta</button>
              </Link>
            </div>
          </div>
        );
      })}

      {pesan && <p className="msg">{pesan}</p>}
    </div>
  );
}
