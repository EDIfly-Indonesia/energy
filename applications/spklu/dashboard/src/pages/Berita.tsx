import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import UploadField from '../components/UploadField';
import MapPicker from '../components/MapPicker';
import IntInput from '../components/IntInput';

/**
 * Artikel berita (t_berita) — konten yang dibaca aplikasi mobile lewat
 * POST /informasi/getberita. Bukan feed notifikasi (`berita`).
 */
interface Berita {
  id_berita: number;
  judul: string;
  berita: string;
  tgl_terbit: string;
  tgl_buat: string;
  pembuat: string;
  jangkauan: 'semua' | 'radius';
  radius_km: number;
  pusat_latitude: string;
  pusat_longitude: string;
  jenis_berita: string;
  status: number;
  foto: string;
  url: string | null;
}

interface FormState {
  judul: string;
  berita: string;
  tgl_terbit: string;
  jangkauan: 'semua' | 'radius';
  radius_km: string;
  pusat_latitude: string;
  pusat_longitude: string;
  jenis_berita: string;
  status: string;
  foto: string | null;
  url: string;
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const emptyForm = (): FormState => ({
  judul: '',
  berita: '',
  tgl_terbit: todayISO(),
  jangkauan: 'semua',
  radius_km: '',
  pusat_latitude: '',
  pusat_longitude: '',
  jenis_berita: 'app',
  status: '1',
  foto: null,
  url: '',
});

// tgl_terbit datang sebagai "YYYY-MM-DD" (kolom date) atau ISO penuh.
function tanggalTampil(v: string): string {
  if (!v) return '-';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function keForm(b: Berita): FormState {
  return {
    judul: b.judul ?? '',
    berita: b.berita ?? '',
    tgl_terbit: String(b.tgl_terbit ?? '').slice(0, 10) || todayISO(),
    jangkauan: b.jangkauan === 'radius' ? 'radius' : 'semua',
    radius_km: b.radius_km ? String(Math.round(Number(b.radius_km))) : '',
    pusat_latitude: b.pusat_latitude ?? '',
    pusat_longitude: b.pusat_longitude ?? '',
    jenis_berita: b.jenis_berita || 'app',
    status: String(b.status ?? 1),
    foto: b.foto ? b.foto : null,
    url: b.url ?? '',
  };
}

export default function BeritaPage() {
  const [rows, setRows] = useState<Berita[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await get<Berita[]>('/admin/berita');
    if (r.success) setRows(r.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(b: Berita) {
    setForm(keForm(b));
    setEditingId(b.id_berita);
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
      judul: form.judul.trim(),
      berita: form.berita.trim(),
      tgl_terbit: form.tgl_terbit,
      jangkauan: form.jangkauan,
      radius_km: form.jangkauan === 'radius' ? Number(form.radius_km) : 0,
      pusat_latitude: form.jangkauan === 'radius' ? form.pusat_latitude : null,
      pusat_longitude: form.jangkauan === 'radius' ? form.pusat_longitude : null,
      jenis_berita: form.jenis_berita,
      status: Number(form.status),
      foto: form.foto ?? '',
      url: form.url.trim(),
    };

    const r = editingId == null
      ? await post('/admin/berita', payload)
      : await put(`/admin/berita/${editingId}`, payload);

    setSaving(false);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);
      load();
    }
  }

  async function remove(b: Berita) {
    if (!confirm(`Hapus artikel "${b.judul}"?`)) return;
    const r = await del(`/admin/berita/${b.id_berita}`);
    setMsg(r.message);
    if (r.success) load();
  }

  const radiusAktif = form.jangkauan === 'radius';

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Berita</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Berita
        </button>
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Berita`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Judul
              <input
                value={form.judul}
                maxLength={255}
                onChange={(e) => set('judul', e.target.value)}
                placeholder="Judul artikel"
              />
            </label>

            <label>
              Tanggal Terbit
              <input
                type="date"
                value={form.tgl_terbit}
                onChange={(e) => set('tgl_terbit', e.target.value)}
              />
            </label>
           </div>
          <div className="grid-3">
            <label>
              Jangkauan
              <select
                value={form.jangkauan}
                onChange={(e) => set('jangkauan', e.target.value as 'semua' | 'radius')}
              >
                <option value="semua">Semua pengguna</option>
                <option value="radius">Radius tertentu</option>
              </select>
            </label>

            <label>
              Jenis
              <select
                value={form.jenis_berita}
                onChange={(e) => set('jenis_berita', e.target.value)}
              >
                <option value="app">App</option>
                <option value="web">Web</option>
              </select>
            </label>

            <label>
              Status
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="1">Tampil</option>
                <option value="0">Draft (tidak tampil)</option>
              </select>
            </label>
           </div>
          <div className="grid-2">
            <label className="col-span-2">
              URL Tujuan (opsional)
              <input
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://…"
              />
            </label>	  
            <div className="col-span-2">
              <UploadField
                value={form.foto}
                onChange={(v) => set('foto', v)}
                label="Foto Berita"
                folder="berita/foto"
              />
            </div>
          </div>

	  <label className="col-span-2">
              Isi Berita
              <textarea
                rows={6}
                value={form.berita}
                onChange={(e) => set('berita', e.target.value)}
                placeholder="Isi artikel yang akan tampil di aplikasi"
              />
          </label>
          <p className="mt-4 mb-4 text-xs text-slate-500">
            Artikel dengan status Draft atau tanggal terbit di masa depan belum tampil di
            aplikasi. Tanggal terbit ke depan dipakai untuk menjadwalkan.
          </p>
          {radiusAktif && (
            <div className="mb-6">
              <p className="mb-2 text-sm text-slate-400">
                Titik pusat radius. Klik peta atau isi koordinat manual.
              </p>
              <div className="mb-3 grid-3">
                <label>
                  Radius (km)
                  <IntInput
                    value={form.radius_km}
                    onChange={(v) => set('radius_km', v)}
                    maxDigits={4}
                    placeholder="mis. 5"
                  />
                </label>
                <label>
                  Latitude
                  <input
                    value={form.pusat_latitude}
                    inputMode="decimal"
                    placeholder="-6.2000000"
                    onChange={(e) => set('pusat_latitude', e.target.value)}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    value={form.pusat_longitude}
                    inputMode="decimal"
                    placeholder="106.8166667"
                    onChange={(e) => set('pusat_longitude', e.target.value)}
                  />
                </label>
              </div>
              <MapPicker
                lat={form.pusat_latitude || null}
                lng={form.pusat_longitude || null}
                onChange={(lat, lng) => {
                  setForm((f) => ({ ...f, pusat_latitude: lat, pusat_longitude: lng }));
                }}
              />
            </div>
          )}

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

      <DataTable
        data={rows}
        rowKey={(b) => b.id_berita}
        searchPlaceholder="Cari berita…"
        columns={[
          { header: 'ID', value: (b) => b.id_berita, render: (b) => b.id_berita },
          { header: 'Judul', value: (b) => b.judul, render: (b) => b.judul },
          {
            header: 'Tgl Terbit',
            value: (b) => String(b.tgl_terbit).slice(0, 10),
            render: (b) => tanggalTampil(b.tgl_terbit),
          },
          {
            header: 'Jangkauan',
            value: (b) => b.jangkauan,
            render: (b) =>
              b.jangkauan === 'radius'
                ? `Radius ${Math.round(Number(b.radius_km))} km`
                : 'Semua',
          },
          {
            header: 'Status',
            value: (b) => (Number(b.status) === 1 ? 'Tampil' : 'Draft'),
            render: (b) =>
              Number(b.status) === 1 ? (
                <span className="text-emerald-400">Tampil</span>
              ) : (
                <span className="text-slate-400">Draft</span>
              ),
          },
          {
            header: 'Aksi',
            render: (b) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(b)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="danger" onClick={() => remove(b)}>
                  <Trash2 size={16} /> Hapus
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
