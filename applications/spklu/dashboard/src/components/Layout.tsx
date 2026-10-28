import { Link, Outlet, useNavigate } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  roles: number[] | null; // null = everyone
}

// superadmin (1) & admin (2) see everything; others filtered by role list.
const NAV: NavItem[] = [
  { to: '/', label: 'Beranda', roles: null },
  { to: '/chargebox', label: 'Chargebox', roles: [1, 2, 3, 6] },
  { to: '/area', label: 'Area', roles: [1, 2] },
  { to: '/mitra', label: 'Mitra', roles: [1, 2] },
  { to: '/transaction', label: 'Transaksi', roles: [1, 2, 3, 4, 5] },
  { to: '/wallet', label: 'Wallet', roles: [1, 2, 4] },
  { to: '/laporan', label: 'Laporan', roles: [1, 2, 4] },
  { to: '/pengguna', label: 'Pengguna', roles: [1, 2] },
  { to: '/pelanggan', label: 'Pelanggan', roles: [1, 2] },
  { to: '/berita', label: 'Berita', roles: [1, 2] },
  { to: '/biaya', label: 'Biaya', roles: [1, 2] },
  { to: '/promo-mitra', label: 'Mitra Promo', roles: [1, 2] },
  { to: '/promo', label: 'Promo', roles: [1, 2] },
  { to: '/promo-iklan', label: 'Iklan Promo', roles: [1, 2] },
  { to: '/promo-peserta', label: 'Peserta Promo', roles: [1, 2] },
  { to: '/promo-eksposur', label: 'Eksposur Promo', roles: [1, 2] },
  { to: '/media', label: 'Media', roles: [1, 2, 3, 6] },
  { to: '/setting', label: 'Setting', roles: [1, 2, 4] },
];

export default function Layout() {
  const navigate = useNavigate();
  const typeId = Number(localStorage.getItem('spklu_type') ?? 0);
  const name = localStorage.getItem('spklu_name') ?? '';
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

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

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={appIcon} alt="SPKLU" />
          <h2>SPKLU</h2>
        </div>
        <nav>
          {NAV.filter((n) => canSee(n.roles)).map((n) => (
            <Link key={n.to} to={n.to}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          {name && <span className="text-xs text-slate-400">{name}</span>}
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
