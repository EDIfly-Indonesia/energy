// src/pages/vendor-mappings/Index.tsx
import React from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';

interface VendorMapping { id: number; vendor: string; model: string; }

export const VendorMappings: React.FC = () => {
  const [mappings, setMappings] = React.useState<VendorMapping[]>([
    { id: 1, vendor: 'Schneider', model: 'PM5000' },
    { id: 2, vendor: 'Siemens', model: 'S7-1200' },
  ]);
  const [search, setSearch] = React.useState('');

  const filtered = mappings.filter(m => [m.vendor, m.model].join(' ').toLowerCase().includes(search.toLowerCase()));
  const modelCount = new Set(mappings.map(m => m.model)).size;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Vendor Mappings</h2>
        <Button className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Vendor</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-scada-text">{mappings.length}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Models</p>
          <p className="text-2xl font-bold text-blue-600">{modelCount}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search vendors..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
        </div>
      </div>
      <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
          <thead>
            <tr>
              <th>Vendor</th><th>Model</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{m.vendor}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{m.model}</td>
                <td className="px-6 py-4"><span className="badge badge-success">Ready</span></td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <button className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                  <button className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};