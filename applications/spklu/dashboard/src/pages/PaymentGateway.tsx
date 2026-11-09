import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X, Power } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import IntInput from '../components/IntInput';

/**
 * Konfigurasi Payment Gateway (t_payment_gateway).
 * Config non-rahasia dikelola di sini; SECRET tetap di .env (tidak pernah
 * ditampilkan/diedit lewat UI). Aktivasi satu gateway otomatis menonaktifkan
 * yang lain — hanya satu gateway aktif dalam satu waktu.
 */

interface CredentialKey {
  nama: string;
  terisi: boolean;
}
interface Credential {
  kunci: string[];
  status: CredentialKey[];
  lengkap: boolean;
}
interface Gateway {
  id_payment_gateway: number;
  kode_provider: string;
  nama_provider: string;
  client_id: string | null;
  is_prod: boolean;
  aktif: boolean;
  url_api: string | null;
  url_callback: string | null;
  endpoint_va: string | null;
  endpoint_qris: string | null;
  expired_menit: number;
  metadata: unknown;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
  credential: Credential;
}

interface FormState {
  kode_provider: string;
  nama_provider: string;
  client_id: string;
  is_prod: boolean;
  url_api: string;
  url_callback: string;
  endpoint_va: string;
  endpoint_qris: string;
  expired_menit: string;
  metadata: string;
  keterangan: string;
}

const empty = (): FormState => ({
  kode_provider: '',
  nama_provider: '',
  client_id: '',
  is_prod: false,
  url_api: '',
  url_callback: '',
  endpoint_va: '',
  endpoint_qris: '',
  expired_menit: '20',
  metadata: '',
  keterangan: '',
});

