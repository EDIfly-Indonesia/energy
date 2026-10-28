// src/utils/formatters.ts
import { format, formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatNumber = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return n.toLocaleString('id-ID');
};

export const formatDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm:ss', { locale: id });
  } catch {
    return '—';
  }
};

export const formatDateTime = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: id });
  } catch {
    return '—';
  }
};

export const formatDistanceToNow = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '—';
  try {
    return fnsFormatDistanceToNow(new Date(dateStr), { locale: id, addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatKwh = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${formatNumber(n)} kWh`;
};

export const formatPercent = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
};

export const formatKw = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${formatNumber(n)} kW`;
};

export const dtLanguageId = {
  decimal: '',
  emptyTable: 'Tidak ada data',
  info: 'Menampilkan _START_ - _END_ dari _TOTAL_ data',
  infoEmpty: 'Menampilkan 0 - 0 dari 0 data',
  infoFiltered: '(filter dari _MAX_ total data)',
  lengthMenu: 'Tampilkan _MENU_ data',
  search: 'Cari:',
  zeroRecords: 'Data tidak ditemukan',
  paginate: {
    first: 'Pertama',
    last: 'Terakhir',
    next: 'Berikutnya',
    previous: 'Sebelumnya',
  },
};