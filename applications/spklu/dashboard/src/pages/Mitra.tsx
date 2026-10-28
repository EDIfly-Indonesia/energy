import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

interface Mitra {
  id: number;
  name: string;
  email: string | null;
  telp: string | null;
}

const empty: Mitra = { id: 0, name: '', email: '', telp: '' };

export default function Mitra() {
  const [rows, setRows] = useState<Mitra[]>([]);
  const [form, setForm] = useState<Mitra>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await get<Mitra[]>('/admin/mitra');
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

  function openEdit(m: Mitra) {
    setForm(m);
    setEditingId(m.id);
    setShowForm(true);
    setMsg('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r =
      editingId == null ? await post('/admin/mitra', form) : await put(`/admin/mitra/${editingId}`, form);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(empty);
      setEditingId(null);
      load();
    }
  }

  async function remove(id: number) {
    if (!confirm('Hapus mitra ini?')) return;
    const r = await del(`/admin/mitra/${id}`);
    setMsg(r.message);
    if (r.success) load();
  }

  function set<K extends keyof Mitra>(k: K, v: Mitra[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Mitra</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Mitra
        </button>
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Mitra`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid">
            <label>
              Nama
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>
              Email
              <input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label>
              No HP
              <input value={form.telp ?? ''} onChange={(e) => set('telp', e.target.value)} />
            </label>
          </div>
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
        rowKey={(m) => m.id}
        searchPlaceholder="Cari mitra…"
        columns={[
          { header: 'ID', value: (m) => m.id, render: (m) => m.id },
          { header: 'Nama', value: (m) => m.name, render: (m) => m.name },
          { header: 'Email', value: (m) => m.email ?? '', render: (m) => m.email ?? '-' },
          { header: 'No HP', value: (m) => m.telp ?? '', render: (m) => m.telp ?? '-' },
          {
            header: 'Aksi',
            render: (m) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(m)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="danger" onClick={() => remove(m.id)}>
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
