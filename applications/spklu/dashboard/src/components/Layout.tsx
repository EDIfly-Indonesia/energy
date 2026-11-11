import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

type NavEntry =
  | { kind: 'link'; to: string; label: string; roles: number[] | null }
  | { kind: 'group'; title: string; children: NavEntry[] };

// superadmin (1) & admin (2) see everything; others filtered by role list.
// Struktur dikelompokkan berdasarkan fungsi (keputusan 2026-11).
const NAV: NavEntry[] = [
  { kind: 'link', to: '/', label: 'Dashboard', roles: null },
  {
    kind: 'group',
    title: 'Transaksi',
    children: [
      { kind: 'link', to: '/transaction', label: 'Log Transaksi', roles: [1, 2, 3, 4, 5] },
      { kind: 'link', to: '/monitor', label: 'Log Chargebox', roles: [1, 2, 3, 6] },
      { kind: 'link', to: '/wallet', label: 'Log Wallet', roles: [1, 2, 4] },
    ],
  },
  {
    kind: 'group',
    title: 'Administration',
    children: [
      { kind: 'link', to: '/pengguna', label: 'Pengguna', roles: [1, 2] },
      { kind: 'link', to: '/pelanggan', label: 'Pelanggan', roles: [1, 2] },
      { kind: 'link', to: '/area', label: 'Area', roles: [1, 2] },
      { kind: 'link', to: '/mitra', label: 'Mitra', roles: [1, 2] },
      { kind: 'link', to: '/biaya', label: 'Biaya', roles: [1, 2] },
      { kind: 'link', to: '/chargebox', label: 'Chargebox', roles: [1, 2, 3, 6] },
      { kind: 'link', to: '/berita', label: 'Berita', roles: [1, 2] },
      { kind: 'link', to: '/media', label: 'Media', roles: [1, 2, 3, 6] },
      {
        kind: 'group',
        title: 'Settings',
        children: [
          { kind: 'link', to: '/setting?tab=pajak', label: 'Tax', roles: [1, 2, 4] },
          { kind: 'link', to: '/payment-gateway', label: 'Payment Gateway', roles: [1, 2] },
          { kind: 'link', to: '/setting?tab=wallet', label: 'Wallet ID', roles: [1, 2, 4] },
          { kind: 'link', to: '/setting?tab=smtp', label: 'SMTP', roles: [1, 2, 4] },
        ],
      },
    ],
  },
  {
    kind: 'group',
    title: 'Promotion',
    children: [
      { kind: 'link', to: '/promo-mitra', label: 'Mitra', roles: [1, 2] },
      { kind: 'link', to: '/promo', label: 'Budget', roles: [1, 2] },
      { kind: 'link', to: '/promo-iklan', label: 'Iklan', roles: [1, 2] },
      { kind: 'link', to: '/promo-peserta', label: 'Member', roles: [1, 2] },
      { kind: 'link', to: '/promo-eksposur', label: 'Exposure', roles: [1, 2] },
    ],
  },
  { kind: 'link', to: '/laporan', label: 'Laporan', roles: [1, 2, 4] },
];

export default function Layout() {
  const navigate = useNavigate();
  const typeId = Number(localStorage.getItem('spklu_type') ?? 0);
  const name = localStorage.getItem('spklu_name') ?? '';
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('spklu_theme') === 'light' ? 'light' : 'dark'),
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spklu_theme', theme);
  }, [theme]);

  function canSee(roles: number[] | null): boolean {
    if (typeId === 1 || typeId === 2) return true;
    if (!roles) return true;
    return roles.includes(typeId);
  }

  function logout() {
    localStorage.removeItem('spklu_token');
    localStorage.removeItem('spklu_type');
    localStorage.removeItem('spklu_name');
    localStorage.removeItem('spklu_mitra');
    navigate('/login', { replace: true });
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  function renderEntries(entries: NavEntry[]): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    for (const entry of entries) {
      if (entry.kind === 'link') {
        if (!canSee(entry.roles)) continue;
        nodes.push(
          <NavLink
            key={entry.to}
            to={entry.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {entry.label}
          </NavLink>,
        );
      } else {
        const visible = entry.children.filter((c) =>
          c.kind === 'link' ? canSee(c.roles) : true,
        );
        if (visible.length === 0) continue;
        nodes.push(
          <div className="nav-group" key={entry.title}>
            <div className="nav-group-title">{entry.title}</div>
            <div className="nav-group-items">
              {renderEntries(entry.children)}
            </div>
          </div>,
        );
      }
    }
    return nodes;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={appIcon} alt="SPKLU" />
          <h2>SPKLU</h2>
        </div>
        <nav>{renderEntries(NAV)}</nav>
        <div className="sidebar-footer">
          {name && <span className="sidebar-user">{name}</span>}
          <button className="theme-toggle" onClick={toggleTheme} title="Ganti tema">
            {theme === 'dark' ? '☀️ Terang' : '🌙 Gelap'}
          </button>
          <button className="danger" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
