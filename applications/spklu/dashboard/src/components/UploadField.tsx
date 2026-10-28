import { useRef, useState } from 'react';
import { uploadFile, uploadPreviewUrl } from '../api';
import MediaPicker from './MediaPicker';
import { Images, Upload, X } from 'lucide-react';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
}

/**
 * Input foto untuk form admin. Alur utama sekarang MEMILIH gambar yang sudah
 * tersimpan di media library (folder sesuai konteks field), bukan meng-upload
 * ulang setiap kali. Upload tetap tersedia untuk menambah file baru ke library.
 */
export default function UploadField({ value, onChange, label = 'Foto', folder = 'chargebox' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    const r = await uploadFile(file, folder);
    setBusy(false);
    if (r.success) {
      onChange(r.data.filename);
    } else {
      setMsg(r.message);
    }
  }

  const preview = uploadPreviewUrl(folder, value);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => setPicking(true)}>
          <Images size={16} /> {value ? 'Ganti dari Media' : 'Pilih dari Media'}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} /> {busy ? 'Mengunggah…' : 'Upload'}
        </button>
        {preview && (
          <div className="img-frame" style={{ maxWidth: 280 }}>
            <img src={preview} alt={label} />
            <button
              type="button"
              className="img-x"
              title="Hapus"
              aria-label={`Hapus ${label}`}
              onClick={() => onChange(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      {msg && <p className="msg">{msg}</p>}

      <MediaPicker
        open={picking}
        folder={folder}
        onClose={() => setPicking(false)}
        onSelect={(filename) => {
          onChange(filename);
          setPicking(false);
        }}
      />
    </div>
  );
}