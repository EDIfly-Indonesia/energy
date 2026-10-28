import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalGet, portalPost, portalDelete } from './portal-api';

/**
 * Kelola peserta satu promo.
 *
 * FITUR UTAMA: input massal. Front office hotel mendaftarkan banyak tamu saat
 * check-in, jadi mereka butuh menempel daftar email/no. HP sekaligus — bukan
 * satu form per tamu. Satu baris = satu peserta.
 *
 * Aturan parsing (disepakati dengan backend di API-PROMO.md §8.4):
 *   - baris berisi '@'  -> dianggap email
 *   - baris angka/HP    -> dianggap no_hp
 *   - baris kosong diabaikan
 * Backend mengembalikan hasil PER BARIS (berhasil / gagal + alasan), sehingga
 * front office tahu persis baris mana yang ditolak dan kenapa.
 */
interface Promo {
  id_promo: number;
  kode_promo: string;
  nama: string;
  tipe_potongan: string;
  nilai_potongan: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
}

interface Peserta {
  id_peserta: number;
  email: string | null;
  no_hp: string | null;
  status: string;
  catatan: string | null;
  created_at: string;
}

interface HasilMassal {
  berhasil: { id_peserta: number; email: string | null; no_hp: string | null }[];
  gagal: { email?: string | null; no_hp?: string | null; alasan: string }[];
}

const ALASAN: Record<string, string> = {
  SUDAH_TERDAFTAR: 'sudah terdaftar di promo ini',
  EMAIL_ATAU_HP_KOSONG: 'baris kosong',
  GAGAL_SIMPAN: 'gagal disimpan',
};

function tgl(v: string): string {
  if (!v) return '-';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
}

