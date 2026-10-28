// src/pages/roles/Index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Shield, RefreshCw } from 'lucide-react';
import rolesApi from '@/api/modules/roles';
import { toast } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useAuthStore } from '@/stores/auth.store';
import { can } from '@/utils/permission';

interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role_name === 'super_admin';

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getRoles();
      setRoles(res.data?.data || []);
    } catch (error: any) {
      toast.error('Gagal memuat roles: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama role wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await rolesApi.updateRole(editingRole.id, formData);
        toast.success('Role berhasil diupdate');
      } else {
        await rolesApi.createRole(formData);
        toast.success('Role berhasil dibuat');
      }
      setModalOpen(false);
      fetchRoles();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Gagal menyimpan role: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    setDeleting(role.id);
    try {
      await rolesApi.deleteRole(role.id);
      toast.success('Role berhasil dihapus');
      fetchRoles();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Gagal menghapus role: ' + msg);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Roles Management</h2>
          <p className="text-sm text-gray-500 dark:text-scada-muted mt-1">Manage user roles and access levels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRoles} loading={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Memuat data roles...</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-scada-muted">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Belum ada roles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
              <thead className="bg-gray-50 dark:bg-scada-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-scada-100 dark:bg-scada-900/30 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-scada-600 dark:text-scada-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-scada-text">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {role.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {role.created_at ? new Date(role.created_at).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(role)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(role)}
                          loading={deleting === role.id}
                          disabled={role.name === 'super_admin'}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRole ? 'Edit Role' : 'Create Role'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Role Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              placeholder="e.g., field_operator"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              rows={3}
              placeholder="Role description..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Roles;