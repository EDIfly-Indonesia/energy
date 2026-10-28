// src/pages/rates/Index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, DollarSign, RefreshCw } from 'lucide-react';
import ratesApi, { RatePayload, RateType } from '@/api/modules/rates';
import { toast, confirm } from '@/hooks/useSweetAlert';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatNumberID } from '@/utils/format';
import type { Rate } from '@/types';

interface RateFormState {
  code: string;
  name: string;
  rateType: RateType;
  fixedAmount: string;
  peakRate: string;
  offPeakRate: string;
  peakStartHour: string;
  peakEndHour: string;
  currency: string;
  description: string;
  isActive: boolean;
}

const emptyForm: RateFormState = {
  code: '',
  name: '',
  rateType: 'FIXED',
  fixedAmount: '',
  peakRate: '',
  offPeakRate: '',
  peakStartHour: '17',
  peakEndHour: '22',
  currency: 'IDR',
  description: '',
  isActive: true,
};

export const Rates: React.FC = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [form, setForm] = useState<RateFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ratesApi.getRates();
      setRates(res.data?.data || []);
    } catch (error: any) {
      toast.error('Gagal memuat rates: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const openCreateModal = () => {
    setEditingRate(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (rate: Rate) => {
    setEditingRate(rate);
    setForm({
      code: rate.code || '',
      name: rate.name,
      rateType: rate.rateType === 'PEAK_OFF_PEAK' ? 'PEAK_OFF_PEAK' : 'FIXED',
      fixedAmount: rate.fixedAmount != null ? String(rate.fixedAmount) : '',
      peakRate: rate.peakRate != null ? String(rate.peakRate) : '',
      offPeakRate: rate.offPeakRate != null ? String(rate.offPeakRate) : '',
      peakStartHour: rate.peakStartHour != null ? String(rate.peakStartHour) : '17',
      peakEndHour: rate.peakEndHour != null ? String(rate.peakEndHour) : '22',
      currency: rate.currency || 'IDR',
      description: rate.description || '',
      isActive: rate.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama rate wajib diisi');
      return;
    }

    const isPeakOffPeak = form.rateType === 'PEAK_OFF_PEAK';

    if (!isPeakOffPeak) {
      if (form.fixedAmount === '' || Number.isNaN(Number(form.fixedAmount)) || Number(form.fixedAmount) < 0) {
        toast.error('Tarif (fixedAmount) harus berupa angka ≥ 0');
        return;
      }
    } else {
      if (form.peakRate === '' || Number.isNaN(Number(form.peakRate)) || Number(form.peakRate) < 0) {
        toast.error('Tarif Peak harus berupa angka ≥ 0');
        return;
      }
      if (form.offPeakRate === '' || Number.isNaN(Number(form.offPeakRate)) || Number(form.offPeakRate) < 0) {
        toast.error('Tarif Off-Peak harus berupa angka ≥ 0');
        return;
      }
    }

    setSaving(true);
    const payload: RatePayload = {
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      rateType: form.rateType,
      currency: form.currency.trim() || 'IDR',
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      ...(isPeakOffPeak
        ? {
            peakRate: form.peakRate,
            offPeakRate: form.offPeakRate,
            peakStartHour: Number(form.peakStartHour),
            peakEndHour: Number(form.peakEndHour),
          }
        : {
            fixedAmount: form.fixedAmount,
          }),
    };

    try {
      if (editingRate) {
        await ratesApi.updateRate(editingRate.id, payload);
        toast.success('Rate berhasil diupdate');
      } else {
        await ratesApi.createRate(payload);
        toast.success('Rate berhasil dibuat');
      }
      setModalOpen(false);
      fetchRates();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Gagal menyimpan rate: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rate: Rate) => {
    const ok = await confirm(`Hapus rate "${rate.name}"?`, 'Konfirmasi', 'Hapus', 'Batal');
    if (!ok) return;
    setDeleting(rate.id);
    try {
      await ratesApi.deleteRate(rate.id);
      toast.success('Rate berhasil dihapus');
      fetchRates();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Gagal menghapus rate: ' + msg);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Rates Management</h2>
          <p className="text-sm text-gray-500 dark:text-scada-muted mt-1">Kelola tarif energi (fixed & peak/off-peak)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRates} loading={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> Add Rate
          </Button>
        </div>
      </div>

      {/* Rates Table */}
      <div className="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Memuat data rates...</p>
          </div>
        ) : rates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-scada-muted">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Belum ada rates</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
              <thead className="bg-gray-50 dark:bg-scada-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tarif</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-scada-border">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-scada-text">
                      {rate.code || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-scada-text">
                      {rate.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          rate.rateType === 'PEAK_OFF_PEAK'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                      >
                        {rate.rateType === 'PEAK_OFF_PEAK' ? 'Peak/Off-Peak' : 'Fixed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-scada-text text-right font-semibold">
                      {rate.rateType === 'PEAK_OFF_PEAK'
                        ? `${formatNumberID(rate.peakRate ?? 0, 4)} / ${formatNumberID(rate.offPeakRate ?? 0, 4)}`
                        : rate.fixedAmount != null
                          ? formatNumberID(rate.fixedAmount, 4)
                          : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">
                      {rate.currency || 'IDR'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          rate.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${rate.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(rate)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate)}
                          loading={deleting === rate.id}
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
        title={editingRate ? 'Edit Rate' : 'Create Rate'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                placeholder="e.g., R-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                Currency
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                placeholder="IDR"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              placeholder="e.g., Tarif Industri"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Jenis Tarif *
            </label>
            <select
              value={form.rateType}
              onChange={(e) => setForm({ ...form, rateType: e.target.value as RateType })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
            >
              <option value="FIXED">Fixed Rate</option>
              <option value="PEAK_OFF_PEAK">Peak / Off-Peak Rate</option>
            </select>
          </div>

          {form.rateType === 'FIXED' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                Tarif (fixed) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.fixedAmount}
                onChange={(e) => setForm({ ...form, fixedAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                placeholder="e.g., 1450.5"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                    Tarif Peak (WBP) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.peakRate}
                    onChange={(e) => setForm({ ...form, peakRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                    Tarif Off-Peak (LWBP) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.offPeakRate}
                    onChange={(e) => setForm({ ...form, offPeakRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                    placeholder="e.g., 1000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                    Jam Mulai WBP
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={form.peakStartHour}
                    onChange={(e) => setForm({ ...form, peakStartHour: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
                    Jam Akhir WBP
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={form.peakEndHour}
                    onChange={(e) => setForm({ ...form, peakEndHour: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-scada-text mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              rows={2}
              placeholder="Deskripsi rate..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-scada-600 focus:ring-scada-500"
            />
            <span className="text-sm text-gray-700 dark:text-scada-text">Aktif</span>
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingRate ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Rates;
