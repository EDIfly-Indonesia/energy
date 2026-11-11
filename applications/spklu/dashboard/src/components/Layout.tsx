import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ReceiptText,
  Activity,
  Wallet,
  Users,
  Contact,
  MapPin,
  Building2,
  Coins,
  Zap,
  Newspaper,
  Image,
  Settings,
  Percent,
  CreditCard,
  Key,
  Mail,
  Tag,
  Banknote,
  Megaphone,
  UserPlus,
  Eye,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';

type NavEntry =
  | { kind: 'link'; to: string; label: string; roles: number[] | null; icon: typeof Zap }
  | { kind: 'group'; title: string; icon: typeof Zap; children: NavEntry[] };

// superadmin (1) & admin (2) see everything; others filtered by role list.
// Struktur dikelompokkan berdasarkan fungsi (keputusan 2026-11).
const NAV: NavEntry[] = [
  { kind: 'link', to: '/', label: 'Dashboard', roles: null, icon: LayoutDashboard },
  {
    kind: 'group',
    title: 'Transaksi',
    icon: FileText,
    children: [
      { kind: 'link', to: '/transaction', label: 'Log Transaksi', roles: [1, 2, 3, 4, 5], icon: ReceiptText },
      { kind: 'link', to: '/monitor', label: 'Log Chargebox', roles: [1, 2, 3, 6], icon: Activity },
      { kind: 'link', to: '/wallet', label: 'Log Wallet', roles: [1, 2, 4], icon: Wallet },
    ],
  },
  {
    kind: 'group',
    title: 'Administration',
    icon: Users,
    children: [
      { kind: 'link', to: '/pengguna', label: 'Pengguna', roles: [1, 2], icon: Users },
      { kind: 'link', to: '/pelanggan', label: 'Pelanggan', roles: [1, 2], icon: Contact },
      { kind: 'link', to: '/area', label: 'Area', roles: [1, 2], icon: MapPin },
      { kind: 'link', to: '/mitra', label: 'Mitra', roles: [1, 2], icon: Building2 },
      { kind: 'link', to: '/biaya', label: 'Biaya', roles: [1, 2], icon: Coins },
      { kind: 'link', to: '/chargebox', label: 'Chargebox', roles: [1, 2, 3, 6], icon: Zap },
      { kind: 'link', to: '/berita', label: 'Berita', roles: [1, 2], icon: Newspaper },
      { kind: 'link', to: '/media', label: 'Media', roles: [1, 2, 3, 6], icon: Image },
      {
        kind: 'group',
        title: 'Settings',
        icon: Settings,
        children: [
          { kind: 'link', to: '/setting?tab=pajak', label: 'Tax', roles: [1, 2, 4], icon: Percent },
          { kind: 'link', to: '/payment-gateway', label: 'Payment Gateway', roles: [1, 2], icon: CreditCard },
          { kind: 'link', to: '/setting?tab=wallet', label: 'Wallet ID', roles: [1, 2, 4], icon: Key },
          { kind: 'link', to: '/setting?tab=smtp', label: 'SMTP', roles: [1, 2, 4], icon: Mail },
        ],
      },
    ],
  },
  {
    kind: 'group',
    title: 'Promotion',
    icon: Tag,
    children: [
      { kind: 'link', to: '/promo-mitra', label: 'Mitra', roles: [1, 2], icon: Building2 },
      { kind: 'link', to: '/promo', label: 'Budget', roles: [1, 2], icon: Banknote },
      { kind: 'link', to: '/promo-iklan', label: 'Iklan', roles: [1, 2], icon: Megaphone },
      { kind: 'link', to: '/promo-peserta', label: 'Member', roles: [1, 2], icon: UserPlus },
      { kind: 'link', to: '/promo-eksposur', label: 'Exposure', roles: [1, 2], icon: Eye },
    ],
  },
  { kind: 'link', to: '/laporan', label: 'Laporan', roles: [1, 2, 4], icon: BarChart3 },
];

export default function Layout() {
  const navigate = useNavigate();
  const typeId = Number(localStorage.getItem('spklu_type') ?? 0);
  const name = localStorage.getItem('spklu_name') ?? '';
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('spklu_theme') === 'light' ? 'light' : 'dark'),
  );

  // Kunci grup yang sedang "terbuka". Default semua terbuka.
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

  function isOpen(key: string): boolean {
    return open[key] !== false; // default terbuka
  }

  function toggleOpen(key: string) {
    setOpen((o) => ({ ...o, [key]: !isOpen(key) }));
  }

  function renderEntries(entries: NavEntry[]): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    for (const entry of entries) {
      if (entry.kind === 'link') {
        if (!canSee(entry.roles)) continue;
        const Icon = entry.icon;
        nodes.push(
          <NavLink
            key={entry.to}
            to={entry.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={17} />
            <span>{entry.label}</span>
          </NavLink>,
        );
      } else {
        const visible = entry.children.filter((c) =>
          c.kind === 'link' ? canSee(c.roles) : true,
        );
        if (visible.length === 0) continue;
        const key = entry.title;
        const expanded = isOpen(key);
        const GroupIcon = entry.icon;
        nodes.push(
          <div className="nav-group" key={key}>
            <button
              type="button"
              className="nav-group-title"
              onClick={() => toggleOpen(key)}
              aria-expanded={expanded}
            >
              <GroupIcon size={16} />
              <span>{entry.title}</span>
              <ChevronDown
                size={16}
                className={'nav-chevron' + (expanded ? '' : ' collapsed')}
              />
            </button>
            {expanded && (
              <div className="nav-group-items">{renderEntries(entry.children)}</div>
            )}
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
          <h2>EZ-Charge Admin</h2>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <nav>{renderEntries(NAV)}</nav>
        <div className="sidebar-footer">
          {name && <span className="sidebar-user">{name}</span>}
          <button className="danger" onClick={logout}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}