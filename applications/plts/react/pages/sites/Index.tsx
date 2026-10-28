// src/pages/sites/Index.tsx
import React from 'react';
import { Plus, Search, Pencil, Trash2, MapPin } from 'lucide-react';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { sitesApi, tenantsApi, companiesApi } from '@/api';
import { Site, Tenant, Company } from '@/types';

interface SiteForm {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacityKwp?: number;
  tenantId: string | number;
  companyId: string | number;
}

export const Sites: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Site | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [form, setForm] = React.useState<SiteForm>({ name: '', address: '', latitude: 0, longitude: 0, capacityKwp: 0, tenantId: '', companyId: '' });

  const fetchSites = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await sitesApi.getSites({ search: search || undefined });
      setSites(res.data.data || []);
    } catch {
      toast.error('Gagal memuat sites');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchSites();
  }, [search]);

  React.useEffect(() => {
    Promise.all([
      tenantsApi.getTenants().then(res => setTenants(res.data.data || [])),
      companiesApi.getCompanies().then(res => setCompanies(res.data.data || []))
    ]).catch(() => toast.error('Gagal memuat data referensi'));
  }, []);

  const filteredSites = sites.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tenantId: form.tenantId || undefined,
        companyId: form.companyId || undefined
      };
      if (editing) {
        await sitesApi.updateSite(editing.id, payload);
        toast.success('Site berhasil diperbarui');
      } else {
        await sitesApi.createSite(payload);
        toast.success('Site berhasil dibuat');
      }
      setShowModal(false);
      fetchSites();
    } catch {
      toast.error('Gagal menyimpan site');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (s: Site | null = null) => {
    setEditing(s);
    setForm(s ? { name: s.name, address: s.address || '', latitude: s.latitude as number || 0, longitude: s.longitude as number || 0, capacityKwp: s.capacityKwp as number || 0, tenantId: s.tenant?.id || '', companyId: s.company?.id || '' } : { name: '', address: '', latitude: 0, longitude: 0, capacityKwp: 0, tenantId: '', companyId: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', address: '', latitude: 0, longitude: 0, capacityKwp: 0, tenantId: '', companyId: '' });
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Hapus site ini?')) {
      try {
        await sitesApi.deleteSite(id);
        toast.success('Site berhasil dihapus');
        fetchSites();
      } catch {
        toast.error('Gagal menghapus site');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Sites</h2>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Site
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            type="text" placeholder="Search sites..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
          />
        </div>
      </div>

      {loading && <p className="text-center py-8 text-gray-500">Loading...</p>}

      {!loading && filteredSites.length === 0 && (
        <p className="text-center py-8 text-gray-500 dark:text-scada-muted">Tidak ada site ditemukan</p>
      )}

      {!loading && filteredSites.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity (kWp)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lng</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
              {filteredSites.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{s.capacityKwp ? Number(s.capacityKwp).toFixed(2) : '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{s.latitude ? Number(s.latitude).toFixed(8) : '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{s.longitude ? Number(s.longitude).toFixed(8) : '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(s)} className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Site' : 'Tambah Site'}
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
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama Site"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              required
            />
            <input
              value={form.address || ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number" step="0.00000001"
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                placeholder="Latitude"
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              />
              <input
                type="number" step="0.00000001"
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                placeholder="Longitude"
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              />
            </div>
            <input
              type="number" step="0.01"
              value={form.capacityKwp || 0}
              onChange={e => setForm({ ...form, capacityKwp: parseFloat(e.target.value) })}
              placeholder="Capacity (kWp)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={form.tenantId}
                onChange={e => setForm({ ...form, tenantId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              >
                <option value="">Pilih Tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select
                value={form.companyId}
                onChange={e => setForm({ ...form, companyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              >
                <option value="">Pilih Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};