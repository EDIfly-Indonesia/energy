import { useEffect, useState } from 'react';
import { get, post } from '../api';
import { Plus, X, Save, RefreshCw, Wallet, History } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

// Pelanggan = pengguna aplikasi mobile (t_user_mobile) beserta riwayat
// pembayaran dan saldonya. Berbeda dari menu "Pengguna" (admin dashboard).

const rp = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('id-ID');
const dt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString('id-ID') : '-');

interface PelangganRow {
  id_user: number;
  nama: string | null;
  email: string | null;
  no_hp: string | null;
  id_mitra: number;
  mitra: string | null;
  id_jenismember: number;
  jenis_member: string | null;
  id_wallet: string | null;
  saldo: number;
  kwh_bulan_ini: number;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface FormState {
  nama: string;
  email: string;
  password: string;
  no_hp: string;
  id_mitra: number;
  id_jenismember: number;
  id_wallet: string;
}

interface MitraOpt {
  id_mitra: number;
  name: string;
}
interface JenisOpt {
  id_jenismember: number;
  nama_member: string | null;
}

const emptyForm: FormState = {
  nama: '',
  email: '',
  password: '',
  no_hp: '',
  id_mitra: 0,
  id_jenismember: 0,
  id_wallet: '',
};

interface Riwayat {
  topup: Array<Record<string, unknown>>;
  refund: Array<Record<string, unknown>>;
  transaksi: Array<Record<string, unknown>>;
  histori_saldo: Array<Record<string, unknown>>;
  kwh: Array<Record<string, unknown>>;
}

const emptyRiwayat: Riwayat = { topup: [], refund: [], transaksi: [], histori_saldo: [], kwh: [] };

type TabKey = 'topup' | 'transaksi' | 'refund' | 'saldo' | 'kwh';

export default function Pelanggan() {
  const [rows, setRows] = useState<PelangganRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const [mitraList, setMitraList] = useState<MitraOpt[]>([]);
  const [jenisList, setJenisList] = useState<JenisOpt[]>([]);

  const [detail, setDetail] = useState<PelangganRow | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat>(emptyRiwayat);
  const [tab, setTab] = useState<TabKey>('topup');
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load() {
    const r = await get<PelangganRow[]>('/admin/pelanggan');
    if (r.success) setRows(r.data);
  }

  useEffect(() => {
    load();
    get<{ mitra: MitraOpt[]; jenismember: JenisOpt[] }>('/admin/pelanggan/lookup').then((r) => {
      if (r.success) {
        setMitraList(r.data.mitra);
        setJenisList(r.data.jenismember);
      }
    });
  }, []);

  function openNew() {
    setForm(emptyForm);
    setShowForm(true);
    setMsg('');
  }

  // Halaman ini sengaja hanya menyediakan Tambah + Riwayat. Tombol Ubah dan
  // Hapus dihapus dari daftar agar admin tidak sengaja mengubah/menghapus data
  // pelanggan; endpoint PUT/DELETE tetap ada di backend untuk kebutuhan lain.
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      nama: form.nama,
      email: form.email,
      no_hp: form.no_hp,
      id_mitra: form.id_mitra,
      id_jenismember: form.id_jenismember,
      id_wallet: form.id_wallet,
    };
    if (form.password.trim() !== '') payload.password = form.password;

