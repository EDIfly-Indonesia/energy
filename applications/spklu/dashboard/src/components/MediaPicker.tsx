import { useEffect, useRef, useState } from 'react';
import { listMedia, uploadFile, type MediaItem } from '../api';
import Modal from './Modal';
import { Upload } from 'lucide-react';

interface Props {
  open: boolean;
  folder: string;
  onClose: () => void;
  onSelect: (filename: string) => void;
}

/**
 * Picker gambar dari media library. Menampilkan gambar pada satu folder
 * (sesuai konteks field — mis. `chargebox` atau `berita/foto`) supaya nilai
 * yang tersimpan tetap berupa nama file di folder yang benar (kontrak mobile).
 * Admin bisa memilih file yang sudah ada atau meng-upload file baru langsung.
 */
export default function MediaPicker({ open, folder, onClose, onSelect }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await listMedia(folder);
    if (r.success) setItems(r.data);
    else setMsg(r.message);
  }

  useEffect(() => {
    if (open) {
      setSearch('');
      setMsg('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folder]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    const r = await uploadFile(file, folder);
    setBusy(false);
    if (r.success) {
      setMsg(r.message);
      await load();
    } else {
      setMsg(r.message);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.filename.toLowerCase().includes(q)) : items;

  return (
    <Modal open={open} title="Pilih dari Media" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="row items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama file…"
            className="flex-1"
          />
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button type="button" className="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload size={16} /> {busy ? 'Mengunggah…' : 'Upload'}
          </button>
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">
            {msg || 'Belum ada gambar di folder ini. Upload untuk menambah.'}
          </p>
        )}

        <div className="media-grid">
          {filtered.map((i) => (
            <button
              type="button"
              key={`${i.folder}/${i.filename}`}
              className="media-card"
              title={`${i.filename} (${i.folder})`}
              onClick={() => onSelect(i.filename)}
            >
              <img src={i.url} alt={i.filename} loading="lazy" className="media-thumb" />
              <span className="media-name">{i.filename}</span>
            </button>
          ))}
        </div>

        {msg && <p className="msg">{msg}</p>}
      </div>
    </Modal>
  );
}