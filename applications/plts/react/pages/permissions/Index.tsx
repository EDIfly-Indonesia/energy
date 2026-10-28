// src/pages/permissions/Index.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Shield, RefreshCw, Lock } from 'lucide-react';
import permissionsApi from '@/api/modules/permissions';
import { toast } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';

interface Permission {
  id: string;
  capability: string;
  module: string;
}

export const Permissions: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await permissionsApi.getPermissions();
      setPermissions(res.data?.data || []);
    } catch (error: any) {
      toast.error('Gagal memuat permissions: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Permissions</h2>
          <p className="text-sm text-gray-500 dark:text-scada-muted mt-1">View system permission matrix</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPermissions} loading={loading}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-scada-muted">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Belum ada permissions terdaftar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <div key={module} className="bg-white dark:bg-scada-card rounded-lg shadow border border-gray-200 dark:border-scada-border p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-scada-text capitalize mb-3 pb-2 border-b dark:border-scada-border">{module}</h3>
              <ul className="space-y-2">
                {perms.map((p: Permission) => (
                  <li key={p.id} className="text-xs text-gray-600 dark:text-scada-muted flex items-center gap-2">
                    <Shield className="w-3 h-3 text-scada-500" />
                    {p.capability}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Permissions;