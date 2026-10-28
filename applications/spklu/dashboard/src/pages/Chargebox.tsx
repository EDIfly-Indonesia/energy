import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api';
import { Plus, Pencil, Trash2, X, Save, Plug, RefreshCw } from 'lucide-react';
import UploadField from '../components/UploadField';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';
import MapPicker from '../components/MapPicker';
import DataTable from '../components/DataTable';
import ConnectorTypeSelect from '../components/ConnectorTypeSelect';
import ConnectorIcon from '../components/ConnectorIcon';
import IntInput from '../components/IntInput';
import { connectorTypeInfo } from '../connectorTypes';

interface ChargeboxRow {
  id: number;
  chargebox_id: string;
  nama_chargebox: string;
  last_ping: string | null;
  mitra: string | null;
  jumkonektor: number;
  nama_area: string | null;
  alamat: string | null;
}

interface Chargebox {
  id_chargebox: number;
  chargebox_id: string;
  nama_chargebox: string;
  deskripsi: string | null;
  jenis: string;
  id_mitra: number;
  lat: string | null;
  lng: string | null;
  id_area: number;
  ocpp_protocol: string;
  vendor: string | null;
  model: string | null;
  serial_number: string | null;
  is_ppn: number;
  is_pbjt: number;
  pju: number;
  is_public: number;
  is_active: number;
  fasilitas: unknown;
  foto: unknown;
}

interface Connector {
  id: number;
  chargebox_id: string;
  connector_id: number;
  electric_power: string | number | null;
  connector_type: string | null;
  harga_perkwh: number;
  harga_perjam: number;
  kelas_layanan: string | null;
}

interface ConnCtx {
  chargebox_id: string;
  name: string;
}

interface NewConnector {
  electric_power: string;
  connector_type: string;
  harga_perkwh: string;
  harga_perjam: string;
  kelas_layanan: string;
}

const emptyConnector: NewConnector = {
  electric_power: '',
  connector_type: '',
  harga_perkwh: '',
  harga_perjam: '',
  kelas_layanan: '',
};

