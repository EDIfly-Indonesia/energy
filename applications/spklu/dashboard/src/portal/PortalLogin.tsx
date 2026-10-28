import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalPost, PORTAL_TOKEN_KEY, PORTAL_NAME_KEY, PORTAL_JENIS_KEY } from './portal-api';

/**
 * Login portal mitra (hotel / asuransi).
 *
 * Berbeda dari login admin:
 *   - tanpa captcha (front office butuh cepat; rate limit backend 20/menit)
 *   - token di key terpisah (`portal_token`), lihat catatan di portal-api.ts
 *   - pesan error seragam agar tidak membocorkan mana yang salah
 *
 * Markup memakai kelas yang sama dengan login admin (`wrap login-page`,
 * `card`, `login-logo`) supaya tampilannya konsisten tanpa CSS baru.
 */
interface LoginData {
  token: string;
  id_mitra_promo: number;
  nama_mitra: string;
  jenis_mitra: string;
  role: string;
}

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

  useEffect(() => {
    if (localStorage.getItem(PORTAL_TOKEN_KEY)) {
      navigate('/portal/promo', { replace: true });
    }
  }, [navigate]);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPesan('');

    try {
      const r = await portalPost<LoginData>('/portal/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (!r.success) {
        setPesan(r.message || 'Email atau password salah');
        return;
      }

      localStorage.setItem(PORTAL_TOKEN_KEY, r.data.token);
      localStorage.setItem(PORTAL_NAME_KEY, r.data.nama_mitra);
      localStorage.setItem(PORTAL_JENIS_KEY, r.data.jenis_mitra);
      navigate('/portal/promo', { replace: true });
    } catch {
      setPesan('Gagal terhubung ke server. Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap login-page">
      <form className="card" onSubmit={masuk}>
        <img src={appIcon} alt="EZ Charge" className="login-logo" />
        <h1>Portal Mitra</h1>
        <p className="text-sm text-slate-400">
          Untuk ATPM, hotel, dan asuransi yang bekerja sama dengan EZ Charge.
          Masuk untuk mendaftarkan pelanggan yang berhak memakai kode promo.
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="fo@hotelanda.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {pesan && <p className="msg">{pesan}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Akun portal dibuatkan oleh admin EZ Charge. Hubungi admin bila belum punya akses.
        </p>
      </form>
    </div>
  );
}