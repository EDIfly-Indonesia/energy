import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import UploadField from '../components/UploadField';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import IntInput from '../components/IntInput';

interface Area {
  id_area: number;
  nama_area: string;
  alamat: string | null;
  kode_pos: string | null;
  kota: string | null;
  foto: string | null;
  pbjt: number | null;
}

const empty: Area = { id_area: 0, nama_area: '', alamat: '', kode_pos: '', kota: '', foto: '', pbjt: 0 };

export default function Area() {
  const [rows, setRows] = useState<Area[]>([]);
  const [form, setForm] = useState<Area>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await get<Area[]>('/admin/area');
    if (r.success) setRows(r.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(a: Area) {
    setForm(a);
    setEditingId(a.id_area);
    setShowForm(true);
    setMsg('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r =
      editingId == null
        ? await post('/admin/area', form)
        : await put(`/admin/area/${editingId}`, form);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(empty);
      setEditingId(null);
      load();
    }
  }

  async function remove(id: number) {
    if (!confirm('Hapus area ini?')) return;
    const r = await del(`/admin/area/${id}`);
    setMsg(r.message);
    if (r.success) load();
  }

  function set<K extends keyof Area>(k: K, v: Area[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Area</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Area
        </button>
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Area`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid">
            <label>
              Nama Area
              <input value={form.nama_area} onChange={(e) => set('nama_area', e.target.value)} />
            </label>
            <label>
              Alamat
              <input value={form.alamat ?? ''} onChange={(e) => set('alamat', e.target.value)} />
            </label>
            <label>
              Kota
              <input value={form.kota ?? ''} onChange={(e) => set('kota', e.target.value)} />
            </label>
            <label>
              Kode Pos
              <input value={form.kode_pos ?? ''} onChange={(e) => set('kode_pos', e.target.value)} />
            </label>
            <label>
              PBJT (%)
              <IntInput
                value={form.pbjt == null ? '' : String(form.pbjt)}
                onChange={(v) => set('pbjt', v === '' ? 0 : Number(v))}
                placeholder="0"
                maxDigits={3}
              />
            </label>
            <UploadField value={form.foto} onChange={(url) => set('foto', url)} label="Foto" folder="area" />
          </div>
          <p className="mb-4 text-xs text-slate-400">
            PBJT-TL adalah pajak daerah atas tenaga listrik (UU HKPD). PPJ/PJU sudah dilebur ke sini.
            Tarif berlaku untuk seluruh chargebox di area ini; <strong>0</strong> berarti tidak dikenakan.
          </p>
          <div className="row">
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

      <DataTable
        data={rows}
        rowKey={(a) => a.id_area}
        searchPlaceholder="Cari area…"
        columns={[
          { header: 'ID', value: (a) => a.id_area, render: (a) => a.id_area },
          { header: 'Nama', value: (a) => a.nama_area, render: (a) => a.nama_area },
          { header: 'Alamat', value: (a) => a.alamat ?? '', render: (a) => a.alamat ?? '-' },
          { header: 'Kota', value: (a) => a.kota ?? '', render: (a) => a.kota ?? '-' },
          { header: 'Kode Pos', value: (a) => a.kode_pos ?? '', render: (a) => a.kode_pos ?? '-' },
          {
            header: 'PBJT',
            value: (a) => Number(a.pbjt ?? 0),
            render: (a) => `${Number(a.pbjt ?? 0)}%`,
          },
          {
            header: 'Aksi',
            render: (a) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(a)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="danger" onClick={() => remove(a.id_area)}>
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
