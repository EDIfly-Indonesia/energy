import { useCallback, useEffect, useState } from 'react';
import { get, post, put } from '../api';
import { AlertTriangle, CheckCircle2, RefreshCw, Wallet } from 'lucide-react';

interface PelangganRingkas {
  total: number;
  punya_wallet: number;
  belum: number;
  gagal: number;
}

interface BarisBelum {
  id_user: number;
  email: string;
  nama: string | null;
  wallet_status: string;
  wallet_error: string | null;
}

interface Verifikasi {
  ok: boolean;
  saldo?: number | string | null;
  saldo_tersedia?: number | null;
  saldo_tertunda?: number | null;
  alasan?: string;
}

interface StatusWallet {
  mode: string;
  nama_setting: string;
  wallet_pusat: string | null;
  wallet_pusat_verifikasi: Verifikasi | null;
  pelanggan: PelangganRingkas;
  belum_punya_wallet: BarisBelum[];
  gagal: BarisBelum[];
}

const LABEL = 'text-xs text-slate-400';
const MONO = 'font-mono text-sm';

export default function DokuWalletPanel() {
  const [status, setStatus] = useState<StatusWallet | null>(null);
  const [msg, setMsg] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [idManual, setIdManual] = useState('');

  const muat = useCallback(async () => {
    const r = await get<StatusWallet>('/admin/wallet');
    if (r.success) setStatus(r.data);
    else setMsg(r.message);
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function jalankan(fn: () => Promise<{ success: boolean; message: string }>) {
    setSibuk(true);
    try {
      const r = await fn();
      setMsg(r.message);
      await muat();
    } finally {
      setSibuk(false);
    }
  }

  const p = status?.pelanggan;
  const pusat = status?.wallet_pusat;
  const verif = status?.wallet_pusat_verifikasi;
  const prod = status?.mode === 'produksi';

  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold">Wallet Pusat</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Sub account DOKU yang menampung transfer saldo dari wallet pelanggan dan menjadi
              sumber dana refund.
            </p>
          </div>
          <div className="row items-center">
            <span
              className={
                'rounded-full px-2.5 py-1 text-xs font-medium ' +
                (prod ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300')
              }
            >
              {status?.mode ?? '…'}
            </span>
            <button className="ghost" onClick={muat} disabled={sibuk}>
              <RefreshCw size={16} /> Periksa
            </button>
          </div>
        </div>

        {pusat ? (
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-slate-900 p-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className={LABEL}>ID wallet</span>
              <strong className={MONO}>{pusat}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className={LABEL}>Status</span>
              {verif?.ok ? (
                <strong className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={15} /> Bisa dipakai
                </strong>
              ) : (
                <strong className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle size={15} /> Belum terverifikasi
                </strong>
              )}
            </div>
            {verif?.ok && verif.saldo != null && (
              <div className="flex flex-col gap-1">
                <span className={LABEL}>Saldo tersedia</span>
                <strong>Rp {Number(verif.saldo).toLocaleString('id-ID')}</strong>
                {verif.saldo_tertunda != null && verif.saldo_tertunda > 0 && (
                  <span className="text-xs text-slate-400">
                    + Rp {Number(verif.saldo_tertunda).toLocaleString('id-ID')} tertunda
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle size={15} /> Wallet pusat belum diatur.
          </p>
        )}

        {verif && !verif.ok && verif.alasan && (
          <p className="text-xs text-slate-400">{verif.alasan}</p>
        )}

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Nama wallet pusat</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. GoCaz SPKLU"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Email</span>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="wallet@edifly-si.com"
            />
          </label>
          <div className="flex items-end">
            <button
              className="w-full border border-transparent"
              disabled={sibuk || !form.name || !form.email}
              onClick={() =>
                jalankan(() => post('/admin/wallet/central', { name: form.name, email: form.email }))
              }
            >
              <Wallet size={16} /> {pusat ? 'Buat baru' : 'Buat wallet pusat'}
            </button>
          </div>
        </div>

        <details>
          <summary className="cursor-pointer text-xs text-slate-400">
            Sudah punya ID dari DOKU? Simpan manual
          </summary>
          <div className="row mt-2">
            <input
              className={MONO}
              value={idManual}
              onChange={(e) => setIdManual(e.target.value)}
              placeholder="SAC-0000-0000000000000"
            />
            <button
              className="ghost"
              disabled={sibuk || !/^SAC-/.test(idManual)}
              onClick={() => jalankan(() => put('/admin/wallet/central', { id_wallet: idManual }))}
            >
              Simpan
            </button>
          </div>
        </details>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold">Wallet Pelanggan</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Setiap pelanggan mendapat satu sub account saat mendaftar. Yang belum punya bisa
              dibuatkan sekaligus di sini.
            </p>
          </div>
          <button
            disabled={sibuk || !p || p.belum === 0}
            onClick={() => jalankan(() => post('/admin/wallet/backfill', { limit: 100 }))}
          >
            Buat {p?.belum ?? 0} wallet yang belum ada
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stat">
            <span>Total pelanggan</span>
            <strong>{p?.total ?? 0}</strong>
          </div>
          <div className="stat">
            <span>Punya wallet</span>
            <strong className="text-emerald-400">{p?.punya_wallet ?? 0}</strong>
          </div>
          <div className="stat">
            <span>Belum punya</span>
            <strong className={p?.belum ? 'text-amber-400' : ''}>{p?.belum ?? 0}</strong>
          </div>
          <div className="stat">
            <span>Gagal dibuat</span>
            <strong className={p?.gagal ? 'text-rose-400' : ''}>{p?.gagal ?? 0}</strong>
          </div>
        </div>

        {!!status?.gagal?.length && (
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-semibold">Gagal dibuat</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Alasan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {status.gagal.map((u) => (
                  <tr key={u.id_user}>
                    <td>{u.id_user}</td>
                    <td>{u.email}</td>
                    <td className="text-xs text-slate-400">{u.wallet_error ?? '-'}</td>
                    <td>
                      <button
                        className="ghost"
                        disabled={sibuk}
                        onClick={() =>
                          jalankan(() => post(`/admin/pelanggan/${u.id_user}/wallet`, {}))
                        }
                      >
                        Ulangi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!!status?.belum_punya_wallet?.length && (
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-semibold">Belum punya wallet</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Nama</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {status.belum_punya_wallet.map((u) => (
                  <tr key={u.id_user}>
                    <td>{u.id_user}</td>
                    <td>{u.email}</td>
                    <td>{u.nama ?? '-'}</td>
                    <td>
                      <button
                        className="ghost"
                        disabled={sibuk}
                        onClick={() =>
                          jalankan(() => post(`/admin/pelanggan/${u.id_user}/wallet`, {}))
                        }
                      >
                        Buat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
