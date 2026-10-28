import { useEffect, useMemo, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, Save, X, Lock } from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import IntInput from '../components/IntInput';

/**
 * Promo (t_promo) — kampanye potongan yang dibiayai mitra.
 * Endpoint: /admin/promo (API-PROMO.md §5).
 *
 * Catatan penting yang ditampilkan ke admin:
 *   - Budget dalam RUPIAH, bukan kWh. Kuota kWh hanya pembatas tambahan.
 *   - Budget TIDAK boleh diturunkan di bawah yang sudah terpakai.
 *   - Kode & mitra terkunci setelah ada pemakaian (kode sudah beredar di iklan).
 *   - Klaim budget baru terjadi saat pembayaran terkonfirmasi, bukan saat order.
 */
interface Promo {
  id_promo: number;
  kode_promo: string;
  nama: string;
  jenis_mitra: string;
  nama_mitra: string;
  tipe_potongan: string;
  nilai_potongan: number;
  budget_rupiah: number;
  budget_terpakai: number;
  sisa_budget: number;
  persen_terpakai: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
  kebijakan_sisa: string;
  id_promo_lanjutan: number | null;
  jumlah_peserta: number;
  jumlah_transaksi: number;
  total_potongan: number;
}

interface MitraOption {
  id_mitra_promo: number;
  nama: string;
  kode: string;
  jenis_mitra: string;
  aktif: boolean;
}

interface FormState {
  kode_promo: string;
  id_mitra_promo: string;
  nama: string;
  deskripsi: string;
  tipe_potongan: string;
  nilai_potongan: string;
  maks_potongan: string;
  min_kwh: string;
  maks_kwh: string;
  budget_rupiah: string;
  kuota_kwh: string;
  maks_pemakaian_per_user: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  kebijakan_sisa: string;
  id_promo_lanjutan: string;
  butuh_peserta: boolean;
  cek_kendaraan: boolean;
  prioritas: string;
  aktif: boolean;
}

const TIPE = [
  { value: 'per_kwh', label: 'Potongan per kWh (Rp)' },
  { value: 'persen', label: 'Persen dari biaya energi (%)' },
  { value: 'nominal', label: 'Nominal tetap per transaksi (Rp)' },
];

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const empty = (): FormState => ({
  kode_promo: '',
  id_mitra_promo: '',
  nama: '',
  deskripsi: '',
  tipe_potongan: 'per_kwh',
  nilai_potongan: '',
  maks_potongan: '',
  min_kwh: '',
  maks_kwh: '',
  budget_rupiah: '',
  kuota_kwh: '',
  maks_pemakaian_per_user: '',
  tanggal_mulai: todayISO(),
  tanggal_selesai: plusDaysISO(30),
  kebijakan_sisa: 'hangus',
  id_promo_lanjutan: '',
  butuh_peserta: true,
  cek_kendaraan: false,
  prioritas: '100',
  aktif: true,
});

function rp(v: number | string | null): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));
}

