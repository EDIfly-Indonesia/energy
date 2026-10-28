// src/pages/alarms/Index.tsx
import React from 'react';
import { Alarm } from '@/types';
import { alarmsApi } from '@/api';
import { toast } from '@/hooks/useSweetAlert';
import { Search, CheckCircle, Pencil, Trash2 } from 'lucide-react';

export const Alarms: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [alarms, setAlarms] = React.useState<Alarm[]>([]);

  React.useEffect(() => {
    fetchAlarms();
  }, []);

  const fetchAlarms = async () => {
    try {
      const params: Record<string, string> = {};
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await alarmsApi.getAlarms(params);
      setAlarms((res.data.data || []).map((a: any) => ({
        id: a.id,
        time: new Date(a.createdAt).toLocaleString('id-ID'),
        deviceName: a.device?.serialNumber || '-',
        code: a.errorCode || '-',
        message: a.message || '-',
        severity: (a.severity || 'info').toLowerCase(),
        status: a.isSynthetic
          ? (a.resolvedAt ? 'resolved' : 'inactive')
          : (a.resolvedAt ? 'resolved' : 'active')
      })));
    } catch {
      toast.error('Gagal memuat alarm');
    }
  };

  const filteredAlarms = alarms.filter(a => {
    let match = true;
    if (severityFilter && a.severity !== severityFilter) match = false;
    if (statusFilter && a.status !== statusFilter) match = false;
    if (search && ![a.deviceName, a.code, a.message, a.severity, a.status].join(' ').toLowerCase().includes(search.toLowerCase())) match = false;
    return match;
  });

  const criticalCount = alarms.filter(a => a.severity === 'critical').length;
  const warningCount = alarms.filter(a => a.severity === 'warning').length;
  const inactiveCount = alarms.filter(a => a.status === 'inactive').length;
  const resolvedCount = alarms.filter(a => a.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Total Alarms</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-scada-text">{alarms.length}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Critical</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Warning</p>
          <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Inactive</p>
          <p className="text-2xl font-bold text-orange-600">{inactiveCount}</p>
        </div>
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
          <p className="text-sm text-gray-500 dark:text-scada-muted">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search alarms..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500">
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500">
  <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
            {filteredAlarms.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{a.time}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-scada-text">{a.deviceName}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{a.code}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{a.message}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${a.severity === 'critical' ? 'bg-red-100 text-red-800' : a.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{a.severity}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${a.status === 'active' ? 'bg-red-100 text-red-800' : a.status === 'inactive' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>{a.status}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  {a.status === 'active' && <button className="text-green-600 hover:text-green-800"><CheckCircle className="w-4 h-4 inline" /></button>}
                  <button className="text-scada-600 hover:text-scada-900 ml-2"><Pencil className="w-4 h-4 inline" /></button>
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