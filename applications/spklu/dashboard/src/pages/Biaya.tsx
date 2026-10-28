import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import IntInput from '../components/IntInput';

/**
 * Master biaya tambahan (t_biaya) — dipakai fn_biaya_transaksi.
 * id_mitra 0 = global (berlaku semua mitra). Pajak (PPN, PBJT-TL) BUKAN di sini.
 */
interface Biaya {
  id_biaya: number;
  kode_biaya: string;
  nama_biaya: string;
  id_mitra: number;
  jenis_biaya: string;
  default_biaya: number;
  nama_mitra: string | null;
}

interface FormState {
  kode_biaya: string;
  nama_biaya: string;
  id_mitra: string;
  jenis_biaya: string;
  default_biaya: string;
}

const KODE_SISTEM = ['admin_platform', 'layanan_normal', 'layanan_fast', 'layanan_ultra_fast'];

const empty = (): FormState => ({
  kode_biaya: '',
  nama_biaya: '',
  id_mitra: '0',
  jenis_biaya: 'pertransaksi',
  default_biaya: '0',
});

function rp(v: number | string | null): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export default function BiayaPage() {
  const [rows, setRows] = useState<Biaya[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingKode, setEditingKode] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await get<Biaya[]>('/admin/biaya');
    if (r.success) setRows(r.data);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(empty());
    setEditingId(null);
    setEditingKode('');
    setShowForm(true);
    setMsg('');
  }

  function openEdit(b: Biaya) {
    setForm({
      kode_biaya: b.kode_biaya ?? '',
      nama_biaya: b.nama_biaya ?? '',
      id_mitra: String(b.id_mitra ?? 0),
      jenis_biaya: b.jenis_biaya ?? 'pertransaksi',
      default_biaya: String(b.default_biaya ?? 0),
    });
    setEditingId(b.id_biaya);
    setEditingKode(b.kode_biaya ?? '');
    setShowForm(true);
    setMsg('');
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      kode_biaya: form.kode_biaya.trim().toLowerCase(),
      nama_biaya: form.nama_biaya.trim(),
      id_mitra: Number(form.id_mitra) || 0,
      jenis_biaya: form.jenis_biaya,
      default_biaya: form.default_biaya === '' ? 0 : Number(form.default_biaya),
    };
    const r = editingId == null
      ? await post('/admin/biaya', payload)
      : await put(`/admin/biaya/${editingId}`, payload);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(empty());
      setEditingId(null);
      load();
    }
  }

  async function remove(b: Biaya) {
    if (!confirm(`Hapus biaya "${b.nama_biaya}" (${b.kode_biaya})?`)) return;
    const r = await del(`/admin/biaya/${b.id_biaya}`);
    setMsg(r.message);
    if (r.success) load();
  }

  // Kode yang dipakai mesin hitung tidak boleh diubah namanya di sisi kode.
  const kodeTerkunci = editingId != null && KODE_SISTEM.includes(editingKode);

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Biaya</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Biaya
        </button>
      </div>

      <p className="mb-4 text-xs text-slate-400">
        Master biaya tambahan yang dipakai perhitungan tagihan. ID Mitra <strong>0</strong> berarti
        berlaku untuk semua mitra. Pajak (PPN &amp; PBJT-TL) diatur terpisah: PPN di Setting,
        PBJT-TL per Area.
      </p>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Biaya`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Kode Biaya
              <input
                value={form.kode_biaya}
                readOnly={kodeTerkunci}
                onChange={(e) => set('kode_biaya', e.target.value)}
                placeholder="mis. layanan_fast"
                title={kodeTerkunci ? 'Kode sistem tidak dapat diubah' : 'Huruf kecil, angka, garis bawah'}
              />
            </label>
            <label>
              Nama
              <input
                value={form.nama_biaya}
                onChange={(e) => set('nama_biaya', e.target.value)}
                placeholder="mis. Biaya Layanan Fast"
              />
            </label>
            <label>
              ID Mitra
              <IntInput
                value={form.id_mitra}
                onChange={(v) => set('id_mitra', v)}
                placeholder="0"
                maxDigits={6}
              />
            </label>
            <label>
              Jenis Biaya
              <select value={form.jenis_biaya} onChange={(e) => set('jenis_biaya', e.target.value)}>
                <option value="pertransaksi">Pertransaksi</option>
                <option value="perkwh">Per kWh</option>
                <option value="perjam">Per jam</option>
              </select>
            </label>
            <label>
              Nominal (Rp)
              <IntInput
                value={form.default_biaya}
                onChange={(v) => set('default_biaya', v)}
                placeholder="0"
                maxDigits={9}
              />
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

      <DataTable
        data={rows}
        rowKey={(b) => b.id_biaya}
        searchPlaceholder="Cari biaya…"
        columns={[
          { header: 'Kode', value: (b) => b.kode_biaya, render: (b) => b.kode_biaya },
          { header: 'Nama', value: (b) => b.nama_biaya, render: (b) => b.nama_biaya },
          {
            header: 'Mitra',
            value: (b) => (Number(b.id_mitra) === 0 ? 'Global' : b.nama_mitra ?? `#${b.id_mitra}`),
            render: (b) =>
              Number(b.id_mitra) === 0 ? (
                <span className="text-emerald-400">Global</span>
              ) : (
                b.nama_mitra ?? `#${b.id_mitra}`
              ),
          },
          { header: 'Jenis', value: (b) => b.jenis_biaya, render: (b) => b.jenis_biaya },
          { header: 'Nominal', value: (b) => b.default_biaya, render: (b) => rp(b.default_biaya) },
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