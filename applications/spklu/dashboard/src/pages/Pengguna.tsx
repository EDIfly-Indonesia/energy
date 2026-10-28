import { useEffect, useState } from 'react';
import { get, post, put } from '../api';
import { Plus, Pencil, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import IntInput from '../components/IntInput';

interface AdminUser {
  id: number;
  code: string;
  name: string;
  email: string;
  hakakses: string;
  idhakakses: number;
  id_role: number;
  status: string;
  type_id: number;
}

interface Role {
  id: number;
  code: string;
}

interface FormState {
  code: string;
  name: string;
  email: string;
  password: string;
  type_id: number;
  id_role: number;
}

const emptyForm: FormState = { code: '', name: '', email: '', password: '', type_id: 1, id_role: 0 };

export default function Pengguna() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const [u, r] = await Promise.all([get<AdminUser[]>('/admin/user'), get<Role[]>('/admin/role')]);
    if (u.success) setRows(u.data);
    if (r.success) setRoles(r.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(u: AdminUser) {
    setForm({
      code: u.code,
      name: u.name,
      email: u.email,
      password: '',
      type_id: u.type_id,
      id_role: u.id_role,
    });
    setEditingId(u.id);
    setShowForm(true);
    setMsg('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r =
      editingId == null ? await post('/admin/user', form) : await put(`/admin/user/${editingId}`, form);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    }
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Pengguna</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Pengguna
        </button>
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Pengguna`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid">
            <label>
              Code (username)
              <input value={form.code} onChange={(e) => set('code', e.target.value)} disabled={editingId != null} />
            </label>
            <label>
              Nama
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            {editingId == null && (
              <label>
                Password
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
              </label>
            )}
            <label>
              Role
              <select value={form.type_id} onChange={(e) => set('type_id', Number(e.target.value))}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ID Role
              <IntInput
                value={String(form.id_role ?? '')}
                onChange={(v) => set('id_role', v === '' ? 0 : Number(v))}
                placeholder="0"
              />
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
        rowKey={(u) => u.id}
        searchPlaceholder="Cari pengguna…"
        columns={[
          { header: 'Code', value: (u) => u.code, render: (u) => u.code },
          { header: 'Nama', value: (u) => u.name, render: (u) => u.name },
          { header: 'Email', value: (u) => u.email, render: (u) => u.email },
          { header: 'Hak Akses', value: (u) => u.hakakses, render: (u) => u.hakakses },
          { header: 'Status', value: (u) => u.status, render: (u) => u.status },
          {
            header: 'Aksi',
            render: (u) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(u)}>
                  <Pencil size={16} /> Ubah
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