// Kelas layanan -> biaya per sesi (t_biaya 'layanan_<kelas>').
const KELAS_LAYANAN: { value: string; label: string }[] = [
  { value: '', label: '— Tanpa kelas (tanpa biaya layanan) —' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast Charging' },
  { value: 'ultra_fast', label: 'Ultra Fast Charging' },
];

interface MitraOpt {
  id: number;
  name: string;
}

interface AreaOpt {
  id_area: number;
  nama_area: string;
}

const emptyForm: Chargebox = {
  id_chargebox: 0,
  chargebox_id: '',
  nama_chargebox: '',
  deskripsi: '',
  jenis: 'car',
  id_mitra: 0,
  lat: '',
  lng: '',
  id_area: 0,
  ocpp_protocol: 'ocpp1.6J',
  vendor: '',
  model: '',
  serial_number: '',
  is_ppn: 0,
  is_pbjt: 0,
  pju: 0,
  is_public: 1,
  is_active: 1,
  fasilitas: null,
  foto: null,
};

export default function Chargebox() {
  const [rows, setRows] = useState<ChargeboxRow[]>([]);
  const [form, setForm] = useState<Chargebox>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [conn, setConn] = useState<ConnCtx | null>(null);
  const [mitraList, setMitraList] = useState<MitraOpt[]>([]);
  const [areaList, setAreaList] = useState<AreaOpt[]>([]);
  const [adding, setAdding] = useState(false);
  const [newConn, setNewConn] = useState<NewConnector>(emptyConnector);

  async function load() {
    const r = await get<ChargeboxRow[]>('/admin/chargebox');
    if (r.success) setRows(r.data);
  }

  useEffect(() => {
    load();
    get<MitraOpt[]>('/admin/mitra').then((r) => r.success && setMitraList(r.data));
    get<AreaOpt[]>('/admin/area').then((r) => r.success && setAreaList(r.data));
  }, []);

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMsg('');
  }

  async function openEdit(id: number) {
    const r = await get<Chargebox>(`/admin/chargebox/${id}`);
    if (r.success) {
      setForm(r.data);
      setEditingId(id);
      setShowForm(true);
      setMsg('');
    } else {
      setMsg(r.message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const isCreate = editingId == null;
    const r = isCreate
      ? await post<{ id_chargebox: number; chargebox_id: string }>('/admin/chargebox', form)
      : await put<{ id_chargebox: number; chargebox_id: string }>(`/admin/chargebox/${editingId}`, form);
    // Saat tambah, tampilkan Chargebox ID yang dibuat otomatis oleh server.
    setMsg(
      r.success && isCreate && r.data?.chargebox_id
        ? `${r.message} — Chargebox ID: ${r.data.chargebox_id}`
        : r.message
    );
    if (r.success) {
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    }
  }

  async function remove(id: number) {
    if (!confirm('Hapus chargebox ini?')) return;
    const r = await del(`/admin/chargebox/${id}`);
    setMsg(r.message);
    if (r.success) load();
  }

  async function openConnectors(row: ChargeboxRow) {
    // The connector endpoints key on the STRING chargebox_id (e.g. EZ30931),
    // not the numeric id_chargebox — using row.id silently returns zero rows.
    const r = await get<Connector[]>(`/admin/chargebox/${row.chargebox_id}/connector`);
    if (r.success) {
      setConnectors(r.data);
      setConn({ chargebox_id: row.chargebox_id, name: row.nama_chargebox });
      setAdding(false);
      setMsg('');
    } else {
      setMsg(r.message);
    }
  }

  async function refreshConnectors() {
    if (!conn) return;
    const r = await get<Connector[]>(`/admin/chargebox/${conn.chargebox_id}/connector`);
    if (r.success) setConnectors(r.data);
  }

  async function saveConnector(c: Connector) {
    const r = await put(`/admin/connector/${c.id}`, c);
    setMsg(r.message);
    if (r.success) refreshConnectors();
  }

  // Next connector number for display only — the server assigns it atomically
  // (MAX(connector_id)+1) so two admins adding at once can't collide.
  function nextConnectorId(): number {
    return connectors.reduce((max, c) => Math.max(max, Number(c.connector_id) || 0), 0) + 1;
  }

  async function addConnector() {
    if (!conn) return;
    const r = await post(`/admin/chargebox/${conn.chargebox_id}/connector`, {
      electric_power: newConn.electric_power === '' ? null : Number(newConn.electric_power),
      connector_type: newConn.connector_type.trim() === '' ? null : newConn.connector_type.trim(),
      harga_perkwh: Number(newConn.harga_perkwh) || 0,
      harga_perjam: Number(newConn.harga_perjam) || 0,
      kelas_layanan: newConn.kelas_layanan || null,
    });
    setMsg(r.message);
    if (r.success) {
      setAdding(false);
      setNewConn(emptyConnector);
      await refreshConnectors();
      load();
    }
  }

  async function removeConnector(c: Connector) {
    if (!conn) return;
    if (!confirm(`Hapus konektor #${c.connector_id} dari ${conn.name}?`)) return;
    const r = await del(`/admin/connector/${c.id}`);
    setMsg(r.message);
    if (r.success) {
      await refreshConnectors();
      load();
    }
  }

  function set<K extends keyof Chargebox>(k: K, v: Chargebox[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onMapChange(lat: string, lng: string) {
    setForm((f) => ({ ...f, lat, lng }));
  }

  // Include the current value as an option if it isn't in the list, so an
  // out-of-list id (e.g. soft-deleted mitra) still renders instead of resetting.
  function mitraOptions() {
    const cur = form.id_mitra;
    const has = mitraList.some((m) => m.id === cur);
    return has || cur === 0
      ? mitraList
      : [{ id: cur, name: `Mitra #${cur}` }, ...mitraList];
  }

  function areaOptions() {
    const cur = form.id_area;
    const has = areaList.some((a) => a.id_area === cur);
    return has || cur === 0
      ? areaList
      : [{ id_area: cur, nama_area: `Area #${cur}` }, ...areaList];
  }

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Chargebox</h1>
        <button className="ml-8" onClick={openNew}>
          <Plus size={16} /> Tambah Chargebox
        </button>
      </div>

      <Modal
        open={showForm}
        title={`${editingId == null ? 'Tambah' : 'Ubah'} Chargebox`}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <div className="grid-2">
            <label>
              Chargebox ID
              <input
                readOnly
                value={form.chargebox_id}
                placeholder="Otomatis (EZ + 5 digit)"
                title={
                  editingId == null
                    ? 'Dibuat otomatis oleh sistem saat disimpan'
                    : 'Chargebox ID tidak dapat diubah'
                }
              />
            </label>
            <label>
              Nama
              <input value={form.nama_chargebox} onChange={(e) => set('nama_chargebox', e.target.value)} />
            </label>
            <label>
              Deskripsi
              <input value={form.deskripsi ?? ''} onChange={(e) => set('deskripsi', e.target.value)} />
            </label>
            <label>
              Jenis
              <select value={form.jenis} onChange={(e) => set('jenis', e.target.value)}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
            </label>
            <label>
              Mitra
              <select
                value={form.id_mitra}
                onChange={(e) => set('id_mitra', Number(e.target.value))}
              >
                <option value={0}>— Pilih Mitra —</option>
                {mitraOptions().map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area
              <select
                value={form.id_area}
                onChange={(e) => set('id_area', Number(e.target.value))}
              >
                <option value={0}>— Pilih Area —</option>
                {areaOptions().map((a) => (
                  <option key={a.id_area} value={a.id_area}>
                    {a.nama_area}
                  </option>
                ))}
              </select>
            </label>
            <label>
              OCPP Protocol
              <select value={form.ocpp_protocol} onChange={(e) => set('ocpp_protocol', e.target.value)}>
                <option value="non_ocpp">Non-OCPP</option>
                <option value="ocpp1.6J">OCPP 1.6J</option>
                <option value="ocpp2.0">OCPP 2.0</option>
                <option value="ocpp2.0.1">OCPP 2.0.1</option>
              </select>
            </label>
            <label>
              Vendor
              <input value={form.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} />
            </label>
            <label>
              Model
              <input value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} />
            </label>
            <label>
              Serial Number
              <input value={form.serial_number ?? ''} onChange={(e) => set('serial_number', e.target.value)} />
            </label>
            <label>
              PJU (tidak dipakai)
              <IntInput
                value={String(form.pju ?? '')}
                onChange={(v) => set('pju', v === '' ? 0 : Number(v))}
                placeholder="0"
              />
            </label>
            <UploadField
              value={typeof form.foto === 'string' ? form.foto : null}
              onChange={(url) => set('foto', url)}
              label="Foto"
              folder="chargebox"
            />
          </div>

          <div className="map-wrap">
            <span>Lokasi</span>
            <MapPicker lat={form.lat} lng={form.lng} onChange={onMapChange} />
            <div className="grid latlng">
              <label>
                Latitude
                <input
                  value={form.lat ?? ''}
                  onChange={(e) => set('lat', e.target.value)}
                  inputMode="decimal"
                  placeholder="-6.2000000"
                />
              </label>
              <label>
                Longitude
                <input
                  value={form.lng ?? ''}
                  onChange={(e) => set('lng', e.target.value)}
                  inputMode="decimal"
                  placeholder="106.8166667"
                />
              </label>
            </div>
          </div>

          <div className="toggle-row">
            <Toggle label="PPN" checked={form.is_ppn === 1} onChange={(v) => set('is_ppn', v ? 1 : 0)} />
            <Toggle label="PBJT" checked={form.is_pbjt === 1} onChange={(v) => set('is_pbjt', v ? 1 : 0)} />
            <Toggle label="Publik" checked={form.is_public === 1} onChange={(v) => set('is_public', v ? 1 : 0)} />
            <Toggle label="Aktif" checked={form.is_active === 1} onChange={(v) => set('is_active', v ? 1 : 0)} />
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

      {/* Konektor dalam modal tersendiri agar tidak menumpuk di atas daftar
          chargebox. Satu modal, dua tampilan: daftar dan form tambah. */}
      <Modal
        open={conn != null}
        title={
          conn
            ? adding
              ? `Tambah Konektor — ${conn.name} (${conn.chargebox_id})`
              : `Konektor — ${conn.name} (${conn.chargebox_id})`
            : 'Konektor'
        }
        onClose={() => {
          setConn(null);
          setAdding(false);
        }}
      >
        {conn && !adding && (
          <div className="flex flex-col gap-4">
            <div className="row justify-between">
              <span className="text-sm text-slate-400">
                {connectors.length} konektor terdaftar
              </span>
              <div className="row">
                <button
                  onClick={() => {
                    setAdding(true);
                    setNewConn(emptyConnector);
                    setMsg('');
                  }}
                >
                  <Plus size={16} /> Tambah Konektor
                </button>
                <button className="ghost" onClick={refreshConnectors}>
                  <RefreshCw size={16} /> Muat
                </button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Daya (kW)</th>
                  <th>Tipe</th>
                  <th>Kelas</th>
                  <th>Harga/kWh</th>
                  <th>Harga/Jam</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {connectors.map((c) => (
                  <ConnectorRow key={c.id} c={c} onSave={saveConnector} onDelete={removeConnector} />
                ))}
                {connectors.length === 0 && (
                  <tr>
                    <td colSpan={7}>Tidak ada konektor</td>
                  </tr>
                )}
              </tbody>
            </table>
            {msg && <p className="msg">{msg}</p>}
          </div>
        )}

        {conn && adding && (
          <div className="flex flex-col gap-4">
            <div className="grid-2">
              <label>
                Daya (kW)
                <IntInput
                  value={newConn.electric_power}
                  onChange={(v) => setNewConn({ ...newConn, electric_power: v })}
                  placeholder="mis. 7 / 30 / 60"
                  maxDigits={4}
                />
              </label>
              <label>
                Tipe Konektor
                <ConnectorTypeSelect
                  value={newConn.connector_type}
                  onChange={(v) => setNewConn({ ...newConn, connector_type: v })}
                />
              </label>
              <label>
                Harga / kWh
                <IntInput
                  value={newConn.harga_perkwh}
                  onChange={(v) => setNewConn({ ...newConn, harga_perkwh: v })}
                  placeholder="0"
                />
              </label>
              <label>
                Harga / Jam
                <IntInput
                  value={newConn.harga_perjam}
                  onChange={(v) => setNewConn({ ...newConn, harga_perjam: v })}
                  placeholder="0"
                />
              </label>
              <label>
                Kelas Layanan
                <select
                  value={newConn.kelas_layanan}
                  onChange={(e) => setNewConn({ ...newConn, kelas_layanan: e.target.value })}
                >
                  {KELAS_LAYANAN.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="connector-info">
              Kelas layanan menentukan biaya per sesi (Normal 0 · Fast 25000 · Ultra Fast 57000,
              diatur di menu <strong>Biaya</strong>). Pilih &quot;Tanpa kelas&quot; bila konektor ini
              tidak dikenakan biaya layanan.
            </p>

            {connectorTypeInfo(newConn.connector_type) && (
              <p className="connector-info">
                <ConnectorIcon
                  value={newConn.connector_type}
                  size={15}
                  className="mr-1 inline align-text-bottom"
                />
                <strong>{newConn.connector_type}</strong> — Arus:{' '}
                {connectorTypeInfo(newConn.connector_type)!.arus}
                <br />
                {connectorTypeInfo(newConn.connector_type)!.keterangan}
              </p>
            )}

            <p className="connector-info">
              Nomor konektor berikutnya: <strong>#{nextConnectorId()}</strong>
              {' · '}Daya diisi dalam <strong>kW</strong> (bilangan bulat), maksimal 1000 kW.
              Contoh: AC 7, DC 30 atau 60.
            </p>

            <div className="row mt-1">
              <button onClick={addConnector}>
                <Save size={16} /> Simpan
              </button>
              <button
                className="cancel"
                onClick={() => {
                  setAdding(false);
                  setMsg('');
                }}
              >
                <X size={16} /> Batal
              </button>
            </div>
            {msg && <p className="msg">{msg}</p>}
          </div>
        )}
      </Modal>

      <DataTable
        data={rows}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari chargebox…"
        columns={[
          { header: 'ID', value: (r) => r.chargebox_id, render: (r) => r.chargebox_id },
          { header: 'Nama', value: (r) => r.nama_chargebox, render: (r) => r.nama_chargebox },
          { header: 'Mitra', value: (r) => r.mitra ?? '', render: (r) => r.mitra ?? '-' },
          { header: 'Area', value: (r) => r.nama_area ?? '', render: (r) => r.nama_area ?? '-' },
          { header: 'Konektor', value: (r) => r.jumkonektor, render: (r) => r.jumkonektor },
          {
            header: 'Last Ping',
            value: (r) => r.last_ping ?? '',
            render: (r) => (r.last_ping ? new Date(r.last_ping).toLocaleString('id-ID') : '-'),
          },
          {
            header: 'Aksi',
            render: (r) => (
              <div className="row">
                <button className="ghost" onClick={() => openEdit(r.id)}>
                  <Pencil size={16} /> Ubah
                </button>
                <button className="ghost" onClick={() => openConnectors(r)}>
                  <Plug size={16} /> Konektor
                </button>
                <button className="danger" onClick={() => remove(r.id)}>
                  <Trash2 size={16} /> Hapus
                </button>
              </div>
            ),
          },
        ]}
      />
      {msg && !showForm && !conn && <p className="msg">{msg}</p>}
    </div>
  );
}

function ConnectorRow({
  c,
  onSave,
  onDelete,
}: {
  c: Connector;
  onSave: (c: Connector) => void;
  onDelete: (c: Connector) => void;
}) {
  // Draft disimpan sebagai string agar input kosong tetap kosong (bukan 0) dan
  // supaya koma/titik tidak pernah lolos ke Number().
  const [draft, setDraft] = useState({
    id: c.id,
    connector_id: c.connector_id,
    chargebox_id: c.chargebox_id,
    connector_type: c.connector_type,
    electric_power: c.electric_power == null ? '' : String(c.electric_power),
    harga_perkwh: c.harga_perkwh == null ? '' : String(c.harga_perkwh),
    harga_perjam: c.harga_perjam == null ? '' : String(c.harga_perjam),
    kelas_layanan: c.kelas_layanan ?? '',
  });

  function save() {
    onSave({
      id: draft.id,
      connector_id: draft.connector_id,
      chargebox_id: draft.chargebox_id,
      connector_type: draft.connector_type,
      electric_power: draft.electric_power === '' ? null : Number(draft.electric_power),
      harga_perkwh: Number(draft.harga_perkwh) || 0,
      harga_perjam: Number(draft.harga_perjam) || 0,
      kelas_layanan: draft.kelas_layanan || null,
    });
  }

  return (
    <tr>
      <td>{c.connector_id}</td>
      <td>
        <IntInput
          value={draft.electric_power == null ? '' : String(draft.electric_power)}
          onChange={(v) => setDraft({ ...draft, electric_power: v })}
          maxDigits={4}
        />
      </td>
      <td>
        <ConnectorTypeSelect
          value={draft.connector_type ?? ''}
          onChange={(v) => setDraft({ ...draft, connector_type: v })}
          detailed={false}
        />
      </td>
      <td>
        <select
          value={draft.kelas_layanan}
          onChange={(e) => setDraft({ ...draft, kelas_layanan: e.target.value })}
        >
          {KELAS_LAYANAN.map((k) => (
            <option key={k.value} value={k.value}>
              {k.value === '' ? '—' : k.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <IntInput
          value={draft.harga_perkwh == null ? '' : String(draft.harga_perkwh)}
          onChange={(v) => setDraft({ ...draft, harga_perkwh: v })}
        />
      </td>
      <td>
        <IntInput
          value={draft.harga_perjam == null ? '' : String(draft.harga_perjam)}
          onChange={(v) => setDraft({ ...draft, harga_perjam: v })}
        />
      </td>
      <td>
        <div className="row">
          <button className="ghost" onClick={save}>
            <Save size={16} /> Simpan
          </button>
          <button className="danger" onClick={() => onDelete(c)}>
            <Trash2 size={16} /> Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
