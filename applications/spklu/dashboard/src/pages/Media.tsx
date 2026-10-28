import { useEffect, useRef, useState } from 'react';
import { listMedia, uploadFile, deleteMedia, type MediaItem } from '../api';
import Modal from '../components/Modal';
import { Plus, Upload, RefreshCw, X } from 'lucide-react';

const FOLDERS = ['chargebox', 'area', 'berita/foto', 'berita/video', 'fasilitas'];

/**
 * Halaman media library — pusat penyimpanan semua asset gambar yang dipakai
 * chargebox, area, dan artikel berita. Admin upload satu kali di sini, lalu
 * memilih file yang sudah ada saat membuat/mengubah chargebox atau berita.
 */
export default function Media() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folder, setFolder] = useState('all');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('chargebox');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await listMedia();
    if (r.success) {
      setItems(r.data);
      setMsg('');
    } else {
      setMsg(r.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(it: MediaItem) {
    if (!confirm(`Hapus ${it.folder}/${it.filename}?`)) return;
    const r = await deleteMedia(it.folder, it.filename);
    setMsg(r.message);
    if (r.success) load();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    const r = await uploadFile(file, uploadFolder);
    setBusy(false);
    setMsg(r.message);
    if (r.success) {
      setShowUpload(false);
      await load();
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = items.filter(
    (it) =>
      (folder === 'all' || it.folder === folder) &&
      (!q || it.filename.toLowerCase().includes(q))
  );

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1>Media</h1>
        <button className="ml-8" onClick={() => setShowUpload(true)}>
          <Plus size={16} /> Upload Gambar
        </button>
      </div>

      <div className="row mb-4 items-center">
        <select value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="all">Semua folder</option>
          {FOLDERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama file…"
          className="flex-1"
        />
        <button className="ghost" onClick={load}>
          <RefreshCw size={16} /> Muat
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-400">Tidak ada gambar{msg ? `. ${msg}` : ''}.</p>
      )}

      <div className="media-grid">
        {filtered.map((it) => (
          <div key={`${it.folder}/${it.filename}`} className="media-tile">
            <div className="img-frame">
              <img src={it.url} alt={it.filename} loading="lazy" />
              <button
                type="button"
                className="img-x"
                title="Hapus"
                aria-label={`Hapus ${it.filename}`}
                onClick={() => remove(it)}
              >
                <X size={14} />
              </button>
            </div>
            <span className="media-name" title={it.filename}>
              {it.filename}
            </span>
            <span className="media-folder">{it.folder}</span>
          </div>
        ))}
      </div>
      {msg && <p className="msg">{msg}</p>}

      <Modal open={showUpload} title="Upload Gambar" onClose={() => setShowUpload(false)}>
        <div className="flex flex-col gap-3">
          <label>
            Folder tujuan
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-slate-400">
            Maksimal 5 MB. Format: JPG, PNG, GIF, WebP.
          </p>
          <div className="row">
            <button onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload size={16} /> {busy ? 'Mengunggah…' : 'Pilih File'}
            </button>
            <button type="button" className="cancel" onClick={() => setShowUpload(false)}>
              <X size={16} /> Batal
            </button>
          </div>
          {msg && <p className="msg">{msg}</p>}
        </div>
      </Modal>
    </div>
  );
}