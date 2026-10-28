// src/pages/commissioning/Index.tsx
import React from 'react';
import { Tenant, Site } from '@/types';

export const Commissioning: React.FC = () => {
  const [form, setForm] = React.useState({ tenantId: '', siteId: '', serialNumber: '', modelName: '' });
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Registering:', form);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Device Commissioning</h2>
      <div className="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Tenant</label>
              <select value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
                <option value="">Select Tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Site</label>
              <select value={form.siteId} onChange={e => setForm({...form, siteId: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
                <option value="">Select Site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Device ID / Serial</label>
              <input value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})} type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Model Name</label>
              <input value={form.modelName} onChange={e => setForm({...form, modelName: e.target.value})} type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="submit" className="bg-scada-600 hover:bg-scada-700 text-white font-medium py-2 px-4 rounded-lg">Register Device</button>
          </div>
        </form>
      </div>
    </div>
  );
};