export default function PortalPeserta() {
  const { id } = useParams<{ id: string }>();
  const idPromo = Number(id);

  const [promo, setPromo] = useState<Promo | null>(null);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [teks, setTeks] = useState('');
  const [catatan, setCatatan] = useState('');
  const [hasil, setHasil] = useState<HasilMassal | null>(null);
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(true);
  const [mengirim, setMengirim] = useState(false);

  async function muat() {
    if (!idPromo) {
      setPesan('Promo tidak valid.');
      setLoading(false);
      return;
    }
    const [rp, rps] = await Promise.all([
      portalGet<Promo[]>('/portal/promo'),
      portalGet<Peserta[]>(`/portal/promo/${idPromo}/peserta`),
    ]);
    if (rp.success) setPromo(rp.data.find((p) => p.id_promo === idPromo) ?? null);
    if (rps.success) setPeserta(rps.data);
    else setPesan(rps.message);
    setLoading(false);
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPromo]);

  // Pratinjau hasil parsing: pengguna melihat berapa baris yang akan dikirim
  // SEBELUM menekan tombol, sehingga salah tempel langsung ketahuan.
  const pratinjau = useMemo(() => {
    const baris = teks
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const email: string[] = [];
    const hp: string[] = [];
    // Baris yang bukan email dan bukan nomor HP wajar (mis. "abc" atau
    // "tamu satu") tetap akan dikirim sebagai no_hp oleh backend, sehingga
    // tersimpan sebagai data sampah. Ditandai di sini supaya front office
    // melihatnya SEBELUM menekan tombol.
    const ambigu: string[] = [];

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hpRe = /^[+()\-\s\d]{8,20}$/;

    for (const b of baris) {
      if (b.includes('@')) {
        if (emailRe.test(b)) email.push(b.toLowerCase());
        else ambigu.push(b);
      } else if (hpRe.test(b) && b.replace(/\D/g, '').length >= 8) {
        hp.push(b);
      } else {
        ambigu.push(b);
      }
    }
    return { total: baris.length, email, hp, ambigu, baris };
  }, [teks]);

  async function kirimMassal() {
    if (pratinjau.total === 0) {
      setPesan('Isi minimal satu email atau nomor HP.');
      return;
    }
    setMengirim(true);
    setPesan('');
    setHasil(null);

    const daftar = pratinjau.baris.map((b) =>
      b.includes('@')
        ? { email: b.toLowerCase(), catatan: catatan.trim() || undefined }
        : { no_hp: b, catatan: catatan.trim() || undefined }
    );

    try {
      const r = await portalPost<HasilMassal>(`/portal/promo/${idPromo}/peserta`, {
        peserta: daftar,
      });
      if (r.success) {
        setHasil(r.data);
        setTeks('');
        setCatatan('');
        muat();
      } else {
        setPesan(r.message);
      }
    } catch {
      setPesan('Gagal mengirim. Periksa koneksi internet.');
    } finally {
      setMengirim(false);
    }
  }

  async function hapus(p: Peserta) {
    const siapa = p.email || p.no_hp || `#${p.id_peserta}`;
    if (!confirm(`Hapus ${siapa} dari promo ini?`)) return;
    const r = await portalDelete(`/portal/peserta/${p.id_peserta}`);
    setPesan(r.message);
    if (r.success) muat();
  }

  if (loading) return <p className="text-slate-400">Memuat…</p>;

  if (!promo) {
    return (
      <div>
        <h1>Promo Tidak Ditemukan</h1>
        <p className="text-slate-400">
          Promo ini bukan milik mitra Anda, atau sudah tidak tersedia.
        </p>
        <Link to="/portal/promo">
          <button type="button" className="ghost">
            ← Kembali
          </button>
        </Link>
        {pesan && <p className="msg">{pesan}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to="/portal/promo">← Promo Saya</Link>
      </p>

      <h1>
        <code>{promo.kode_promo}</code>
      </h1>
      <p className="mb-4 text-sm text-slate-400">
        {promo.nama} · berlaku {tgl(promo.tanggal_mulai)} s.d. {tgl(promo.tanggal_selesai)}
      </p>

      {/* ---------- Input massal ---------- */}
      <div className="panel">
        <h3>Daftarkan Pelanggan</h3>
        <p className="text-sm text-slate-400">
          Tempel daftar email atau nomor HP, <strong>satu per baris</strong>. Baris
          berisi &ldquo;@&rdquo; dibaca sebagai email, selain itu sebagai nomor HP.
        </p>

        <label>
          Daftar Email / No. HP
          <textarea
            rows={6}
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={'tamu1@example.com\n081234567890\ntamu2@example.com'}
          />
        </label>

        <label>
          Catatan (opsional, berlaku untuk semua baris)
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="mis. Check-in 28 Okt / Kamar 204"
          />
        </label>

        {pratinjau.total > 0 && (
          <div>
            <p className="text-sm text-slate-300">
              {pratinjau.total} baris terdeteksi
              {pratinjau.email.length > 0 && ` · ${pratinjau.email.length} email`}
              {pratinjau.hp.length > 0 && ` · ${pratinjau.hp.length} no. HP`}
            </p>
            {pratinjau.ambigu.length > 0 && (
              <p className="text-sm text-amber-400">
                {pratinjau.ambigu.length} baris tidak dikenali sebagai email atau no. HP
                dan akan tetap dikirim sebagai no. HP: {pratinjau.ambigu.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="row">
          <button type="button" onClick={kirimMassal} disabled={mengirim || pratinjau.total === 0}>
            {mengirim ? 'Mengirim…' : `Daftarkan ${pratinjau.total || ''} Pelanggan`}
          </button>
          {teks && (
            <button type="button" className="cancel" onClick={() => setTeks('')}>
              Bersihkan
            </button>
          )}
        </div>

        {pesan && <p className="msg">{pesan}</p>}

        {hasil && (
          <div className="mt-4">
            <p className="text-sm">
              <span className="text-emerald-400">{hasil.berhasil.length} berhasil</span>
              {hasil.gagal.length > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-400">{hasil.gagal.length} ditolak</span>
                </>
              )}
            </p>

            {hasil.berhasil.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-emerald-400">
                  Lihat {hasil.berhasil.length} yang berhasil
                </summary>
                <ul className="mt-1 text-sm text-slate-300">
                  {hasil.berhasil.map((b, i) => (
                    <li key={i}>{b.email || b.no_hp}</li>
                  ))}
                </ul>
              </details>
            )}

            {hasil.gagal.length > 0 && (
              <ul className="mt-2 text-sm">
                {hasil.gagal.map((g, i) => (
                  <li key={i} className="text-amber-400">
                    {g.email || g.no_hp || '(kosong)'} — {ALASAN[g.alasan] ?? g.alasan}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ---------- Daftar peserta ---------- */}
      <div className="panel">
        <h3>Peserta Terdaftar ({peserta.length})</h3>

        {peserta.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada peserta terdaftar.</p>
        ) : (
          <div className="datatable">
            <table>
              <thead>
                <tr>
                  <th>Email / No. HP</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {peserta.map((p) => (
                  <tr key={p.id_peserta}>
                    <td>{p.email || p.no_hp || '-'}</td>
                    <td>
                      {p.status === 'active' ? (
                        <span className="text-emerald-400">Aktif</span>
                      ) : (
                        <span className="text-slate-400">{p.status}</span>
                      )}
                    </td>
                    <td>{p.catatan || '-'}</td>
                    <td className="text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td>
                      <button className="danger" onClick={() => hapus(p)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
