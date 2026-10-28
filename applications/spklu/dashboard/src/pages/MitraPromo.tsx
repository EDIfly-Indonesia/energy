import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X, KeyRound, Ban } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

/**
 * Mitra promo (t_promo_mitra) — pihak yang membiayai promosi:
 * ATPM, hotel, asuransi, atau lainnya.
 *
 * Endpoint: /admin/promo-mitra (API-PROMO.md §4).
 * API key hanya berlaku untuk mitra bertipe ATPM (endpoint M2M /atpm/kendaraan).
 */
interface MitraPromo {
  id_mitra_promo: number;
  jenis_mitra: string;
  kode: string;
  nama: string;
  alamat: string | null;
  latitude: string | null;
  longitude: string | null;
  kontak_nama: string | null;
  kontak_email: string | null;
  kontak_hp: string | null;
  catatan: string | null;
  aktif: boolean;
  punya_api_key: boolean;
  api_key_last_used: string | null;
  jumlah_promo: number;
}

interface FormState {
  jenis_mitra: string;
  kode: string;
  nama: string;
  alamat: string;
  latitude: string;
  longitude: string;
  kontak_nama: string;
  kontak_email: string;
  kontak_hp: string;
  catatan: string;
  aktif: boolean;
}

const JENIS = [
  { value: 'atpm', label: 'ATPM (pabrikan otomotif)' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'asuransi', label: 'Asuransi' },
  { value: 'lainnya', label: 'Lainnya' },
];

const empty = (): FormState => ({
  jenis_mitra: 'atpm',
  kode: '',
  nama: '',
  alamat: '',
  latitude: '',
  longitude: '',
  kontak_nama: '',
  kontak_email: '',
  kontak_hp: '',
  catatan: '',
  aktif: true,
});

function jenisLabel(v: string): string {
  return JENIS.find((j) => j.value === v)?.label ?? v;
}