    const r = await post('/admin/pelanggan', payload);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(emptyForm);
      load();
    }
  }

  async function restore(p: PelangganRow) {
    const r = await post(`/admin/pelanggan/${p.id_user}/restore`, {});
    setMsg(r.message);
    if (r.success) load();
  }

  async function openDetail(p: PelangganRow) {
    setDetail(p);
    setTab('topup');
    setRiwayat(emptyRiwayat);
    setLoadingDetail(true);
    const [d, rw] = await Promise.all([
      get<PelangganRow>(`/admin/pelanggan/${p.id_user}`),
      get<Riwayat>(`/admin/pelanggan/${p.id_user}/riwayat`),
    ]);
    if (d.success) setDetail(d.data);
    if (rw.success) setRiwayat(rw.data);
    setLoadingDetail(false);
  }

  async function refreshDetail() {
    if (!detail) return;
    setLoadingDetail(true);
    const [d, rw] = await Promise.all([
      get<PelangganRow>(`/admin/pelanggan/${detail.id_user}`),
      get<Riwayat>(`/admin/pelanggan/${detail.id_user}/riwayat`),
    ]);
    if (d.success) setDetail(d.data);
    if (rw.success) setRiwayat(rw.data);
    setLoadingDetail(false);
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const totalSaldo = rows.reduce((a, r) => a + Number(r.saldo || 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Pelanggan</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      <div className="grid mb-4">
        <div className="stat">
          <span>Total Pelanggan</span>
          <strong>{rp(rows.length)}</strong>
        </div>
        <div className="stat">
          <span>Total Saldo</span>
          <strong>Rp {rp(totalSaldo)}</strong>
        </div>
        <div className="stat">
          <span>Nonaktif</span>
          <strong>{rp(rows.filter((r) => r.deleted_at).length)}</strong>
        </div>
      </div>

      {/* ---------------- form tambah / ubah ---------------- */}
      <Modal
        open={showForm}
        title="Tambah Pelanggan"
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Nama
              <input value={form.nama} onChange={(e) => set('nama', e.target.value)} />
            </label>
            <label>
              Email (login)
              <input value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label>
              No HP
              <input value={form.no_hp} onChange={(e) => set('no_hp', e.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Wajib diisi"
              />
            </label>
            <label>
              Mitra
              <select value={form.id_mitra} onChange={(e) => set('id_mitra', Number(e.target.value))}>
                <option value={0}>— Pilih Mitra —</option>
                {mitraList.map((m) => (
                  <option key={m.id_mitra} value={m.id_mitra}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jenis Member
              <select
                value={form.id_jenismember}
                onChange={(e) => set('id_jenismember', Number(e.target.value))}
              >
                {jenisList.map((j) => (
                  <option key={j.id_jenismember} value={j.id_jenismember}>
                    {j.nama_member || `Jenis #${j.id_jenismember}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ID Wallet (DOKU)
              <input value={form.id_wallet} onChange={(e) => set('id_wallet', e.target.value)} />
            </label>
          </div>
          <div className="row mt-5">
            <button type="submit">
              <Save size={16} /> Simpan
            </button>
            <button type="button" className="cancel" onClick={() => setShowForm(false)}>
              <X size={16} /> Batal
            </button>
          </div>
          {msg && <p className="msg">{msg}</p>}
        </form>
      </Modal>

      {/* ---------------- detail + riwayat ---------------- */}
      <Modal
        open={detail != null}
        title={detail ? `Pelanggan — ${detail.nama ?? detail.email}` : 'Pelanggan'}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid mb-0">
              <div className="stat">
                <span>Saldo</span>
                <strong>Rp {rp(detail.saldo)}</strong>
              </div>
              <div className="stat">
                <span>kWh Bulan Ini</span>
                <strong>{rp(detail.kwh_bulan_ini)}</strong>
              </div>
              <div className="stat">
                <span>Mitra</span>
                <strong className="text-base">{detail.mitra ?? '-'}</strong>
              </div>
              <div className="stat">
                <span>Status</span>
                <strong className="text-base">{detail.deleted_at ? 'Nonaktif' : 'Aktif'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-400">Email: </span>
                {detail.email ?? '-'}
              </div>
              <div>
                <span className="text-slate-400">No HP: </span>
                {detail.no_hp ?? '-'}
              </div>
              <div>
                <span className="text-slate-400">Jenis Member: </span>
                {detail.jenis_member || (detail.id_jenismember ? `#${detail.id_jenismember}` : '-')}
              </div>
              <div>
                <span className="text-slate-400">ID Wallet: </span>
                {detail.id_wallet || '-'}
              </div>
              <div>
                <span className="text-slate-400">Terdaftar: </span>
                {dt(detail.created_at)}
              </div>
              <div>
                <span className="text-slate-400">Diperbarui: </span>
                {dt(detail.updated_at)}
              </div>
            </div>

            <div className="submenu">
              <button className={tab === 'topup' ? '' : 'ghost'} onClick={() => setTab('topup')}>
                <Wallet size={16} /> Topup ({riwayat.topup.length})
              </button>
              <button className={tab === 'transaksi' ? '' : 'ghost'} onClick={() => setTab('transaksi')}>
                <History size={16} /> Transaksi ({riwayat.transaksi.length})
              </button>
              <button className={tab === 'refund' ? '' : 'ghost'} onClick={() => setTab('refund')}>
                <History size={16} /> Refund ({riwayat.refund.length})
              </button>
              <button className={tab === 'saldo' ? '' : 'ghost'} onClick={() => setTab('saldo')}>
                <History size={16} /> Histori Saldo ({riwayat.histori_saldo.length})
              </button>
              <button className={tab === 'kwh' ? '' : 'ghost'} onClick={() => setTab('kwh')}>
                <History size={16} /> kWh ({riwayat.kwh.length})
              </button>
              <button className="ghost" onClick={refreshDetail} disabled={loadingDetail}>
                <RefreshCw size={16} /> Muat
              </button>
            </div>

            {loadingDetail && <p className="msg">Memuat…</p>}

            {tab === 'topup' && (
              <table>
                <thead>
                  <tr>
                    <th>No Trans</th>
                    <th>Tanggal</th>
                    <th>Metode</th>
                    <th>Jumlah</th>
                    <th>Status Bayar</th>
                    <th>Status Topup</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.topup.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.no_trans ?? '-')}</td>
                      <td>{dt(r.tgl_topup as string)}</td>
                      <td>
                        {String(r.nama_carabayar ?? '-')}
                        {r.bank_carabayar ? ` ${String(r.bank_carabayar)}` : ''}
                      </td>
                      <td>Rp {rp(r.jumlah as number)}</td>
                      <td>{String(r.status_bayar ?? '-')}</td>
                      <td>{String(r.status_topup ?? '-')}</td>
                    </tr>
                  ))}
                  {riwayat.topup.length === 0 && (
                    <tr>
                      <td colSpan={6}>Belum ada topup</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'transaksi' && (
              <table>
                <thead>
                  <tr>
                    <th>No Trans</th>
                    <th>Tanggal</th>
                    <th>Chargebox</th>
                    <th>kWh</th>
                    <th>Grand Total</th>
                    <th>Bayar</th>
                    <th>Transaksi</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.transaksi.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.no_trans ?? '-')}</td>
                      <td>{dt(r.tgl_trans as string)}</td>
                      <td>{String(r.nama_chargebox ?? r.chargebox_id ?? '-')}</td>
                      <td>{rp(r.jml_kwh_terpakai as number)}</td>
                      <td>Rp {rp(r.grand_total as number)}</td>
                      <td>{String(r.status_bayar ?? '-')}</td>
                      <td>{String(r.status_transaksi ?? '-')}</td>
                    </tr>
                  ))}
                  {riwayat.transaksi.length === 0 && (
                    <tr>
                      <td colSpan={7}>Belum ada transaksi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'refund' && (
              <table>
                <thead>
                  <tr>
                    <th>No Trans</th>
                    <th>Dibuat</th>
                    <th>Selesai</th>
                    <th>Jumlah Transaksi</th>
                    <th>Refund</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.refund.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.no_trans ?? '-')}</td>
                      <td>{dt(r.tgl_buat as string)}</td>
                      <td>{dt(r.tgl_done as string)}</td>
                      <td>Rp {rp(r.jml_transaksi as number)}</td>
                      <td>Rp {rp(r.jumlah as number)}</td>
                      <td>{String(r.status ?? '-')}</td>
                    </tr>
                  ))}
                  {riwayat.refund.length === 0 && (
                    <tr>
                      <td colSpan={6}>Belum ada refund</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'saldo' && (
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Jumlah</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.histori_saldo.map((r, i) => (
                    <tr key={i}>
                      <td>{dt(r.tgl as string)}</td>
                      <td>{String(r.jenis ?? '-')}</td>
                      <td>Rp {rp(r.jumlah as number)}</td>
                      <td>{String(r.keterangan ?? '-')}</td>
                    </tr>
                  ))}
                  {riwayat.histori_saldo.length === 0 && (
                    <tr>
                      <td colSpan={4}>Belum ada mutasi saldo</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'kwh' && (
              <table>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Total kWh</th>
                    <th>Terakhir Update</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.kwh.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.bln_ini ?? '-')}</td>
                      <td>{rp(r.ttl as number)}</td>
                      <td>{dt(r.last_update as string)}</td>
                    </tr>
                  ))}
                  {riwayat.kwh.length === 0 && (
                    <tr>
                      <td colSpan={3}>Belum ada data kWh</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

      <DataTable
        data={rows}
        rowKey={(r) => r.id_user}
        searchPlaceholder="Cari pelanggan (nama / email / HP)…"
        columns={[
          { header: 'ID', value: (r) => r.id_user, render: (r) => r.id_user },
          { header: 'Nama', value: (r) => r.nama ?? '', render: (r) => r.nama ?? '-' },
          { header: 'Email', value: (r) => r.email ?? '', render: (r) => r.email ?? '-' },
          { header: 'No HP', value: (r) => r.no_hp ?? '', render: (r) => r.no_hp ?? '-' },
          { header: 'Mitra', value: (r) => r.mitra ?? '', render: (r) => r.mitra ?? '-' },
          { header: 'Saldo', value: (r) => r.saldo, render: (r) => `Rp ${rp(r.saldo)}` },
          { header: 'kWh', value: (r) => r.kwh_bulan_ini, render: (r) => rp(r.kwh_bulan_ini) },
          {
            header: 'Status',
            value: (r) => (r.deleted_at ? 'nonaktif' : 'aktif'),
            render: (r) => (r.deleted_at ? 'Nonaktif' : 'Aktif'),
          },
          {
            // Hanya Riwayat: detail transaksi/topup/refund tampil di modal
            // riwayat. Ubah & Hapus sengaja tidak ada di daftar.
            header: 'Aksi',
            render: (r) => (
              <div className="row">
                <button className="ghost" onClick={() => openDetail(r)}>
                  <History size={16} /> Riwayat
                </button>
                {r.deleted_at && (
                  <button className="ghost" onClick={() => restore(r)}>
                    <RefreshCw size={16} /> Aktifkan
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
      {msg && !showForm && !detail && <p className="msg">{msg}</p>}
    </div>
  );
}
