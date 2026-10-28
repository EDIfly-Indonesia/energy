import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import IntInput from '../components/IntInput';
import UploadField from '../components/UploadField';
import { uploadPreviewUrl } from '../api';

/**
 * Iklan promo (t_promo_iklan) — materi yang tampil di aplikasi mobile.
 * Endpoint: /admin/promo/:id/iklan (API-PROMO.md §6).
 *
 * Batas tayang dihitung PER PENGGUNA per hari, bukan global. Angka
 * "tayang hari ini" di sini adalah total semua pengguna (monitoring admin),
 * jadi bisa terlihat lebih besar dari batas — itu normal.
 */
interface PromoRingkas {
  id_promo: number;
  kode_promo: string;
  nama: string;
  aktif: boolean;
}

interface Iklan {
  id_iklan: number;
  id_promo: number;
  foto: string;
  judul: string | null;
  target_url: string | null;
  maks_tayang_per_hari: number | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  urutan: number;
  aktif: boolean;
  tayang_hari_ini: number;
}

interface FormState {
  foto: string | null;
  judul: string;
  target_url: string;
  maks_tayang_per_hari: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  urutan: string;
  aktif: boolean;
}

const empty = (): FormState => ({
  foto: null,
  judul: '',
  target_url: '',
  maks_tayang_per_hari: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  urutan: '0',
  aktif: true,
});

export default function PromoIklanPage() {
  const [promo, setPromo] = useState<PromoRingkas[]>([]);
  const [idPromo, setIdPromo] = useState<string>('');
  const [rows, setRows] = useState<Iklan[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
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
    const r = await get<Iklan[]>(`/admin/promo/${id}/iklan`);
    if (r.success) setRows(r.data);
    else setMsg(r.message);
  }

  useEffect(() => {
    load(idPromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPromo]);

  const promoAktif = promo.find((p) => String(p.id_promo) === idPromo);

  function openNew() {
    if (!idPromo) {
      setMsg('Pilih promo terlebih dahulu.');
      return;
    }
    setForm(empty());
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(i: Iklan) {
    setForm({
      foto: i.foto,
      judul: i.judul ?? '',
      target_url: i.target_url ?? '',
      maks_tayang_per_hari: i.maks_tayang_per_hari == null ? '' : String(i.maks_tayang_per_hari),
      tanggal_mulai: i.tanggal_mulai ?? '',
      tanggal_selesai: i.tanggal_selesai ?? '',
      urutan: String(i.urutan ?? 0),
      aktif: i.aktif,
    });
    setEditingId(i.id_iklan);
    setShowForm(true);
    setMsg('');
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.foto) {
      setMsg('Foto wajib dipilih atau diunggah.');
      return;
    }
    setSaving(true);
    setMsg('');

    const payload = {
      foto: form.foto,
      judul: form.judul.trim() || null,
      target_url: form.target_url.trim() || null,
      maks_tayang_per_hari:
        form.maks_tayang_per_hari.trim() === '' ? null : Number(form.maks_tayang_per_hari),
      tanggal_mulai: form.tanggal_mulai || null,
      tanggal_selesai: form.tanggal_selesai || null,
      urutan: Number(form.urutan) || 0,
      aktif: form.aktif,
    };

    const r =
      editingId == null
        ? await post(`/admin/promo/${idPromo}/iklan`, payload)
        : await put(`/admin/promo-iklan/${editingId}`, payload);

    setSaving(false);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setEditingId(null);
      load(idPromo);
    }
  }

  async function nonaktifkan(i: Iklan) {
    if (!confirm(`Nonaktifkan iklan "${i.judul || i.foto}"?`)) return;
    const r = await del(`/admin/promo-iklan/${i.id_iklan}`);
    setMsg(r.message);
    if (r.success) load(idPromo);
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Iklan Promo</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Iklan
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Iklan tampil di aplikasi mobile selama promo masih punya budget. Batas tayang
        dihitung <strong>per pengguna per hari</strong>; angka &ldquo;tayang hari ini&rdquo;
        di bawah adalah total seluruh pengguna.
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
        {promoAktif && !promoAktif.aktif && (
          <p className="text-xs text-amber-400">
            Promo ini nonaktif — iklannya tidak akan tampil di aplikasi.
          </p>
        )}
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Iklan`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <div className="col-span-2">
              <UploadField
                value={form.foto}
                onChange={(v) => set('foto', v)}
                label="Foto Iklan"
                folder="promo"
              />
            </div>

            <label>
              Judul
              <input
                value={form.judul}
                maxLength={150}
                onChange={(e) => set('judul', e.target.value)}
                placeholder="mis. Promo BYD"
              />
            </label>

            <label>
              URL Tujuan (opsional)
              <input
                value={form.target_url}
                onChange={(e) => set('target_url', e.target.value)}
                placeholder="https://…"
              />
            </label>

            <label>
              Maks Tayang per Hari (per pengguna)
              <IntInput
                value={form.maks_tayang_per_hari}
                onChange={(v) => set('maks_tayang_per_hari', v)}
                maxDigits={3}
                placeholder="kosong = tanpa batas"
              />
            </label>

            <label>
              Urutan
              <IntInput
                value={form.urutan}
                onChange={(v) => set('urutan', v)}
                maxDigits={3}
                placeholder="0"
              />
            </label>

            <label>
              Tayang Mulai (opsional)
              <input
                type="date"
                value={form.tanggal_mulai}
                onChange={(e) => set('tanggal_mulai', e.target.value)}
              />
            </label>

            <label>
              Tayang Sampai (opsional)
              <input
                type="date"
                value={form.tanggal_selesai}
                onChange={(e) => set('tanggal_selesai', e.target.value)}
              />
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
          rowKey={(i) => i.id_iklan}
          searchPlaceholder="Cari iklan…"
          columns={[
            {
              header: 'Foto',
              render: (i) => {
                const url = uploadPreviewUrl('promo', i.foto);
                return url ? (
                  <img
                    src={url}
                    alt={i.judul ?? ''}
                    style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 6 }}
                  />
                ) : (
                  '-'
                );
              },
            },
            { header: 'Judul', value: (i) => i.judul ?? '', render: (i) => i.judul || '-' },
            {
              header: 'Batas/Hari',
              value: (i) => i.maks_tayang_per_hari ?? 999,
              render: (i) => (i.maks_tayang_per_hari == null ? 'tanpa batas' : i.maks_tayang_per_hari),
            },
            {
              header: 'Tayang Hari Ini',
              value: (i) => i.tayang_hari_ini,
              render: (i) => (
                <span title="Total semua pengguna, bukan per pengguna">{i.tayang_hari_ini}</span>
              ),
            },
            {
              header: 'Urutan',
              value: (i) => i.urutan,
              render: (i) => i.urutan,
            },
            {
              header: 'Status',
              value: (i) => (i.aktif ? 'Aktif' : 'Nonaktif'),
              render: (i) =>
                i.aktif ? (
                  <span className="text-emerald-400">Aktif</span>
                ) : (
                  <span className="text-slate-400">Nonaktif</span>
                ),
            },
            {
              header: 'Aksi',
              render: (i) => (
                <div className="row">
                  <button className="ghost" onClick={() => openEdit(i)}>
                    <Pencil size={16} /> Ubah
                  </button>
                  <button className="danger" onClick={() => nonaktifkan(i)}>
                    <Trash2 size={16} /> Nonaktifkan
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <p className="text-slate-400">Pilih promo untuk melihat iklannya.</p>
      )}
      {msg && !showForm && <p className="msg">{msg}</p>}
    </div>
  );
}
