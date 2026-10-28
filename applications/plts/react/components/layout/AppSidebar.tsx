// src/components/layout/AppSidebar.tsx
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Database,
  FileText,
  BarChart2,
  Building2,
  Building,
  MapPin,
  Server,
  DollarSign,
  Users,
  Shield,
  Lock,
  Settings,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { can, isSuperAdmin } from '@/utils/permission';
import apiClient from '@/api/client';
import LogoImage from '@/assets/images/smple-logo.png';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  permission?: { action: string; resource: string };
}

interface NavSection {
  section?: string;
  items: NavItem[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [criticalAlarmCount, setCriticalAlarmCount] = useState(0);

  // Fetch critical alarm count from backend API
  useEffect(() => {
    const fetchCriticalAlarms = async () => {
      try {
        const res = await apiClient.get('/alarms', {
          params: { severity: 'CRITICAL', resolved: false }
        });
        const alarms = res.data?.data || [];
        setCriticalAlarmCount(alarms.length);
      } catch (error) {
        console.error('Error fetching critical alarms count:', error);
        setCriticalAlarmCount(0);
      }
    };
    fetchCriticalAlarms();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCriticalAlarms, 60000);
    return () => clearInterval(interval);
  }, []);

  const navGroups: NavSection[] = [
    {
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Alarms', path: '/alarms', icon: AlertTriangle, permission: { action: 'view', resource: 'alarms' } },
        { name: 'Usage', path: '/usage', icon: Activity, permission: { action: 'view', resource: 'usage' } },
        { name: 'Analytics', path: '/analytics', icon: Database, permission: { action: 'view', resource: 'analytics' } },
        { name: 'Invoices', path: '/invoices', icon: FileText, permission: { action: 'view', resource: 'invoices' } },
        { name: 'Reports', path: '/reports', icon: BarChart2, permission: { action: 'view', resource: 'reports' } },
      ],
    },
    {
      section: 'Administration',
      items: [
        { name: 'Tenants', path: '/tenants', icon: Building2, permission: { action: 'view', resource: 'tenants' } },
        { name: 'Companies', path: '/companies', icon: Building, permission: { action: 'view', resource: 'companies' } },
        { name: 'Sites', path: '/sites', icon: MapPin, permission: { action: 'view', resource: 'sites' } },
        { name: 'Devices', path: '/devices', icon: Server, permission: { action: 'view', resource: 'devices' } },
        { name: 'Telemetry Mappings', path: '/telemetry_mappings', icon: Activity, permission: { action: 'view', resource: 'telemetry_mappings' } },
        { name: 'Vendor Mappings', path: '/telemetry_vendor_mappings', icon: Database, permission: { action: 'view', resource: 'telemetry_vendor_mappings' } },
        { name: 'Rates', path: '/rates', icon: DollarSign, permission: { action: 'view', resource: 'rates' } },
        { name: 'Users', path: '/users', icon: Users, permission: { action: 'view', resource: 'users' } },
        { name: 'Roles', path: '/roles', icon: Shield, permission: { action: 'view', resource: 'roles' } },
        { name: 'Permissions', path: '/permissions', icon: Lock, permission: { action: 'view', resource: 'permissions' } },
        { name: 'Settings', path: '/settings', icon: Settings, permission: { action: 'view', resource: 'settings' } },
      ],
    },
  ];

  const checkAccess = (item: NavItem) => {
    if (item.path === '/dashboard') return true;
    if (isSuperAdmin()) return true;
    if (item.permission) return can(item.permission.action, item.permission.resource);
    return false;
  };

  const getUserInitials = () => {
    const name = user?.name || 'User';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRole = () => {
    const role = (user?.role as any) || {};
    return role.name || role.role_name || user?.role_name || role.slug || 'User';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-30 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-6 border-b border-gray-100 flex flex-col items-center gap-3">
        <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center">
          <img src={LogoImage} alt="Logo" className="w-full h-auto" />
        </div>
        <p className="text-sm font-bold text-gray-800 text-center">SCADA Monitoring Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.section && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.section}</p>}
            {group.items.filter(checkAccess).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-scada-50 text-scada-700 border border-scada-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.path === '/alarms' && criticalAlarmCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {criticalAlarmCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-scada-100 flex items-center justify-center">
            <span className="text-xs font-bold text-scada-600">{getUserInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{getUserRole()}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
  );
};