export default function PaymentGatewayPage() {
  const [rows, setRows] = useState<Gateway[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await get<Gateway[]>('/admin/payment-gateway');
    if (r.success) setRows(r.data);
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

  function openEdit(g: Gateway) {
    setForm({
      kode_provider: g.kode_provider ?? '',
      nama_provider: g.nama_provider ?? '',
      client_id: g.client_id ?? '',
      is_prod: g.is_prod === true,
      url_api: g.url_api ?? '',
      url_callback: g.url_callback ?? '',
      endpoint_va: g.endpoint_va ?? '',
      endpoint_qris: g.endpoint_qris ?? '',
      expired_menit: String(g.expired_menit ?? 20),
      metadata: g.metadata ? JSON.stringify(g.metadata, null, 2) : '',
      keterangan: g.keterangan ?? '',
    });
    setEditingId(g.id_payment_gateway);
    setShowForm(true);
    setMsg('');
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function buildPayload(): { error?: string; payload?: Record<string, unknown> } {
    let metadata: unknown = null;
    if (form.metadata.trim()) {
      try {
        metadata = JSON.parse(form.metadata);
      } catch {
        return { error: 'Metadata bukan JSON yang valid' };
      }
    }
    return {
      payload: {
        kode_provider: form.kode_provider.trim().toLowerCase(),
        nama_provider: form.nama_provider.trim(),
        client_id: form.client_id.trim() || null,
        is_prod: form.is_prod,
        url_api: form.url_api.trim() || null,
        url_callback: form.url_callback.trim() || null,
        endpoint_va: form.endpoint_va.trim() || null,
        endpoint_qris: form.endpoint_qris.trim() || null,
        expired_menit: form.expired_menit === '' ? 20 : Number(form.expired_menit),
        metadata,
        keterangan: form.keterangan.trim() || null,
      },
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const built = buildPayload();
    if (built.error) {
      setMsg(built.error);
      return;
    }
    const r = editingId == null
      ? await post('/admin/payment-gateway', built.payload)
      : await put(`/admin/payment-gateway/${editingId}`, built.payload);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setForm(empty());
      setEditingId(null);
      load();
    }
  }

  async function activate(g: Gateway) {
    if (!confirm(`Aktifkan gateway "${g.nama_provider}" dan nonaktifkan yang lain?`)) return;
    const r = await put(`/admin/payment-gateway/${g.id_payment_gateway}/toggle`, {});
    setMsg(r.message);
    if (r.success) load();
  }

  async function remove(g: Gateway) {
    if (!confirm(`Hapus gateway "${g.nama_provider}" (${g.kode_provider})?`)) return;
    const r = await del(`/admin/payment-gateway/${g.id_payment_gateway}`);
    setMsg(r.message);
    if (r.success) load();
  }

  function credBadge(g: Gateway) {
    if (g.credential.lengkap) {
      return <span className="text-emerald-400">Credential ✓ (di .env)</span>;
    }
    const kurang = g.credential.status.filter((s) => !s.terisi).map((s) => s.nama);
    return (
      <span className="text-amber-400" title={`Belum terisi di .env: ${kurang.join(', ')}`}>
        Credential belum lengkap
      </span>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Payment Gateway</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Gateway
        </button>
      </div>

      <p className="mb-4 text-xs text-slate-400">
        Konfigurasi provider pembayaran (DOKU / XENDIT / …). Hanya <strong>satu gateway</strong> yang
        aktif dalam satu waktu. Nilai rahasia (secret key / API key) <strong>tidak disimpan di sini</strong> —
        tetap di <code>.env</code>, di sini hanya ditampilkan status terisi/tidaknya.
      </p>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Gateway`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Kode Provider
              <input
                value={form.kode_provider}
                onChange={(e) => set('kode_provider', e.target.value)}
                placeholder="mis. doku / xendit"
                title="Huruf kecil, angka, garis bawah"
              />
            </label>
            <label>
              Nama Provider
              <input
                value={form.nama_provider}
                onChange={(e) => set('nama_provider', e.target.value)}
                placeholder="mis. DOKU"
              />
            </label>
            <label>
              Client / Merchant ID
              <input
                value={form.client_id}
                onChange={(e) => set('client_id', e.target.value)}
                placeholder="Bukan secret (mis. BRN-… / merchant id)"
              />
            </label>
            <label>
              Masa Berlaku (menit)
              <IntInput
                value={form.expired_menit}
                onChange={(v) => set('expired_menit', v)}
                placeholder="20"
                maxDigits={4}
              />
            </label>
          </div>

          <Toggle label="Mode Produksi (bukan sandbox)" checked={form.is_prod} onChange={(v) => set('is_prod', v)} />

          <div className="grid-2">
            <label>
              URL API
              <input
                value={form.url_api}
                onChange={(e) => set('url_api', e.target.value)}
                placeholder="https://api.doku.com"
              />
            </label>
            <label>
              URL Callback
              <input
                value={form.url_callback}
                onChange={(e) => set('url_callback', e.target.value)}
                placeholder="https://…/callback/va"
              />
            </label>
            <label>
              Endpoint VA
              <input
                value={form.endpoint_va}
                onChange={(e) => set('endpoint_va', e.target.value)}
                placeholder="/doku-virtual-account/v2/payment-code"
              />
            </label>
            <label>
              Endpoint QRIS
              <input
                value={form.endpoint_qris}
                onChange={(e) => set('endpoint_qris', e.target.value)}
                placeholder="/…/qris"
              />
            </label>
          </div>

          <label>
            Metadata (JSON, opsional)
            <textarea
              rows={3}
              value={form.metadata}
              onChange={(e) => set('metadata', e.target.value)}
              placeholder='{"reusable_status": false, "info1": "Biaya charging"}'
            />
          </label>

          <label>
            Keterangan
            <textarea
              rows={2}
              value={form.keterangan}
              onChange={(e) => set('keterangan', e.target.value)}
              placeholder="Catatan internal"
            />
          </label>

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
        rowKey={(g) => g.id_payment_gateway}
        searchPlaceholder="Cari provider…"
        columns={[
          {
            header: 'Provider',
            value: (g) => `${g.nama_provider} ${g.kode_provider}`,
            render: (g) => (
              <div>
                <div className="font-medium">{g.nama_provider}</div>
                <div className="text-xs text-slate-400">{g.kode_provider}</div>
              </div>
            ),
          },
          { header: 'Client ID', value: (g) => g.client_id ?? '', render: (g) => g.client_id ?? '-' },
          {
            header: 'Mode',
            value: (g) => (g.is_prod ? 'produksi' : 'sandbox'),
            render: (g) => (
              <span className={g.is_prod ? 'text-sky-400' : 'text-slate-400'}>
                {g.is_prod ? 'produksi' : 'sandbox'}
              </span>
            ),
          },
          { header: 'Credential', value: (g) => (g.credential.lengkap ? '1' : '0'), render: credBadge },
          {
            header: 'Status',
            value: (g) => (g.aktif ? 'aktif' : 'nonaktif'),
            render: (g) =>
              g.aktif ? (
                <span className="text-emerald-400 font-medium">● Aktif</span>
              ) : (
                <span className="text-slate-400">Nonaktif</span>
              ),
          },
          {
            header: 'Aksi',
            render: (g) => (
              <div className="row">
                {!g.aktif && (
                  <button className="ghost" onClick={() => activate(g)} title="Aktifkan gateway ini">
                    <Power size={16} /> Aktifkan
                  </button>
                )}
                <button className="ghost" onClick={() => openEdit(g)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="danger" onClick={() => remove(g)} disabled={g.aktif} title={g.aktif ? 'Nonaktifkan dulu sebelum hapus' : ''}>
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
