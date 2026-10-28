import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { PORTAL_TOKEN_KEY, PORTAL_NAME_KEY, PORTAL_JENIS_KEY, portalLogout } from './portal-api';

/**
 * Kerangka halaman portal mitra.
 *
 * Sengaja TIDAK memakai `components/Layout.tsx` milik admin: sidebar admin
 * memuat menu internal (chargebox, transaksi, laporan, setting) yang tidak
 * boleh dilihat mitra. Portal punya navigasi sendiri yang jauh lebih sempit.
 */
const JENIS_LABEL: Record<string, string> = {
  atpm: 'ATPM',
  hotel: 'Hotel',
  asuransi: 'Asuransi',
  lainnya: 'Mitra',
};

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const nama = localStorage.getItem(PORTAL_NAME_KEY) ?? '';
  const jenis = localStorage.getItem(PORTAL_JENIS_KEY) ?? '';
  const appIcon = import.meta.env.BASE_URL + 'assets/images/app_icon.png';

  useEffect(() => {
    if (!localStorage.getItem(PORTAL_TOKEN_KEY)) {
      navigate('/portal/login', { replace: true });
    }
  }, [navigate, location.pathname]);

  function keluar() {
    portalLogout();
    navigate('/portal/login', { replace: true });
  }

  const menu = [{ to: '/portal/promo', label: 'Promo Saya' }];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={appIcon} alt="EZ Charge" />
          <h2>Portal Mitra</h2>
        </div>

        <div className="text-xs text-slate-400">
          {nama}
          {jenis && (
            <>
              <br />
              <span className="text-slate-500">{JENIS_LABEL[jenis] ?? jenis}</span>
            </>
          )}
        </div>

        <nav>
          {menu.map((m) => (
            <Link key={m.to} to={m.to}>
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <button className="danger" onClick={keluar}>
            Keluar
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
