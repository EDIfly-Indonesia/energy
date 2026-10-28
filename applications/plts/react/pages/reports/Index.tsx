// src/pages/reports/Index.tsx — REDESIGNED
// Fitur: Filter Site (wajib pilih), Start/End Date (1 bulan otomatis), Generate Report, Clear, Export

import React from 'react';
import { Search, XCircle, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Site } from '@/types';
import { reportsApi, sitesApi } from '@/api';
import { toast } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';

interface ReportRow {
  timestamp: string;
  deviceSN: string;
  deviceName: string;
  parameter: string;
  value: string;
  status: 'NORMAL' | 'WARNING' | 'ALARM';
}

export const Reports: React.FC = () => {
  const [sites, setSites] = React.useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = React.useState(true);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportRow[]>([]);
  const [exporting, setExporting] = React.useState(false);

  // Auto-set End Date ke akhir bulan ketika Start Date dipilih (batas 1 bulan)
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    setStartDate(start);
    if (start) {
      const date = new Date(start + 'T00:00:00'); // parse lokal
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      setEndDate(endOfMonth.toISOString().split('T')[0]);
    }
  };

  React.useEffect(() => {
    const loadSites = async () => {
      try {
        setSitesLoading(true);
        const res = await sitesApi.getSites();
        setSites(res.data.data || []);
      } catch {
        toast.error('Gagal memuat daftar site');
      } finally {
        setSitesLoading(false);
      }
    };
    loadSites();
  }, []);

  const generateReport = async () => {
    if (!selectedSiteId) {
      toast.error('Pilih site terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const res = await reportsApi.getEnergyReport({
        siteId: selectedSiteId,
        startDate,
        endDate
      });
      
      // Transform realtime summary data to report format
      const devices = res.data?.data?.devices || res.data?.devices || [];
      const transformed: ReportRow[] = devices.flatMap((device: any) => {
        const rows: ReportRow[] = [];
        const rt = device.realtime || {};
        const deviceName = device.modelName || device.siteName || '-';
        
        // Production data
        if (rt.power?.p_ac !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'AC Power',
            value: `${Number(rt.power.p_ac).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // DC Power
        if (rt.power?.p_dc !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'DC Power',
            value: `${Number(rt.power.p_dc).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // Load
        if (rt.power?.p_load !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Load',
            value: `${Number(rt.power.p_load).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // Export
        if (rt.power?.p_export !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Export',
            value: `${Number(rt.power.p_export).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // Import
        if (rt.power?.p_import !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Import',
            value: `${Number(rt.power.p_import).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // Voltage
        if (rt.voltage?.v_ac !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'AC Voltage',
            value: `${Number(rt.voltage.v_ac).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} V`,
            status: 'NORMAL'
          });
        }
        
        if (rt.voltage?.v_dc !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'DC Voltage',
            value: `${Number(rt.voltage.v_dc).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} V`,
            status: 'NORMAL'
          });
        }
        
        // Current
        if (rt.current?.i_ac !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'AC Current',
            value: `${Number(rt.current.i_ac).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} A`,
            status: 'NORMAL'
          });
        }
        
        // Frequency
        if (rt.frequency?.f_ac !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Frequency',
            value: `${Number(rt.frequency.f_ac).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Hz`,
            status: 'NORMAL'
          });
        }
        
        // Temperature
        if (rt.temperature?.t_inv !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Temperature',
            value: `${Number(rt.temperature.t_inv).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} °C`,
            status: Number(rt.temperature.t_inv) > 60 ? 'WARNING' : 'NORMAL'
          });
        }
        
        // Battery
        if (rt.battery?.b_soc !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Battery SOC',
            value: `${Number(rt.battery.b_soc).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} %`,
            status: Number(rt.battery.b_soc) < 20 ? 'WARNING' : 'NORMAL'
          });
        }
        
        if (rt.battery?.b_charge !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Battery Charge',
            value: `${Number(rt.battery.b_charge).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        if (rt.battery?.b_discharge !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Battery Discharge',
            value: `${Number(rt.battery.b_discharge).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kW`,
            status: 'NORMAL'
          });
        }
        
        // Energy
        if (rt.energy?.e_daily !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Daily Energy',
            value: `${Number(rt.energy.e_daily).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kWh`,
            status: 'NORMAL'
          });
        }
        
        if (rt.energy?.e_total !== undefined) {
          rows.push({
            timestamp: new Date().toISOString().split('T')[0],
            deviceSN: device.serialNumber || '-',
            deviceName: deviceName,
            parameter: 'Total Energy',
            value: `${Number(rt.energy.e_total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kWh`,
            status: 'NORMAL'
          });
        }
        
        return rows;
      });
      
      setReportData(transformed);
      if (transformed.length === 0) {
        toast.warning('Report berhasil digenerate, namun tidak ada data untuk periode ini');
      } else {
        toast.success(`Report berhasil digenerate: ${transformed.length} entri`);
      }
    } catch (error: any) {
      console.error('Generate report error:', error);
      toast.error('Gagal menghasilkan laporan: ' + (error.message || 'Unknown error'));
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedSiteId('');
    setStartDate('');
    setEndDate('');
    setReportData([]);
  };

  const exportReport = async (format: string) => {
    if (reportData.length === 0) return;
    setExporting(true);
    try {
      // Generate export client-side from reportData
      if (format === 'csv') {
        // CSV generation
        const headers = ['Timestamp', 'Device SN', 'Device Name', 'Parameter', 'Value', 'Status'];
        const csvRows = [headers.join(',')];
        reportData.forEach(row => {
          csvRows.push([
            `"${row.timestamp}"`,
            `"${row.deviceSN}"`,
            `"${row.deviceName}"`,
            `"${row.parameter}"`,
            `"${row.value}"`,
            `"${row.status}"`
          ].join(','));
        });
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `device-report-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success('CSV report downloaded');
      } else if (format === 'xlsx') {
        // Simple XLSX-like HTML table export (opens in Excel)
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        html += '<head><meta charset="utf-8"></head><body><table border="1">';
        html += '<tr><th>Timestamp</th><th>Device SN</th><th>Device Name</th><th>Parameter</th><th>Value</th><th>Status</th></tr>';
        reportData.forEach(row => {
          html += `<tr><td>${row.timestamp}</td><td>${row.deviceSN}</td><td>${row.deviceName}</td><td>${row.parameter}</td><td>${row.value}</td><td>${row.status}</td></tr>`;
        });
        html += '</table></body></html>';
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        downloadBlob(blob, `device-report-${new Date().toISOString().slice(0, 10)}.xls`);
        toast.success('XLSX report downloaded (opens in Excel)');
      } else if (format === 'pdf') {
        // Simple PDF-like text export (for basic print)
        let text = 'Device Report\n';
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '='.repeat(80) + '\n\n';
        text += 'Timestamp'.padEnd(15) + 'Device SN'.padEnd(15) + 'Device Name'.padEnd(25) + 'Parameter'.padEnd(20) + 'Value'.padEnd(20) + 'Status\n';
        text += '-'.repeat(100) + '\n';
        reportData.forEach(row => {
          text += `${row.timestamp.padEnd(15)}${row.deviceSN.padEnd(15)}${row.deviceName.padEnd(25)}${row.parameter.padEnd(20)}${row.value.padEnd(20)}${row.status}\n`;
        });
        const blob = new Blob([text], { type: 'text/plain' });
        downloadBlob(blob, `device-report-${new Date().toISOString().slice(0, 10)}.txt`);
        toast.success('PDF report downloaded (text format)');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Gagal export laporan: ' + (error.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const ExportButtons = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport('csv')}
        loading={exporting}
      >
        <Download className="w-4 h-4" /> CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport('xlsx')}
        loading={exporting}
      >
        <FileSpreadsheet className="w-4 h-4" /> XLSX
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport('pdf')}
        loading={exporting}
      >
        <FileText className="w-4 h-4" /> PDF
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text mb-2 md:mb-0">
        Report Builder
      </h2>
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="flex flex-col md:flex-row md:items-end gap-4">        

        {/* Site Filter (mandatory) */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-scada-muted mb-1">
            Site *
          </label>
          <Select
            label=""
            placeholder="Pilih Site..."
            options={sites.map((site) => ({ value: site.id, label: site.name }))}
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            loading={sitesLoading}
            loadingText="Memuat site..."
            className="w-full"
          />
        </div>

        {/* Start Date */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-scada-muted mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500 text-sm"
          />
        </div>

        {/* End Date (read-only, auto-filled) */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-scada-muted mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-gray-100 dark:bg-scada-bg/50 text-gray-500 cursor-not-allowed text-sm"
          />
        </div>

        {/* Generate & Clear */}
        <Button
          onClick={generateReport}
          loading={loading}
          disabled={!selectedSiteId || sitesLoading}
          className="px-4 py-2 h-9"
        >
          <Search className="w-4 h-4" />
          Generate Report
        </Button>

        <Button
          onClick={clearFilters}
          variant="outline"
          disabled={
            !selectedSiteId && !startDate && !endDate && reportData.length === 0
          }
          className="px-3 py-2 h-9"
        >
          <XCircle className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Export Buttons — hanya tampil jika ada data */}
      {reportData.length > 0 && <ExportButtons />}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Sedang menghasilkan laporan...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && reportData.length === 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow p-8 text-center border border-gray-200 dark:border-scada-border">
          <p className="text-gray-500 dark:text-scada-muted">
            {sitesLoading
              ? 'Memuat daftar site...'
              : !selectedSiteId
              ? 'Pilih site, atur rentang tanggal, lalu klik Generate Report'
              : 'Tidak ada data untuk periode yang dipilih'}
          </p>
        </div>
      )}

      {/* Report Table */}
      {!loading && reportData.length > 0 && (
        <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
              <thead className="bg-gray-50 dark:bg-scada-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Device SN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Device Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Parameter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                {reportData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 dark:hover:bg-scada-bg/50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-scada-text whitespace-nowrap">
                      {row.timestamp}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {row.deviceSN}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {row.deviceName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-scada-text">
                      {row.parameter}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {row.value}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          row.status === 'ALARM'
                            ? 'bg-red-100 text-red-800'
                            : row.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
