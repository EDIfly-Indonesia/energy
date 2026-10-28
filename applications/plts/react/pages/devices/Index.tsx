// src/pages/devices/Index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { devicesApi, sitesApi, tenantsApi } from '@/api';
import { Device, Site, Tenant } from '@/types';

interface DeviceForm {
  serialNumber: string;
  modelName: string;
  brand: string;
  type: string;
  siteId: string | number;
  tenantId: string | number;
}

export const Devices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState<DeviceForm>({ serialNumber: '', modelName: '', brand: '', type: '', siteId: '', tenantId: '' });

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devicesApi.getDevices({ search: search || undefined });
      setDevices(res.data.data || []);
    } catch {
      toast.error('Gagal memuat devices');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDevices();
  }, [search]);

  useEffect(() => {
    Promise.all([
      sitesApi.getSites().then(res => setSites(res.data.data || [])),
      tenantsApi.getTenants().then(res => setTenants(res.data.data || []))
    ]).catch(() => toast.error('Gagal memuat data referensi'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await devicesApi.updateDevice(editing.id, form);
        toast.success('Device berhasil diperbarui');
      } else {
        await devicesApi.createDevice(form);
        toast.success('Device berhasil dibuat');
      }
      setShowModal(false);
      fetchDevices();
    } catch {
      toast.error('Gagal menyimpan device');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (d: Device | null = null) => {
    setEditing(d);
    setForm(d ? {
      serialNumber: d.serialNumber,
      modelName: d.modelName || '',
      brand: d.brand || '',
      type: d.type || '',
      siteId: d.site?.id || '',
      tenantId: d.site?.tenant?.id || ''
    } : { serialNumber: '', modelName: '', brand: '', type: '', siteId: '', tenantId: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ serialNumber: '', modelName: '', brand: '', type: '', siteId: '', tenantId: '' });
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Hapus device ini?')) {
      try {
        await devicesApi.deleteDevice(id);
        toast.success('Device berhasil dihapus');
        fetchDevices();
      } catch {
        toast.error('Gagal menghapus device');
      }
    }
  };

  const filteredDevices = devices.filter(d => 
    d.serialNumber.toLowerCase().includes(search.toLowerCase()) || 
    (d.modelName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.site?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Devices</h2>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Device
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            type="text" placeholder="Search serial/model/site..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
          />
        </div>
      </div>

      {loading && <p className="text-center py-8 text-gray-500">Loading...</p>}

      {!loading && filteredDevices.length === 0 && (
        <p className="text-center py-8 text-gray-500 dark:text-scada-muted">Tidak ada device ditemukan</p>
      )}

      {!loading && filteredDevices.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model / Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
              {filteredDevices.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{d.serialNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                    {d.modelName} <span className="text-xs opacity-60">({d.brand})</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{d.site?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${d.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {d.status || 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link to={`/devices/${d.id}`} className="text-blue-600 hover:text-blue-900 inline-block"><ExternalLink className="w-4 h-4" /></Link>
                    <button onClick={() => openModal(d)} className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Device' : 'Tambah Device'}
          isOpen={showModal}
          onClose={closeModal}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={closeModal}>Batal</Button>
              <Button size="sm" loading={saving} onClick={handleSubmit}>Simpan</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder="Serial Number" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" required />
            <div className="grid grid-cols-2 gap-4">
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" />
              <input value={form.modelName} onChange={e => setForm({ ...form, modelName: e.target.value })} placeholder="Model Name" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" />
            </div>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
              <option value="">Pilih Type</option>
              <option value="Inverter">Inverter</option>
              <option value="Gateway">Gateway</option>
              <option value="Meter">Meter</option>
            </select>
            <select value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
              <option value="">Pilih Site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </form>
        </Modal>
      )}
    </div>
  );
};