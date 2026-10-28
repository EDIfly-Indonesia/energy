// src/components/dashboard/InverterMonitor.tsx
import React, { useEffect, useState, useMemo } from 'react';
import telemetryApi from '@/api/modules/telemetry';
import LiveEnergyFlowDrawer from './LiveEnergyFlowDrawer';
import { formatNumberID } from '@/utils/format';

interface RealtimeDeviceSummary {
  id: string;
  serialNumber: string;
  modelName: string;
  status: string;
  siteName?: string;
  errorCode?: string | null;
  /** Label & severity hasil lookup tbl_error_codes (backend) */
  errorLabel?: string | null;
  errorSeverity?: string | null;
  /** Realtime data fetched in batch from getRealtimeSummary */
  realtime?: InverterRealtimeData;
}

interface RealtimeSummaryResponse {
  success: boolean;
  data: {
    totalProduction?: number;
    totalConsumption?: number;
    gridExport?: number;
    gridImport?: number;
    batterySoc?: number;
    onlineDevices?: number;
    totalDevices?: number;
    devices: RealtimeDeviceSummary[];
  };
  errors: null | any;
}

interface InverterRealtimeData {
  power?: { p_ac?: number; p_dc?: number };
  battery?: { b_soc?: number; b_charge?: number; b_discharge?: number };
  voltage?: { v_ac?: number; v_dc?: number };
  current?: { i_ac?: number; i_dc?: number };
  status?: { status?: string };
  energy?: { e_daily?: number; e_total?: number };
  temperature?: { t_inv?: number; t_env?: number };
  frequency?: { f_ac?: number };
  irradiance?: { i_ghi?: number };
  /** Langsung dari measurement `others` (InfluxDB) */
  efficiency?: number;
  cosPhi?: number;
}

interface InverterMonitorProps {
  selectedSiteId?: string | null;
}

// Status color mapping matching DeviceStatusMap patterns
const STATUS_COLOR: Record<string, { bg: string; border: string; label: string }> = {
  ONLINE:      { bg: '#10b981', border: '#059669', label: 'Online' },
  OFFLINE:     { bg: '#ef4444', border: '#dc2626', label: 'Offline' },
  MAINTENANCE: { bg: '#f59e0b', border: '#d97706', label: 'Maintenance' },
};

const getStatusColor = (status?: string) => {
  return STATUS_COLOR[status || 'OFFLINE'] || STATUS_COLOR.OFFLINE;
};

// Warna teks kode error berdasarkan severity (konsisten dgn STATUS_COLOR).
const ERROR_CODE_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-600 dark:text-red-400',
  MAJOR: 'text-orange-600 dark:text-orange-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  MINOR: 'text-yellow-600 dark:text-yellow-400',
  INFO: 'text-sky-600 dark:text-sky-400',
};

const getErrorCodeColor = (severity?: string | null) => {
  return ERROR_CODE_COLOR[severity || 'INFO'] || ERROR_CODE_COLOR.INFO;
};

const formatNumber = (val?: number | null, decimals = 1) => {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (Number.isNaN(num)) return '—';
  return formatNumberID(num, decimals);
};

const MetricItem: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div className="bg-gray-50 dark:bg-scada-bg rounded-lg p-2 text-center">
    <div className="text-lg mb-1">{icon}</div>
    <div className="text-xs text-gray-500 dark:text-scada-muted">{label}</div>
    <div className="text-sm font-semibold text-gray-900 dark:text-scada-text">{value}</div>
  </div>
);

