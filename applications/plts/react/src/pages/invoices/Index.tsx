// src/pages/invoices/Index.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, RefreshCw, Eye, FileText, Trash2 } from 'lucide-react';
import invoicesApi from '@/api/modules/invoices';
import ratesApi from '@/api/modules/rates';
import tenantsApi from '@/api/modules/tenants';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { formatNumberID } from '@/utils/format';
import type { Invoice, Tenant, Rate, InvoiceUsageRow } from '@/types';

interface GenerateForm {
  tenantId: string;
  month: string; // YYYY-MM
  rateId: string; // '' = auto
}

const emptyForm: GenerateForm = { tenantId: '', month: '', rateId: '' };

type UsageGroupBy = 'date' | 'site';

const statusColor = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'PAID':
    case 'SENT':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'DRAFT':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'OVERDUE':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
};

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<GenerateForm>(emptyForm);
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState<Invoice | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Rincian pemakaian harian (detail modal).
  const [usageRows, setUsageRows] = useState<InvoiceUsageRow[]>([]);
  const [usageGroupBy, setUsageGroupBy] = useState<UsageGroupBy>('date');
  const [usageLoading, setUsageLoading] = useState(false);

  const openDetail = useCallback(async (inv: Invoice) => {
    setDetail(inv);
    setUsageRows([]);
    setUsageGroupBy('date');
    setUsageLoading(true);
    try {
      const res = await invoicesApi.getInvoiceUsage(inv.id, { groupBy: 'date' });
      setUsageRows(res.data?.data?.rows || []);
    } catch (error: any) {
      toast.error('Gagal memuat rincian: ' + (error.message || 'Unknown error'));
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const changeUsageGroupBy = useCallback(async (g: UsageGroupBy) => {
    if (!detail) return;
    setUsageGroupBy(g);
    setUsageLoading(true);
    try {
      const res = await invoicesApi.getInvoiceUsage(detail.id, { groupBy: g });
      setUsageRows(res.data?.data?.rows || []);
    } catch (error: any) {
      toast.error('Gagal memuat rincian: ' + (error.message || 'Unknown error'));
    } finally {
      setUsageLoading(false);
    }
  }, [detail]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getInvoices();
      setInvoices(res.data?.data || []);
    } catch (error: any) {
      toast.error('Gagal memuat invoices: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Muat daftar tenant & rate (untuk modal generate) sekali saat modal dibuka pertama kali.
  const loadOptions = useCallback(async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        tenantsApi.getTenants(),
        ratesApi.getRates({ limit: 100 }),
      ]);
      setTenants(tRes.data?.data || []);
      setRates((rRes.data?.data || []).filter((r: Rate) => r.isActive));
    } catch (error: any) {
      toast.error('Gagal memuat opsi: ' + (error.message || 'Unknown error'));
    }
  }, []);

  const openModal = () => {
    setForm({
      ...emptyForm,
      month: new Date().toISOString().slice(0, 7),
    });
    setModalOpen(true);
    loadOptions();
  };

  const handleGenerate = async () => {
    if (!form.tenantId) {
      toast.error('Pilih tenant terlebih dahulu');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.month)) {
      toast.error('Bulan harus format YYYY-MM (contoh: 2026-08)');
      return;
    }

    setGenerating(true);
    try {
      const res = await invoicesApi.generateInvoice({
        tenantId: form.tenantId,
        month: form.month,
        rateId: form.rateId || undefined,
      });
      toast.success('Invoice berhasil digenerate');
      setModalOpen(false);
      fetchInvoices();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Gagal generate invoice: ' + msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    const ok = await confirm(`Hapus invoice "${inv.number}"?`, 'Konfirmasi', 'Hapus', 'Batal');
    if (!ok) return;
    setDeletingId(inv.id);
    try {
      await invoicesApi.deleteInvoice(inv.id);
      toast.success('Invoice dihapus');
      fetchInvoices();
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const totalAmount = useMemo(
    () => invoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0),
    [invoices]
  );

  const tenantOptions = tenants.map((t) => ({ value: t.id, label: t.name }));
  const rateOptions = rates.map((r) => ({
    value: r.id,
    label: `${r.name} (${r.rateType === 'PEAK_OFF_PEAK' ? 'Peak/Off-Peak' : 'Fixed'})`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Invoices</h2>
          <p className="text-sm text-gray-500 dark:text-scada-muted mt-1">
            {invoices.length} invoice · total Rp {formatNumberID(totalAmount, 2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvoices} loading={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openModal}>
            <Plus className="w-4 h-4" /> Generate Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Memuat data invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-scada-muted">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Belum ada invoice</p>
            <p className="text-xs mt-1">Klik "Generate Invoice" untuk membuat tagihan bulanan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
              <thead className="bg-gray-50 dark:bg-scada-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-scada-text">
                      {inv.number || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">
                      {inv.tenantName || inv.tenant?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {formatDate(inv.date || inv.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-scada-muted">
                      {inv.items?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-scada-text text-right font-semibold">
                      {inv.currency || 'IDR'} {formatNumberID(inv.total, 2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColor(inv.status)}`}>
                        {inv.status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(inv)} title="Lihat detail">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inv)}
                          loading={deletingId === inv.id}
                          title="Hapus"
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

      {/* Modal Generate */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Generate Invoice" size="lg">
        <div className="space-y-4">
          <Select
            label="Tenant *"
            options={tenantOptions}
            placeholder="Pilih tenant..."
            value={form.tenantId}
            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Bulan (YYYY-MM) *
            </label>
            <input
              type="month"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
            />
          </div>
          <Select
            label="Rate (opsional — auto pilih rate aktif tenant bila kosong)"
            options={[{ value: '', label: '(Auto — rate aktif tenant)' }, ...rateOptions]}
            value={form.rateId}
            onChange={(e) => setForm({ ...form, rateId: e.target.value })}
          />
          <p className="text-xs text-gray-500 dark:text-scada-muted">
            Invoice dihitung dari data pemakaian energi bulan terpilih. Rate FIXED menghasilkan 1
            item; rate Peak/Off-Peak menghasilkan 2 item (WBP 17:00–22:00 & LWBP).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={generating}>Generate</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={`Detail Invoice — ${detail?.number || ''}`} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-scada-muted">Tenant</p>
                <p className="font-medium text-gray-900 dark:text-scada-text">{detail.tenantName || detail.tenant?.name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-scada-muted">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(detail.status)}`}>
                  {detail.status || 'DRAFT'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-scada-muted">Tanggal</p>
                <p className="text-gray-900 dark:text-scada-text">{formatDate(detail.date || detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-scada-muted">Jatuh Tempo</p>
                <p className="text-gray-900 dark:text-scada-text">{formatDate(detail.dueDate)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-scada-border">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
                <thead className="bg-gray-50 dark:bg-scada-bg">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tarif</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                  {(detail.items || []).map((it, i) => {
                    const subtotal = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                    return (
                      <tr key={it.id || i}>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-scada-text">{it.unit || 'kWh'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-scada-text text-right">{formatNumberID(it.qty, 2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-scada-text text-right">{formatNumberID(it.rate, 4)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-scada-text text-right font-semibold">
                          {formatNumberID(subtotal, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-scada-muted">
                  <span>Subtotal</span>
                  <span>{detail.currency || 'IDR'} {formatNumberID(detail.subtotal, 2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-scada-muted">
                  <span>Pajak</span>
                  <span>{detail.currency || 'IDR'} {formatNumberID(detail.totalTax || '0', 2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-scada-text text-base pt-1 border-t border-gray-200 dark:border-scada-border">
                  <span>Total</span>
                  <span>{detail.currency || 'IDR'} {formatNumberID(detail.total, 2)}</span>
                </div>
              </div>
            </div>

            {/* Rincian Pemakaian Harian */}
            <div className="border-t border-gray-200 dark:border-scada-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-scada-text">
                  Rincian Pemakaian Energi — {detail.billingPeriod || '—'}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeUsageGroupBy('date')}
                    className={`px-2.5 py-1 text-xs rounded ${usageGroupBy === 'date' ? 'bg-scada-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-scada-muted'}`}
                  >
                    Per Hari
                  </button>
                  <button
                    onClick={() => changeUsageGroupBy('site')}
                    className={`px-2.5 py-1 text-xs rounded ${usageGroupBy === 'site' ? 'bg-scada-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-scada-muted'}`}
                  >
                    Per Site
                  </button>
                </div>
              </div>

              {usageLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">Memuat rincian...</div>
              ) : usageRows.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-scada-muted">
                  Belum ada data pemakaian untuk periode ini.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-gray-200 dark:border-scada-border max-h-72 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
                    <thead className="bg-gray-50 dark:bg-scada-bg sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {usageGroupBy === 'site' ? 'Site' : 'Tanggal'}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total (kWh)</th>
                        {usageRows[0]?.peakKwh !== undefined && (
                          <>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">WBP (kWh)</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">LWBP (kWh)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                      {usageRows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-scada-text">
                            {usageGroupBy === 'site' ? r.siteName : r.date}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-scada-text text-right font-medium">
                            {formatNumberID(r.totalKwh, 2)}
                          </td>
                          {r.peakKwh !== undefined && (
                            <>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-scada-text text-right">
                                {formatNumberID(r.peakKwh, 2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-700 dark:text-scada-text text-right">
                                {formatNumberID(r.offPeakKwh, 2)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invoices;
