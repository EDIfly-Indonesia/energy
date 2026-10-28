import { useEffect, useState } from 'react';
import { get, post, del } from '../api';
import { Plus, Trash2, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

/**
 * Peserta promo (t_promo_peserta) — siapa yang berhak memakai kode promo.
 * Endpoint: /admin/promo/:id/peserta (API-PROMO.md §7).
 *
 * Sumber peserta bisa berbeda:
 *   - admin    : ditambahkan manual di sini
 *   - portal   : didaftarkan hotel/asuransi lewat portal mitra
 *   - atpm_endpoint : dikirim ATPM lewat API (email + kode promo)
 *
 * Peserta boleh didaftarkan sebelum punya akun mobile; validasi promo
 * mencocokkan email/no_hp saat pengguna memakai kodenya.
 */
interface PromoRingkas {
  id_promo: number;
  kode_promo: string;
  nama: string;
  aktif: boolean;
}

interface Peserta {
  id_peserta: number;
  id_user: number | null;
  email: string | null;
  no_hp: string | null;
  vin: string | null;
  status: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  catatan: string | null;
  sumber: string;
  nama_user: string | null;
  created_at: string;
}

interface FormState {
  email: string;
  no_hp: string;
  id_user: string;
  vin: string;
  status: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  catatan: string;
}

const empty = (): FormState => ({
  email: '',
  no_hp: '',
  id_user: '',
  vin: '',
  status: 'active',
  tanggal_mulai: '',
  tanggal_selesai: '',
  catatan: '',
});

const SUMBER_LABEL: Record<string, string> = {
  admin: 'Admin',
  portal: 'Portal mitra',
  atpm_endpoint: 'API ATPM',
  app: 'Aplikasi',
};

export default function PromoPesertaPage() {
  const [promo, setPromo] = useState<PromoRingkas[]>([]);
  const [idPromo, setIdPromo] = useState<string>('');
  const [rows, setRows] = useState<Peserta[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get<PromoRingkas[]>('/admin/promo').then((r) => {
      if (!r.success) return;
      setPromo(r.data);
      if (r.data.length && !idPromo) setIdPromo(String(r.data[0].id_promo));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(id: string) {
    if (!id) {
      setRows([]);
      return;
    }
    const r = await get<Peserta[]>(`/admin/promo/${id}/peserta`);
    if (r.success) setRows(r.data);
    else setMsg(r.message);
  }

  useEffect(() => {
    load(idPromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPromo]);

  function openNew() {
    if (!idPromo) {
      setMsg('Pilih promo terlebih dahulu.');
      return;
    }
    setForm(empty());
    setShowForm(true);
    setMsg('');
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const payload = {
      email: form.email.trim() || null,
      no_hp: form.no_hp.trim() || null,
      id_user: form.id_user.trim() === '' ? null : Number(form.id_user),
      vin: form.vin.trim() || null,
      status: form.status,
      tanggal_mulai: form.tanggal_mulai || null,
      tanggal_selesai: form.tanggal_selesai || null,
      catatan: form.catatan.trim() || null,
    };

    const r = await post(`/admin/promo/${idPromo}/peserta`, payload);
    setSaving(false);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      load(idPromo);
    }
  }

  async function hapus(p: Peserta) {
    const siapa = p.email || p.no_hp || (p.id_user ? `user #${p.id_user}` : `#${p.id_peserta}`);
    if (!confirm(`Hapus peserta ${siapa} dari promo ini?\n\nPemakaian yang sudah tercatat tidak terpengaruh.`)) return;
    const r = await del(`/admin/promo-peserta/${p.id_peserta}`);
    setMsg(r.message);
    if (r.success) load(idPromo);
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Peserta Promo</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Peserta
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Peserta adalah pengguna yang berhak memakai kode promo. Hotel dan asuransi
        mendaftarkan pelanggannya lewat portal mitra; ATPM lewat API. Halaman ini
        untuk penambahan manual dan koreksi.
      </p>

      <div className="panel">
        <label>
          Promo
          <select value={idPromo} onChange={(e) => setIdPromo(e.target.value)}>
            <option value="">— pilih promo —</option>
            {promo.map((p) => (
              <option key={p.id_promo} value={p.id_promo}>
                {p.kode_promo} — {p.nama}
                {p.aktif ? '' : ' (nonaktif)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Modal open={showForm} title="Tambah Peserta" onClose={() => setShowForm(false)}>
        <form onSubmit={save}>
          <p className="mb-4 text-xs text-slate-400">
            Isi minimal satu dari email, no. HP, atau ID pengguna. Bila email/no. HP
            cocok dengan akun mobile, ID pengguna diisi otomatis oleh server.
          </p>

          <div className="grid-2">
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="tamu@example.com"
              />
            </label>

            <label>
              No. HP
              <input value={form.no_hp} onChange={(e) => set('no_hp', e.target.value)} placeholder="0812…" />
            </label>

            <label>
              ID Pengguna (opsional)
              <input
                value={form.id_user}
                inputMode="numeric"
                onChange={(e) => set('id_user', e.target.value)}
                placeholder="kosongkan untuk dicari otomatis"
              />
            </label>

            <label>
              VIN (opsional, untuk ATPM)
              <input value={form.vin} onChange={(e) => set('vin', e.target.value)} />
            </label>

            <label>
              Status
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Aktif</option>
                <option value="pending">Pending</option>
                <option value="suspended">Ditangguhkan</option>
                <option value="expired">Kedaluwarsa</option>
              </select>
            </label>

            <label>
              Berlaku Mulai (opsional)
              <input
                type="date"
                value={form.tanggal_mulai}
                onChange={(e) => set('tanggal_mulai', e.target.value)}
              />
            </label>

            <label>
              Berlaku Sampai (opsional)
              <input
                type="date"
                value={form.tanggal_selesai}
                onChange={(e) => set('tanggal_selesai', e.target.value)}
              />
            </label>

            <label className="col-span-2">
              Catatan
              <input
                value={form.catatan}
                onChange={(e) => set('catatan', e.target.value)}
                placeholder="mis. Kamar 204 / nomor polis"
              />
            </label>
          </div>

          <div className="row">
            <button type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button type="button" className="cancel" onClick={() => setShowForm(false)}>
              <X size={16} /> Batal
            </button>
          </div>
          {msg && <p className="msg">{msg}</p>}
        </form>
      </Modal>

      {idPromo ? (
        <DataTable
          data={rows}
          rowKey={(p) => p.id_peserta}
          searchPlaceholder="Cari email / no. HP…"
          columns={[
            {
              header: 'Identitas',
              value: (p) => p.email ?? p.no_hp ?? String(p.id_user ?? ''),
              render: (p) => (
                <span>
                  {p.email || p.no_hp || '-'}
                  {p.id_user && (
                    <>
                      <br />
                      <span className="text-xs text-slate-400">
                        user #{p.id_user}
                        {p.nama_user ? ` — ${p.nama_user}` : ''}
                      </span>
                    </>
                  )}
                </span>
              ),
            },
            {
              header: 'Sumber',
              value: (p) => p.sumber,
              render: (p) => (
                <span className="text-xs">{SUMBER_LABEL[p.sumber] ?? p.sumber}</span>
              ),
            },
            {
              header: 'Status',
              value: (p) => p.status,
              render: (p) =>
                p.status === 'active' ? (
                  <span className="text-emerald-400">Aktif</span>
                ) : (
                  <span className="text-slate-400">{p.status}</span>
                ),
            },
            {
              header: 'Berlaku',
              value: (p) => p.tanggal_mulai ?? '',
              render: (p) =>
                p.tanggal_mulai || p.tanggal_selesai ? (
                  <span className="text-xs">
                    {p.tanggal_mulai ?? '—'} s.d. {p.tanggal_selesai ?? '—'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">ikut periode promo</span>
                ),
            },
            { header: 'Catatan', value: (p) => p.catatan ?? '', render: (p) => p.catatan || '-' },
            {
              header: 'Aksi',
              render: (p) => (
                <div className="row">
                  <button className="danger" onClick={() => hapus(p)}>
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <p className="text-slate-400">Pilih promo untuk melihat pesertanya.</p>
      )}
      {msg && !showForm && <p className="msg">{msg}</p>}
    </div>
  );
}
