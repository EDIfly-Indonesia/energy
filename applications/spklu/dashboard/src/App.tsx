import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Chargebox from './pages/Chargebox';
import Area from './pages/Area';
import Mitra from './pages/Mitra';
import Transaction from './pages/Transaction';
import Wallet from './pages/Wallet';
import Pengguna from './pages/Pengguna';
import Pelanggan from './pages/Pelanggan';
import Berita from './pages/Berita';
import MitraPromo from './pages/MitraPromo';
import Promo from './pages/Promo';
import PromoIklan from './pages/PromoIklan';
import PromoPeserta from './pages/PromoPeserta';
import PromoEksposur from './pages/PromoEksposur';
import Biaya from './pages/Biaya';
import Media from './pages/Media';
import Setting from './pages/Setting';
import Laporan from './pages/Laporan';
import PortalLogin from './portal/PortalLogin';
import PortalLayout from './portal/PortalLayout';
import PortalPromo from './portal/PortalPromo';
import PortalPeserta from './portal/PortalPeserta';

function RequireAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('spklu_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter basename="/spklu">
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Portal mitra (hotel/asuransi). Sengaja terpisah dari blok admin:
            memakai token sendiri (portal_token) dan guard sendiri. */}
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Navigate to="/portal/promo" replace />} />
          <Route path="promo" element={<PortalPromo />} />
          <Route path="promo/:id" element={<PortalPeserta />} />
        </Route>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Home />} />
          <Route path="chargebox" element={<Chargebox />} />
          <Route path="area" element={<Area />} />
          <Route path="mitra" element={<Mitra />} />
          <Route path="transaction" element={<Transaction />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="pengguna" element={<Pengguna />} />
          <Route path="pelanggan" element={<Pelanggan />} />
          <Route path="berita" element={<Berita />} />
          <Route path="biaya" element={<Biaya />} />
          <Route path="promo-mitra" element={<MitraPromo />} />
          <Route path="promo" element={<Promo />} />
          <Route path="promo-iklan" element={<PromoIklan />} />
          <Route path="promo-peserta" element={<PromoPeserta />} />
          <Route path="promo-eksposur" element={<PromoEksposur />} />
          <Route path="media" element={<Media />} />
          <Route path="setting" element={<Setting />} />
          <Route path="laporan" element={<Laporan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
