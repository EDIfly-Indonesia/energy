// src/routes/index.tsx
import React from 'react';
import { Navigate, Outlet, useLocation, Route, Routes } from 'react-router-dom';
import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { Login } from '@/pages/auth/Login';
import { useAuthStore } from '@/stores/auth.store';
import { can, isSuperAdmin } from '@/utils/permission';

const Dashboard = React.lazy(() => import('@/pages/dashboard/Index').then(m => ({ default: m.Dashboard })));
const Tenants = React.lazy(() => import('@/pages/tenants/Index').then(m => ({ default: m.Tenants })));
const Companies = React.lazy(() => import('@/pages/companies/Index').then(m => ({ default: m.Companies })));
const Sites = React.lazy(() => import('@/pages/sites/Index').then(m => ({ default: m.Sites })));
const Commissioning = React.lazy(() => import('@/pages/commissioning/Index').then(m => ({ default: m.Commissioning })));
const Devices = React.lazy(() => import('@/pages/devices/Index').then(m => ({ default: m.Devices })));
const DeviceDetail = React.lazy(() => import('@/pages/devices/Detail').then(m => ({ default: m.DeviceDetail })));
const Telemetry = React.lazy(() => import('@/pages/telemetry/Index').then(m => ({ default: m.Telemetry })));
const TelemetryMappings = React.lazy(() => import('@/pages/telemetry-mappings/Index').then(m => ({ default: m.TelemetryMappings })));
const VendorMappings = React.lazy(() => import('@/pages/vendor-mappings/Index').then(m => ({ default: m.VendorMappings })));
const Invoices = React.lazy(() => import('@/pages/invoices/Index').then(m => ({ default: m.Invoices })));
const Rates = React.lazy(() => import('@/pages/rates/Index').then(m => ({ default: m.Rates })));
const Users = React.lazy(() => import('@/pages/users/Index').then(m => ({ default: m.Users })));
const Roles = React.lazy(() => import('@/pages/roles/Index').then(m => ({ default: m.Roles })));
const Permissions = React.lazy(() => import('@/pages/permissions/Index').then(m => ({ default: m.Permissions })));
const Settings = React.lazy(() => import('@/pages/settings/Index').then(m => ({ default: m.Settings })));
const Reports = React.lazy(() => import('@/pages/reports/Index').then(m => ({ default: m.Reports })));
const Alarms = React.lazy(() => import('@/pages/alarms/Index').then(m => ({ default: m.Alarms })));

interface ProtectedRouteProps {
  permission?: { action: string; resource: string };
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, children }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const location = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !isSuperAdmin() && !can(permission.action, permission.resource)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route element={<DefaultLayout />}>
          <Route path="" element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="tenants" element={<ProtectedRoute permission={{ action: 'view', resource: 'tenants' }}><Tenants /></ProtectedRoute>} />
          <Route path="companies" element={<ProtectedRoute permission={{ action: 'view', resource: 'companies' }}><Companies /></ProtectedRoute>} />
          <Route path="sites" element={<ProtectedRoute permission={{ action: 'view', resource: 'sites' }}><Sites /></ProtectedRoute>} />
          <Route path="commissioning" element={<ProtectedRoute permission={{ action: 'create', resource: 'devices' }}><Commissioning /></ProtectedRoute>} />
          <Route path="devices" element={<ProtectedRoute permission={{ action: 'view', resource: 'devices' }}><Devices /></ProtectedRoute>} />
          <Route path="devices/:id" element={<ProtectedRoute permission={{ action: 'view', resource: 'devices' }}><DeviceDetail /></ProtectedRoute>} />
          <Route path="telemetry" element={<ProtectedRoute permission={{ action: 'view', resource: 'telemetry' }}><Telemetry /></ProtectedRoute>} />
          <Route path="telemetry_mappings" element={<ProtectedRoute permission={{ action: 'view', resource: 'telemetry_mappings' }}><TelemetryMappings /></ProtectedRoute>} />
          <Route path="telemetry_vendor_mappings" element={<ProtectedRoute permission={{ action: 'view', resource: 'telemetry_vendor_mappings' }}><VendorMappings /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute permission={{ action: 'view', resource: 'invoices' }}><Invoices /></ProtectedRoute>} />
          <Route path="rates" element={<ProtectedRoute permission={{ action: 'view', resource: 'rates' }}><Rates /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute permission={{ action: 'view', resource: 'users' }}><Users /></ProtectedRoute>} />
          <Route path="roles" element={<ProtectedRoute permission={{ action: 'view', resource: 'roles' }}><Roles /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute permission={{ action: 'view', resource: 'permissions' }}><Permissions /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute permission={{ action: 'view', resource: 'settings' }}><Settings /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute permission={{ action: 'view', resource: 'reports' }}><Reports /></ProtectedRoute>} />
          <Route path="alarms" element={<ProtectedRoute permission={{ action: 'view', resource: 'alarms' }}><Alarms /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
};