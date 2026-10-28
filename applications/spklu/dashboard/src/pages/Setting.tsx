import { useEffect, useState } from 'react';
import { get, put } from '../api';
import PasswordInput from '../components/PasswordInput';

interface SettingData {
  ppn: string | null;
  pbjt: string | null;
  admin_wallet: string | null;
  admin_wallet_sandbox: string | null;
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_secure: string | null;
  smtp_user: string | null;
  smtp_from: string | null;
  smtp_pass_set: boolean;
}

type Group = 'pajak' | 'wallet' | 'smtp';

const GROUPS: { key: Group; label: string }[] = [
  { key: 'pajak', label: 'Pajak' },
  { key: 'wallet', label: 'Wallet ID' },
  { key: 'smtp', label: 'SMTP' },
];

const empty: SettingData = {
  ppn: '',
  pbjt: '',
  admin_wallet: '',
  admin_wallet_sandbox: '',
  smtp_host: '',
  smtp_port: '',
  smtp_secure: 'true',
  smtp_user: '',
  smtp_from: '',
  smtp_pass_set: false,
};

export default function Setting() {
  const [form, setForm] = useState<SettingData>(empty);
  const [group, setGroup] = useState<Group>('pajak');
  const [smtpPass, setSmtpPass] = useState(''); // write-only — tidak pernah dimuat dari server
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get<SettingData>('/admin/setting').then((r) => {
      if (r.success) setForm({ ...empty, ...r.data });
    });
  }, []);

  function set<K extends keyof SettingData>(k: K, v: SettingData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function selectGroup(g: Group) {
    setGroup(g);
    setMsg('');
    setSmtpPass('');
  }

  // Hanya kirim nilai kelompok yang aktif — tidak semua nilai t_setting.
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (group === 'pajak') {
      payload.ppn = form.ppn;
      payload.pbjt = form.pbjt;
    } else if (group === 'wallet') {
      payload.admin_wallet = form.admin_wallet;
      payload.admin_wallet_sandbox = form.admin_wallet_sandbox;
    } else {
      payload.smtp_host = form.smtp_host;
      payload.smtp_port = form.smtp_port;
      payload.smtp_secure = form.smtp_secure;
      payload.smtp_user = form.smtp_user;
      payload.smtp_from = form.smtp_from;
      // password SMTP hanya dikirim bila diisi (write-only, tidak diubah jika kosong)
      if (smtpPass) payload.smtp_pass = smtpPass;
    }
    const r = await put('/admin/setting', payload);
    setMsg(r.message);
    if (r.success) setSmtpPass('');
  }

  return (
    <div>
      <h1>Setting</h1>

      <div className="submenu">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={group === g.key ? '' : 'ghost'}
            onClick={() => selectGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <form className="panel" onSubmit={save} style={{ maxWidth: 560 }}>
        {group === 'pajak' && (
          <>
            <h3>Pajak</h3>
            <label>
              PPN
              <input value={form.ppn ?? ''} onChange={(e) => set('ppn', e.target.value)} />
            </label>
            <label>
              PBJT
              <input value={form.pbjt ?? ''} onChange={(e) => set('pbjt', e.target.value)} />
            </label>
          </>
        )}

        {group === 'wallet' && (
          <>
            <h3>Wallet ID (Payment Gateway)</h3>
            <label>
              Production
              <input value={form.admin_wallet ?? ''} onChange={(e) => set('admin_wallet', e.target.value)} />
            </label>
            <label>
              Sandbox
              <input value={form.admin_wallet_sandbox ?? ''} onChange={(e) => set('admin_wallet_sandbox', e.target.value)} />
            </label>
          </>
        )}

        {group === 'smtp' && (
          <>
            <h3>SMTP Email</h3>
            <label>
              Host
              <input value={form.smtp_host ?? ''} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.example.com" />
            </label>
            <label>
              Port
              <input value={form.smtp_port ?? ''} onChange={(e) => set('smtp_port', e.target.value)} placeholder="465" />
            </label>
            <label>
              Secure (SSL/TLS)
              <select value={form.smtp_secure ?? 'true'} onChange={(e) => set('smtp_secure', e.target.value)}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              Username (email)
              <input value={form.smtp_user ?? ''} onChange={(e) => set('smtp_user', e.target.value)} />
            </label>
            <label>
              Password {form.smtp_pass_set ? '(terisi — kosongkan untuk tetap)' : '(belum diisi)'}
              <PasswordInput value={smtpPass} onChange={setSmtpPass} autoComplete="new-password" placeholder="••••••••" />
            </label>
            <label>
              From
              <input value={form.smtp_from ?? ''} onChange={(e) => set('smtp_from', e.target.value)} placeholder='"Admin GoCaz" <email>' />
            </label>
          </>
        )}

        <div className="row mt-5">
          <button type="submit">Simpan</button>
        </div>
        {msg && <p className="msg">{msg}</p>}
      </form>
    </div>
  );
}
