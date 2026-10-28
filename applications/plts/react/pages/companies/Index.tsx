// src/pages/companies/Index.tsx
import React from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { companiesApi, tenantsApi } from '@/api';
import { Company, Tenant } from '@/types';

interface CompanyForm {
  name: string;
  tenantId: string | number;
}

export const Companies: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [form, setForm] = React.useState<CompanyForm>({ name: '', tenantId: '' });

  const fetchCompanies = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await companiesApi.getCompanies({ search: search || undefined });
      setCompanies(res.data.data || []);
    } catch {
      toast.error('Gagal memuat companies');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchCompanies();
  }, [search]);

  React.useEffect(() => {
    tenantsApi.getTenants().then(res => setTenants(res.data.data || [])).catch(() => toast.error('Gagal memuat tenants'));
  }, []);

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await companiesApi.updateCompany(editing.id, form);
        toast.success('Company berhasil diperbarui');
      } else {
        await companiesApi.createCompany(form);
        toast.success('Company berhasil dibuat');
      }
      setShowModal(false);
      fetchCompanies();
    } catch {
      toast.error('Gagal menyimpan company');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (c: Company | null = null) => {
    setEditing(c);
    setForm(c ? { name: c.name, tenantId: c.tenancy?.id || '' } : { name: '', tenantId: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', tenantId: '' });
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Hapus company ini?')) {
      try {
        await companiesApi.deleteCompany(id);
        toast.success('Company berhasil dihapus');
        fetchCompanies();
      } catch {
        toast.error('Gagal menghapus company');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Companies</h2>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            type="text" placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
          />
        </div>
      </div>

      {loading && <p className="text-center py-8 text-gray-500">Loading...</p>}

      {!loading && filteredCompanies.length === 0 && (
        <p className="text-center py-8 text-gray-500 dark:text-scada-muted">Tidak ada company ditemukan</p>
      )}

      {!loading && filteredCompanies.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
              {filteredCompanies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{c.name}</td>
                                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                    {c.tenancy ? (c.tenancy as Tenant).name : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(c)} className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit Company' : 'Tambah Company'}
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
              placeholder="Nama Company"
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
              required
            />
            <select
              value={form.tenantId || ''}
              onChange={e => setForm({ ...form, tenantId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text"
            >
              <option value="">Pilih Tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </form>
        </Modal>
      )}
    </div>
  );
};