function tgl(v: string): string {
  if (!v) return '-';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function nilaiTampil(p: Promo): string {
  if (p.tipe_potongan === 'per_kwh') return `${rp(p.nilai_potongan)}/kWh`;
  if (p.tipe_potongan === 'persen') return `${p.nilai_potongan}%`;
  return rp(p.nilai_potongan);
}

export default function PromoPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [mitra, setMitra] = useState<MitraOption[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [terkunci, setTerkunci] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [rp1, rm] = await Promise.all([
      get<Promo[]>('/admin/promo'),
      get<MitraOption[]>('/admin/promo-mitra'),
    ]);
    if (rp1.success) setRows(rp1.data);
    else setMsg(rp1.message);
    if (rm.success) setMitra(rm.data.filter((m) => m.aktif));
  }

  useEffect(() => {
    load();
  }, []);

  const mitraTerpilih = useMemo(
    () => mitra.find((m) => String(m.id_mitra_promo) === form.id_mitra_promo),
    [mitra, form.id_mitra_promo]
  );

  function openNew() {
    setForm(empty());
    setEditingId(null);
    setTerkunci(false);
    setShowForm(true);
    setMsg('');
  }

  function openEdit(p: Promo) {
    setForm({
      kode_promo: p.kode_promo,
      id_mitra_promo: '',
      nama: p.nama,
      deskripsi: '',
      tipe_potongan: p.tipe_potongan,
      nilai_potongan: String(p.nilai_potongan),
      maks_potongan: '',
      min_kwh: '',
      maks_kwh: '',
      budget_rupiah: String(p.budget_rupiah),
      kuota_kwh: '',
      maks_pemakaian_per_user: '',
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      kebijakan_sisa: p.kebijakan_sisa,
      id_promo_lanjutan: p.id_promo_lanjutan ? String(p.id_promo_lanjutan) : '',
      butuh_peserta: true,
      cek_kendaraan: false,
      prioritas: '100',
      aktif: p.aktif,
    });
    setEditingId(p.id_promo);
    setTerkunci(p.jumlah_transaksi > 0);
    setShowForm(true);
    setMsg('');

    // Detail lengkap diperlukan untuk field yang tidak ada di daftar ringkas.
    get<Record<string, unknown>>(`/admin/promo/${p.id_promo}`).then((r) => {
      if (!r.success) return;
      const d = r.data as Record<string, unknown>;
      setForm((f) => ({
        ...f,
        id_mitra_promo: String(d.id_mitra_promo ?? ''),
        deskripsi: String(d.deskripsi ?? ''),
        maks_potongan: d.maks_potongan == null ? '' : String(d.maks_potongan),
        min_kwh: d.min_kwh == null ? '' : String(d.min_kwh),
        maks_kwh: d.maks_kwh == null ? '' : String(d.maks_kwh),
        kuota_kwh: d.kuota_kwh == null ? '' : String(d.kuota_kwh),
        maks_pemakaian_per_user:
          d.maks_pemakaian_per_user == null ? '' : String(d.maks_pemakaian_per_user),
        butuh_peserta: Boolean(d.butuh_peserta),
        cek_kendaraan: Boolean(d.cek_kendaraan),
        prioritas: String(d.prioritas ?? 100),
      }));
    });
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const num = (s: string) => (s.trim() === '' ? null : Number(s));

    const payload = {
      kode_promo: form.kode_promo.trim().toUpperCase(),
      id_mitra_promo: Number(form.id_mitra_promo),
      nama: form.nama.trim(),
      deskripsi: form.deskripsi.trim() || null,
      tipe_potongan: form.tipe_potongan,
      nilai_potongan: num(form.nilai_potongan) ?? 0,
      maks_potongan: num(form.maks_potongan),
      min_kwh: num(form.min_kwh) ?? 0,
      maks_kwh: num(form.maks_kwh),
      budget_rupiah: num(form.budget_rupiah) ?? 0,
      kuota_kwh: num(form.kuota_kwh),
      maks_pemakaian_per_user: num(form.maks_pemakaian_per_user),
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      kebijakan_sisa: form.kebijakan_sisa,
      id_promo_lanjutan: num(form.id_promo_lanjutan),
      butuh_peserta: form.butuh_peserta,
      cek_kendaraan: form.cek_kendaraan,
      prioritas: num(form.prioritas) ?? 100,
      aktif: form.aktif,
    };

    const r =
      editingId == null
        ? await post('/admin/promo', payload)
        : await put(`/admin/promo/${editingId}`, payload);

    setSaving(false);
    setMsg(r.message);
    if (r.success) {
      setShowForm(false);
      setEditingId(null);
      load();
    }
  }

  async function nonaktifkan(p: Promo) {
    if (!confirm(`Nonaktifkan promo "${p.kode_promo}"?\n\nPengguna tidak bisa memakai kodenya lagi.`)) return;
    const r = await del(`/admin/promo/${p.id_promo}`);
    setMsg(r.message);
    if (r.success) load();
  }

  async function tutupPeriode(p: Promo) {
    const pesan =
      p.kebijakan_sisa === 'rollover'
        ? `Tutup periode "${p.kode_promo}"?\n\nSisa ${rp(p.sisa_budget)} akan DIPINDAHKAN ke promo lanjutan.`
        : `Tutup periode "${p.kode_promo}"?\n\nSisa ${rp(p.sisa_budget)} akan HANGUS (tidak dipindahkan).`;
    if (!confirm(pesan)) return;
    const r = await post(`/admin/promo/${p.id_promo}/tutup-periode`, {});
    setMsg(r.message);
    if (r.success) load();
  }

  const lanjutanOptions = rows.filter((p) => p.id_promo !== editingId);

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Promo</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Promo
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Budget promo diukur dalam <strong>rupiah</strong> dan berkurang saat pembayaran
        pengguna terkonfirmasi — bukan saat order dibuat. Refund sebagian tidak
        mengembalikan budget; pembatalan penuh mengembalikannya.
      </p>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Promo`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Kode Promo
              <input
                value={form.kode_promo}
                maxLength={30}
                disabled={terkunci}
                onChange={(e) => set('kode_promo', e.target.value.toUpperCase())}
                placeholder="mis. BYD2026"
              />
            </label>

            <label>
              Mitra
              <select
                value={form.id_mitra_promo}
                disabled={terkunci}
                onChange={(e) => set('id_mitra_promo', e.target.value)}
              >
                <option value="">— pilih mitra —</option>
                {mitra.map((m) => (
                  <option key={m.id_mitra_promo} value={m.id_mitra_promo}>
                    {m.nama} ({m.kode}) — {m.jenis_mitra}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {terkunci && (
            <p className="mb-4 text-xs text-amber-400">
              <Lock size={12} /> Kode dan mitra terkunci karena promo ini sudah punya
              pemakaian. Kode sudah beredar di materi iklan.
            </p>
          )}

          <label className="col-span-2">
            Nama Promo
            <input
              value={form.nama}
              maxLength={150}
              onChange={(e) => set('nama', e.target.value)}
              placeholder="mis. BYD EV Owner 2026"
            />
          </label>

          <label className="col-span-2">
            Deskripsi
            <textarea
              rows={2}
              value={form.deskripsi}
              onChange={(e) => set('deskripsi', e.target.value)}
              placeholder="Keterangan singkat promo (opsional)"
            />
          </label>

          <h3 className="mt-6 mb-3">Aturan Potongan</h3>
          <div className="grid-3">
            <label>
              Tipe Potongan
              <select
                value={form.tipe_potongan}
                onChange={(e) => set('tipe_potongan', e.target.value)}
              >
                {TIPE.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nilai Potongan
              <input
                value={form.nilai_potongan}
                inputMode="decimal"
                onChange={(e) => set('nilai_potongan', e.target.value)}
                placeholder={form.tipe_potongan === 'persen' ? 'mis. 10' : 'mis. 600'}
              />
            </label>

            <label>
              Maks Potongan (Rp)
              <IntInput
                value={form.maks_potongan}
                onChange={(v) => set('maks_potongan', v)}
                maxDigits={9}
                placeholder="opsional, mis. 200000"
              />
            </label>

            <label>
              Min kWh
              <input
                value={form.min_kwh}
                inputMode="decimal"
                onChange={(e) => set('min_kwh', e.target.value)}
                placeholder="0"
              />
            </label>

            <label>
              Maks kWh (yang dapat potongan)
              <input
                value={form.maks_kwh}
                inputMode="decimal"
                onChange={(e) => set('maks_kwh', e.target.value)}
                placeholder="opsional"
              />
            </label>

            <label>
              Prioritas
              <IntInput
                value={form.prioritas}
                onChange={(v) => set('prioritas', v)}
                maxDigits={4}
                placeholder="100"
              />
            </label>
          </div>

          <h3 className="mt-6 mb-3">Budget &amp; Kuota</h3>
          <div className="grid-3">
            <label>
              Budget (Rp) — wajib
              <IntInput
                value={form.budget_rupiah}
                onChange={(v) => set('budget_rupiah', v)}
                maxDigits={12}
                placeholder="mis. 1000000"
              />
            </label>

            <label>
              Kuota kWh — opsional
              <input
                value={form.kuota_kwh}
                inputMode="decimal"
                onChange={(e) => set('kuota_kwh', e.target.value)}
                placeholder="pembatas tambahan"
              />
            </label>

            <label>
              Maks Pemakaian per Pengguna
              <IntInput
                value={form.maks_pemakaian_per_user}
                onChange={(v) => set('maks_pemakaian_per_user', v)}
                maxDigits={4}
                placeholder="opsional"
              />
            </label>
          </div>

          <h3 className="mt-6 mb-3">Periode &amp; Kebijakan Sisa</h3>
          <div className="grid-3">
            <label>
              Tanggal Mulai
              <input
                type="date"
                value={form.tanggal_mulai}
                onChange={(e) => set('tanggal_mulai', e.target.value)}
              />
            </label>

            <label>
              Tanggal Selesai
              <input
                type="date"
                value={form.tanggal_selesai}
                onChange={(e) => set('tanggal_selesai', e.target.value)}
              />
            </label>

            <label>
              Sisa Budget
              <select
                value={form.kebijakan_sisa}
                onChange={(e) => set('kebijakan_sisa', e.target.value)}
              >
                <option value="hangus">Hangus (tidak dipindahkan)</option>
                <option value="rollover">Rollover ke promo lanjutan</option>
              </select>
            </label>

            {form.kebijakan_sisa === 'rollover' && (
              <label className="col-span-3">
                Promo Lanjutan
                <select
                  value={form.id_promo_lanjutan}
                  onChange={(e) => set('id_promo_lanjutan', e.target.value)}
                >
                  <option value="">— pilih promo tujuan —</option>
                  {lanjutanOptions.map((p) => (
                    <option key={p.id_promo} value={p.id_promo}>
                      {p.kode_promo} — {p.nama} (sisa {rp(p.sisa_budget)})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <h3 className="mt-6 mb-3">Aturan Validasi</h3>
          <div className="grid-3">
            <label>
              Wajib Peserta Terdaftar
              <select
                value={form.butuh_peserta ? '1' : '0'}
                onChange={(e) => set('butuh_peserta', e.target.value === '1')}
              >
                <option value="1">Ya — hanya peserta terdaftar</option>
                <option value="0">Tidak — siapa pun dengan kode</option>
              </select>
            </label>

            <label>
              Cek Merek Kendaraan
              <select
                value={form.cek_kendaraan ? '1' : '0'}
                disabled={mitraTerpilih ? mitraTerpilih.jenis_mitra !== 'atpm' : false}
                onChange={(e) => set('cek_kendaraan', e.target.value === '1')}
              >
                <option value="0">Tidak</option>
                <option value="1">Ya — kendaraan harus merek mitra</option>
              </select>
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

          {mitraTerpilih && mitraTerpilih.jenis_mitra !== 'atpm' && (
            <p className="mb-4 text-xs text-slate-400">
              Cek merek kendaraan hanya berlaku untuk mitra ATPM. Untuk hotel/asuransi,
              kelayakan ditentukan oleh pendaftaran peserta lewat portal.
            </p>
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
        rowKey={(p) => p.id_promo}
        searchPlaceholder="Cari promo…"
        columns={[
          { header: 'Kode', value: (p) => p.kode_promo, render: (p) => <code>{p.kode_promo}</code> },
          { header: 'Nama', value: (p) => p.nama, render: (p) => p.nama },
          {
            header: 'Mitra',
            value: (p) => p.nama_mitra,
            render: (p) => (
              <span>
                {p.nama_mitra}
                <br />
                <span className="text-xs text-slate-400">{p.jenis_mitra}</span>
              </span>
            ),
          },
          {
            header: 'Potongan',
            value: (p) => p.nilai_potongan,
            render: (p) => nilaiTampil(p),
          },
          {
            header: 'Budget',
            value: (p) => p.sisa_budget,
            render: (p) => {
              const pct = Math.min(100, Math.max(0, Number(p.persen_terpakai)));
              const warna = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
              return (
                <div style={{ minWidth: 140 }}>
                  <div className="text-xs">
                    {rp(p.sisa_budget)} <span className="text-slate-400">dari {rp(p.budget_rupiah)}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: '#1e293b',
                      borderRadius: 3,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                    title={`${pct.toFixed(1)}% terpakai`}
                  >
                    <div style={{ width: `${pct}%`, height: '100%', background: warna }} />
                  </div>
                </div>
              );
            },
          },
          {
            header: 'Periode',
            value: (p) => p.tanggal_mulai,
            render: (p) => (
              <span className="text-xs">
                {tgl(p.tanggal_mulai)}
                <br />
                s.d. {tgl(p.tanggal_selesai)}
              </span>
            ),
          },
          {
            header: 'Peserta / Transaksi',
            value: (p) => p.jumlah_transaksi,
            render: (p) => (
              <span className="text-xs">
                {p.jumlah_peserta} peserta
                <br />
                {p.jumlah_transaksi} transaksi
              </span>
            ),
          },
          {
            header: 'Status',
            value: (p) => (p.aktif ? 'Aktif' : 'Nonaktif'),
            render: (p) =>
              p.aktif ? (
                <span className="text-emerald-400">Aktif</span>
              ) : (
                <span className="text-slate-400">Nonaktif</span>
              ),
          },
          {
            header: 'Aksi',
            render: (p) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(p)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="ghost" onClick={() => tutupPeriode(p)}>
                  <Lock size={16} /> Tutup Periode
                </button>
                <button className="danger" onClick={() => nonaktifkan(p)}>
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
