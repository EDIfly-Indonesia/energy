// src/pages/tenants/Index.tsx
import React from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { tenantsApi } from '@/api';
import { Tenant } from '@/types';

export const Tenants: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Tenant | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [form, setForm] = React.useState<Partial<Tenant>>({});

  const fetchTenants = React.useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const res = await tenantsApi.getTenants({
        page,
        limit: pagination.limit,
        search: search || undefined
      });
      const data = res.data.data || [];
      const meta = res.data.meta?.pagination || { total: data.length, totalPages: 1, page, limit: pagination.limit };
      setTenants(data);
      setPagination({ ...pagination, page, total: meta.total, totalPages: meta.totalPages });
    } catch {
      toast.error('Gagal memuat tenants');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.page, pagination.limit]);

  React.useEffect(() => {
    fetchTenants(pagination.page);
  }, [search, pagination.page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await tenantsApi.updateTenant(editing.id, form);
        toast.success('Tenant berhasil diperbarui');
      } else {
        await tenantsApi.createTenant(form);
        toast.success('Tenant berhasil dibuat');
      }
      setShowModal(false);
      fetchTenants(1);
    } catch {
      toast.error('Gagal menyimpan tenant');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (t: Tenant | null = null) => {
    setEditing(t);
    setForm(t ? { name: t.name, address: (t as any).address || '' } : { name: '', address: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Hapus tenant ini?')) {
      try {
        await tenantsApi.deleteTenant(id);
        toast.success('Tenant berhasil dihapus');
        fetchTenants(tenants.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page);
      } catch {
        toast.error('Gagal menghapus tenant');
      }
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Tenants</h2>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Tenant
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            type="text" placeholder="Search tenants..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
          />
        </div>
      </div>

      {loading && <p className="text-center py-8 text-gray-500">Loading...</p>}

      {!loading && filteredTenants.length === 0 && (
        <p className="text-center py-8 text-gray-500 dark:text-scada-muted">Tidak ada tenant ditemukan</p>
      )}

      {!loading && filteredTenants.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
              {filteredTenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{t.address || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(t)} className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Tenant' : 'Tambah Tenant'}
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
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama Tenant"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              required
            />
            <input
              value={form.address || ''}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
            />
          </form>
        </Modal>
      )}
    </div>
  );
};