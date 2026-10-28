// src/pages/telemetry-mappings/Index.tsx
import React from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';

interface Mapping { id: number; device: string; vendorKey: string; standardKey: string; status: string; }

export const TelemetryMappings: React.FC = () => {
  const [mappings, setMappings] = React.useState<Mapping[]>([]);
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Mapping | null>(null);
  const [form, setForm] = React.useState({ device: '', vendorKey: '', standardKey: '', status: 'Configured' });
  const [saving, setSaving] = React.useState(false);

  const filteredMappings = mappings.filter(m => [m.device, m.vendorKey, m.standardKey, m.status].join(' ').toLowerCase().includes(search.toLowerCase()));
  const configuredCount = mappings.filter(m => m.status === 'Configured').length;
  const draftCount = mappings.filter(m => m.status !== 'Configured').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        setMappings(mappings.map(m => m.id === editing.id ? { ...m, ...form } : m));
        toast.success('Mapping updated');
      } else {
        setMappings([...mappings, { id: Date.now(), ...form }]);
        toast.success('Mapping created');
      }
      setShowModal(false);
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Telemetry Mappings</h2>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Mapping</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Total Mappings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-scada-text">{mappings.length}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Configured</p>
          <p className="text-2xl font-bold text-green-600">{configuredCount}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Draft</p>
          <p className="text-2xl font-bold text-gray-400">{draftCount}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search mappings..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-scada-border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-scada-text">{editing ? 'Edit Mapping' : 'Add Mapping'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Device</label>
                <input value={form.device} onChange={e => setForm({...form, device: e.target.value})} type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Device name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Vendor Key</label>
                <input value={form.vendorKey} onChange={e => setForm({...form, vendorKey: e.target.value})} type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="e.g. voltage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Standard Key</label>
                <input value={form.standardKey} onChange={e => setForm({...form, standardKey: e.target.value})} type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="e.g. energy_kwh" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
                  <option value="Configured">Configured</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};