export const InverterMonitor: React.FC<InverterMonitorProps> = ({ selectedSiteId }) => {
  const [devices, setDevices] = useState<RealtimeDeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<RealtimeDeviceSummary | null>(null);

  const openDrawer = (device: RealtimeDeviceSummary) => {
    setSelectedDevice(device);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedDevice(null);
  };

  // Fetch ALL device summaries + realtime data in a SINGLE batch request
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const params = selectedSiteId ? { siteId: selectedSiteId } : {};
        const res = await telemetryApi.getRealtimeSummary(params);
        const data: RealtimeSummaryResponse['data'] = res.data?.data || res.data || {};
        setDevices(Array.isArray(data.devices) ? data.devices : []);
      } catch (error) {
        console.error('Error loading summary:', error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, [selectedSiteId]);

  // Sort devices: online first, then by serial number
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
      return a.serialNumber.localeCompare(b.serialNumber);
    });
  }, [devices]);

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const online = devices.filter(d => d.status === 'ONLINE').length;
    const totalPower = devices.reduce((sum, d) => sum + (d.realtime?.power?.p_ac || 0), 0);
    const avgEfficiency = devices.reduce((sum, d) => {
      const p_ac = d.realtime?.power?.p_ac || 0;
      const p_dc = d.realtime?.power?.p_dc || 0;
      return sum + (p_dc > 0 ? (p_ac / p_dc) * 100 : 0);
    }, 0) / (devices.length || 1);

    return { online, totalPower, avgEfficiency };
  }, [devices]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            Inverter Monitoring
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-50 dark:bg-scada-bg h-10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedDevices.length === 0) {
    return (
      <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            Inverter Monitoring
          </h3>
        </div>
        <div className="p-6 text-center text-gray-500 dark:text-scada-muted">
          No inverter data available for selected site.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border overflow-hidden">
      {/* Header with amber gradient bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-amber-700 to-amber-800 dark:from-amber-800 dark:to-amber-900">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            Inverter Monitoring
          </h3>
          <div className="flex items-center gap-3 text-xs text-amber-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Online ({aggregateMetrics.online}/{devices.length})
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-scada-border bg-gray-50 dark:bg-scada-bg/50">
              <th className="pb-4 pl-6 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider">Inverter</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider">Site</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Power</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Voltage</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Current</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Freq</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Temp</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-right">Efficiency</th>
              <th className="pb-4 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider text-center">Status</th>
              <th className="pb-4 pr-6 text-[10px] font-bold text-gray-500 dark:text-scada-muted uppercase tracking-wider">Error Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
            {sortedDevices.map((device) => {
              const data = device.realtime || {};
              const isOnline = device.status === 'ONLINE';
              // Efisiensi langsung dari measurement `others` (InfluxDB) bila tersedia,
              // fallback ke perhitungan p_ac/p_dc untuk data lama yang belum punya field.
              const efficiency = data.efficiency !== undefined && data.efficiency !== null
                ? Number(data.efficiency)
                : (data.power?.p_ac && data.power?.p_dc
                    ? (data.power.p_ac / data.power.p_dc) * 100
                    : null);

              return (
    <tr key={device.id} className="group hover:bg-gray-50 dark:hover:bg-scada-bg/50 transition-colors cursor-pointer" onClick={() => openDrawer(device)}>
                  <td className="pl-6 py-4 text-sm font-semibold text-amber-800 dark:text-amber-400">
                    {device.serialNumber}
                  </td>
                  <td className="py-4 text-sm text-gray-600 dark:text-scada-muted">
                    {device.siteName || '—'}
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {formatNumber(data.power?.p_ac)} <span className="text-gray-500 dark:text-scada-muted text-xs font-normal ml-1">kW</span>
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {formatNumber(data.voltage?.v_ac)} <span className="text-gray-500 dark:text-scada-muted text-xs font-normal ml-1">V</span>
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {formatNumber(data.current?.i_ac)} <span className="text-gray-500 dark:text-scada-muted text-xs font-normal ml-1">A</span>
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {formatNumber(data.frequency?.f_ac, 2)} <span className="text-gray-500 dark:text-scada-muted text-xs font-normal ml-1">Hz</span>
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {formatNumber(data.temperature?.t_inv)} <span className="text-gray-500 dark:text-scada-muted text-xs font-normal ml-1">°C</span>
                  </td>
                  <td className="py-4 text-sm text-gray-800 dark:text-scada-text text-right font-medium">
                    {efficiency !== null ? `${formatNumberID(efficiency, 1)}%` : '—'}
                  </td>
                  <td className="py-4 text-center">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide`}
                      style={device.status === 'ONLINE'
                        ? { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: STATUS_COLOR.ONLINE.bg, borderColor: STATUS_COLOR.ONLINE.border }
                        : device.status === 'MAINTENANCE'
                        ? { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: STATUS_COLOR.MAINTENANCE.bg, borderColor: STATUS_COLOR.MAINTENANCE.border }
                        : { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: STATUS_COLOR.OFFLINE.bg, borderColor: STATUS_COLOR.OFFLINE.border }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: 
                          device.status === 'ONLINE' ? STATUS_COLOR.ONLINE.bg :
                          device.status === 'MAINTENANCE' ? STATUS_COLOR.MAINTENANCE.bg :
                          STATUS_COLOR.OFFLINE.bg
                        }}
                      />
                      {device.status}
                    </div>
                  </td>
                  <td className="pr-6 py-4 text-sm">
                    {device.errorCode ? (
                      <span className="flex flex-col gap-0.5">
                        <span className={`font-mono text-xs font-semibold ${getErrorCodeColor(device.errorSeverity)}`}>
                          {device.errorCode}
                        </span>
                        {device.errorLabel && (
                          <span className="text-xs text-gray-500 dark:text-scada-muted leading-tight">
                            {device.errorLabel}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-scada-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with aggregate info */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-scada-border bg-gray-50 dark:bg-scada-bg/30 flex justify-between items-center text-xs text-gray-500 dark:text-scada-muted">
        <span>Total Power: {formatNumberID(aggregateMetrics.totalPower, 1)} kW</span>
        <span>Avg Efficiency: {formatNumberID(aggregateMetrics.avgEfficiency, 1)}%</span>
      </div>

      {/* Live Energy Flow Drawer */}
      <LiveEnergyFlowDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        deviceId={selectedDevice?.id}
        deviceName={selectedDevice?.serialNumber}
        selectedSiteId={selectedSiteId}
        deviceRealtime={selectedDevice?.realtime}
      />
    </div>
  );
};

export default InverterMonitor;