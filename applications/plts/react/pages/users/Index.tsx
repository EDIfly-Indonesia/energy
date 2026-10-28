// src/pages/users/Index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { usersApi, rolesApi, tenantsApi } from '@/api';
import { User, Role, Tenant } from '@/types';

interface UserForm {
  name: string;
  email: string;
  password: string;
  roleId: string | number;
  tenantId: string | number;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState<UserForm>({ name: '', email: '', password: '', roleId: '', tenantId: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getUsers({ search: search || undefined });
      setUsers(res.data.data || []);
    } catch {
      toast.error('Gagal memuat users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [search]);

  useEffect(() => {
    Promise.all([
      rolesApi.getRoles().then(res => setRoles(res.data.data || [])),
      tenantsApi.getTenants().then(res => setTenants(res.data.data || []))
    ]).catch(() => toast.error('Gagal memuat data referensi'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await usersApi.updateUser(editing.id, form);
        toast.success('User berhasil diperbarui');
      } else {
        await usersApi.createUser(form);
        toast.success('User berhasil dibuat');
      }
      setShowModal(false);
      fetchUsers();
    } catch {
      toast.error('Gagal menyimpan user');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (u: User | null = null) => {
    setEditing(u);
    setForm(u ? { name: u.name, email: u.email, password: '', roleId: u.role_id || (u.role as any)?.id || '', tenantId: '' } : { name: '', email: '', password: '', roleId: '', tenantId: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', email: '', password: '', roleId: '', tenantId: '' });
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Hapus user ini?')) {
      try {
        await usersApi.deleteUser(id);
        toast.success('User berhasil dihapus');
        fetchUsers();
      } catch {
        toast.error('Gagal menghapus user');
      }
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Users</h2>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            type="text" placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
          />
        </div>
      </div>

      {loading && <p className="text-center py-8 text-gray-500">Loading...</p>}

      {!loading && filteredUsers.length === 0 && (
        <p className="text-center py-8 text-gray-500 dark:text-scada-muted">Tidak ada user ditemukan</p>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{typeof u.role === 'object' ? (u.role as Role).name : u.role_name || u.role || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(u)} className="text-scada-600 hover:text-scada-900"><Pencil className="w-4 h-4 inline" /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Edit User' : 'Tambah User'}
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
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" required />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" required />
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder="Password" className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text" />
            <select value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
              <option value="">Pilih Role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={form.tenantId} onChange={e => setForm({ ...form, tenantId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text">
              <option value="">Pilih Tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </form>
        </Modal>
      )}
    </div>
  );
};