export default function MitraPromoPage() {
  const [rows, setRows] = useState<MitraPromo[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // API key: plaintext hanya ditampilkan sekali setelah dibuat.
  const [apiKeyBaru, setApiKeyBaru] = useState<{ nama: string; key: string } | null>(null);

  async function load() {
    const r = await get<MitraPromo[]>('/admin/promo-mitra');
    if (r.success) setRows(r.data);
    else setMsg(r.message);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(empty());
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(m: MitraPromo) {
    setForm({
      jenis_mitra: m.jenis_mitra,
      kode: m.kode,
      nama: m.nama,
      alamat: m.alamat ?? '',
      latitude: m.latitude ?? '',
      longitude: m.longitude ?? '',
      kontak_nama: m.kontak_nama ?? '',
      kontak_email: m.kontak_email ?? '',
      kontak_hp: m.kontak_hp ?? '',
      catatan: m.catatan ?? '',
      aktif: m.aktif,
    });
    setEditingId(m.id_mitra_promo);
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
      jenis_mitra: form.jenis_mitra,
      kode: form.kode.trim().toUpperCase(),
      nama: form.nama.trim(),
      alamat: form.alamat.trim() || null,
      latitude: form.latitude.trim() || null,
      longitude: form.longitude.trim() || null,
      kontak_nama: form.kontak_nama.trim() || null,
      kontak_email: form.kontak_email.trim() || null,
      kontak_hp: form.kontak_hp.trim() || null,
      catatan: form.catatan.trim() || null,
      aktif: form.aktif,
    };

    const r =
      editingId == null
        ? await post('/admin/promo-mitra', payload)
        : await put(`/admin/promo-mitra/${editingId}`, payload);

    setSaving(false);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setEditingId(null);
      load();
    }
  }

  async function nonaktifkan(m: MitraPromo) {
    if (!confirm(`Nonaktifkan mitra "${m.nama}"?\n\nPromo aktif milik mitra ini harus dinonaktifkan lebih dulu.`)) return;
    const r = await del(`/admin/promo-mitra/${m.id_mitra_promo}`);
    setMsg(r.message);
    if (r.success) load();
  }

  async function buatApiKey(m: MitraPromo) {
    if (m.punya_api_key) {
      if (!confirm(`Mitra "${m.nama}" sudah punya API key.\n\nMembuat key baru akan MEMATIKAN key lama. Lanjutkan?`)) return;
    }
    const r = await post<{ api_key: string }>(`/admin/promo-mitra/${m.id_mitra_promo}/api-key`, {});
    setMsg(r.message);
    if (r.success) {
      setApiKeyBaru({ nama: m.nama, key: r.data.api_key });
      load();
    }
  }

  async function cabutApiKey(m: MitraPromo) {
    if (!confirm(`Cabut API key mitra "${m.nama}"? ATPM tidak akan bisa mendaftarkan kendaraan lagi.`)) return;
    const r = await del(`/admin/promo-mitra/${m.id_mitra_promo}/api-key`);
    setMsg(r.message);
    if (r.success) load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Mitra Promo</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Mitra
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Mitra adalah pihak yang membiayai promosi (barter iklan, tanpa settlement).
        Jenis mitra menentukan aturan validasi: ATPM wajib cek merek kendaraan,
        hotel dan asuransi cukup mendaftarkan peserta lewat portal.
      </p>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Mitra Promo`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Jenis Mitra
              <select value={form.jenis_mitra} onChange={(e) => set('jenis_mitra', e.target.value)}>
                {JENIS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kode Mitra
              <input
                value={form.kode}
                maxLength={20}
                onChange={(e) => set('kode', e.target.value.toUpperCase())}
                placeholder="mis. BYD"
              />
            </label>

            <label className="col-span-2">
              Nama Mitra
              <input
                value={form.nama}
                maxLength={150}
                onChange={(e) => set('nama', e.target.value)}
                placeholder="mis. BYD Indonesia"
              />
            </label>

            <label className="col-span-2">
              Alamat
              <input value={form.alamat} onChange={(e) => set('alamat', e.target.value)} />
            </label>

            <label>
              Latitude
              <input
                value={form.latitude}
                inputMode="decimal"
                onChange={(e) => set('latitude', e.target.value)}
                placeholder="-6.2000000"
              />
            </label>

            <label>
              Longitude
              <input
                value={form.longitude}
                inputMode="decimal"
                onChange={(e) => set('longitude', e.target.value)}
                placeholder="106.8166667"
              />
            </label>

            <label>
              Nama Kontak
              <input value={form.kontak_nama} onChange={(e) => set('kontak_nama', e.target.value)} />
            </label>

            <label>
              Email Kontak
              <input
                type="email"
                value={form.kontak_email}
                onChange={(e) => set('kontak_email', e.target.value)}
              />
            </label>

            <label>
              No. HP Kontak
              <input value={form.kontak_hp} onChange={(e) => set('kontak_hp', e.target.value)} />
            </label>

            <label>
              Status
              <select
                value={form.aktif ? '1' : '0'}
                onChange={(e) => set('aktif', e.target.value === '1')}
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </label>
          </div>

          <label className="col-span-2">
            Catatan
            <textarea
              rows={2}
              value={form.catatan}
              onChange={(e) => set('catatan', e.target.value)}
              placeholder="Catatan internal (opsional)"
            />
          </label>

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

      {apiKeyBaru && (
        <div className="panel">
          <h3>API key untuk {apiKeyBaru.nama}</h3>
          <p className="text-sm text-slate-400">
            Salin sekarang. Key ini <strong>tidak akan ditampilkan lagi</strong>.
            Kirim ke ATPM lewat kanal aman; mereka memakainya sebagai header
            <code> X-Api-Key</code>.
          </p>
          <code className="block break-all rounded bg-slate-900 p-3 text-sm">{apiKeyBaru.key}</code>
          <button className="ghost" onClick={() => setApiKeyBaru(null)}>
            <X size={16} /> Tutup
          </button>
        </div>
      )}

      <DataTable
        data={rows}
        rowKey={(m) => m.id_mitra_promo}
        searchPlaceholder="Cari mitra…"
        columns={[
          { header: 'Kode', value: (m) => m.kode, render: (m) => <code>{m.kode}</code> },
          { header: 'Nama', value: (m) => m.nama, render: (m) => m.nama },
          {
            header: 'Jenis',
            value: (m) => m.jenis_mitra,
            render: (m) => jenisLabel(m.jenis_mitra),
          },
          {
            header: 'Kontak',
            value: (m) => m.kontak_email ?? '',
            render: (m) => m.kontak_email || m.kontak_hp || '-',
          },
          {
            header: 'Promo',
            value: (m) => m.jumlah_promo,
            render: (m) => m.jumlah_promo,
          },
          {
            header: 'API Key',
            value: (m) => (m.punya_api_key ? 'ada' : 'tidak ada'),
            render: (m) =>
              m.jenis_mitra !== 'atpm' ? (
                <span className="text-slate-500">—</span>
              ) : m.punya_api_key ? (
                <span className="text-emerald-400" title={m.api_key_last_used ?? 'belum pernah dipakai'}>
                  ada
                </span>
              ) : (
                <span className="text-slate-400">belum</span>
              ),
          },
          {
            header: 'Status',
            value: (m) => (m.aktif ? 'Aktif' : 'Nonaktif'),
            render: (m) =>
              m.aktif ? (
                <span className="text-emerald-400">Aktif</span>
              ) : (
                <span className="text-slate-400">Nonaktif</span>
              ),
          },
          {
            header: 'Aksi',
            render: (m) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(m)}>
                  <Pencil size={16} /> Ubah
                </button>
                {m.jenis_mitra === 'atpm' && (
                  <>
                    <button className="ghost" onClick={() => buatApiKey(m)}>
                      <KeyRound size={16} /> {m.punya_api_key ? 'Reset Key' : 'Buat Key'}
                    </button>
                    {m.punya_api_key && (
                      <button className="ghost" onClick={() => cabutApiKey(m)}>
                        <Ban size={16} /> Cabut
                      </button>
                    )}
                  </>
                )}
                <button className="danger" onClick={() => nonaktifkan(m)}>
                  <Trash2 size={16} /> Nonaktifkan
                </button>
              </div>
            ),
          },
        ]}
      />
      {msg && !showForm && <p className="msg">{msg}</p>}
    </div>
  );
}
