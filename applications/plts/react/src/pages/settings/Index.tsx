// src/pages/settings/Index.tsx
import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/common/Button';
import { toast } from '@/hooks/useSweetAlert';

export const Settings: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'system'>('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'system' as const, label: 'System Info', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-scada-muted mt-1">Manage your account and system preferences</p>
      </div>

      <div className="bg-white dark:bg-scada-card rounded-lg shadow border border-gray-200 dark:border-scada-border overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-scada-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-scada-600 border-b-2 border-scada-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="max-w-xl space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-scada-text mb-4">Profile Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                />
              </div>
              <Button onClick={() => toast.success('Profile saved (demo)')} className="mt-4">Save Changes</Button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-xl space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-scada-text mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-scada-600 focus:ring-scada-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-scada-text">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive alarm and status updates via email</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-scada-600 focus:ring-scada-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-scada-text">Critical Alarms</p>
                    <p className="text-xs text-gray-500">Immediate alert for critical device alarms</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-scada-600 focus:ring-scada-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-scada-text">Daily Reports</p>
                    <p className="text-xs text-gray-500">Receive daily energy production summary</p>
                  </div>
                </label>
              </div>
              <Button onClick={() => toast.success('Notification settings saved (demo)')} className="mt-4">Save Preferences</Button>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-scada-text mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-scada-bg rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-scada-muted uppercase">Version</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-scada-text mt-1">SCADA Platform v1.0.0</p>
                </div>
                <div className="bg-gray-50 dark:bg-scada-bg rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-scada-muted uppercase">Environment</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-scada-text mt-1">Development</p>
                </div>
                <div className="bg-gray-50 dark:bg-scada-bg rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-scada-muted uppercase">API Endpoint</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-scada-text mt-1">/plts/api/v1</p>
                </div>
                <div className="bg-gray-50 dark:bg-scada-bg rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-scada-muted uppercase">Database</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-scada-text mt-1">PostgreSQL + InfluxDB</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;