import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, ApiResponse } from '../api';
import PasswordInput from '../components/PasswordInput';

interface AdminUser {
  id: number;
  code: string;
  name?: string;
}

interface LoginResponse extends ApiResponse<AdminUser> {
  type_id?: number;
  type_code?: string;
  id_role?: number;
  id_mitra?: number | null;
}

interface CaptchaData {
  id: string;
  image: string;
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const navigate = useNavigate();
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

  async function loadCaptcha() {
    const r = await get<CaptchaData>('/admin/captcha');
    if (r.success) {
      setCaptcha(r.data);
    } else {
      setCaptcha(null);
    }
  }

  useEffect(() => {
    loadCaptcha();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = (await post<AdminUser>('/admin/login', {
        username,
        password,
        captcha_id: captcha?.id ?? '',
        captcha: captchaInput,
      })) as unknown as LoginResponse;
      if (res.success) {
        if (res.token) localStorage.setItem('spklu_token', res.token);
        localStorage.setItem('spklu_type', String(res.type_id ?? ''));
        localStorage.setItem('spklu_name', res.data?.name ?? '');
        if (res.id_mitra != null) localStorage.setItem('spklu_mitra', String(res.id_mitra));
        else localStorage.removeItem('spklu_mitra');
        navigate('/', { replace: true });
      } else {
        setMessage(res.message);
        // Captcha sekali pakai — muat ulang setelah gagal (termasuk captcha salah).
        setCaptchaInput('');
        loadCaptcha();
      }
    } catch {
      setMessage('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap login-page">
      <form className="card" onSubmit={handleLogin}>
        <img src={appIcon} alt="SPKLU" className="login-logo" />
        <h1>SPKLU Admin</h1>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </label>
        <label>
          Captcha
          <div className="captcha-row">
            {captcha ? (
              <img
                src={captcha.image}
                alt="Captcha"
                className="captcha-img"
                title="Klik untuk ganti"
                onClick={loadCaptcha}
              />
            ) : (
              <span className="captcha-placeholder">Memuat captcha…</span>
            )}
            <button type="button" className="ghost" onClick={loadCaptcha} title="Ganti captcha">
              ↻
            </button>
          </div>
          <input
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            autoComplete="off"
            placeholder="Kode di atas"
          />
        </label>
        <button type="submit" disabled={loading || !captcha}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
        {message && <p className="msg">{message}</p>}
      </form>
    </div>
  );
}
