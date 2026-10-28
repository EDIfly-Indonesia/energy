// src/pages/invoices/Index.tsx
import React from 'react';
import { Invoice } from '@/types';
import { invoicesApi } from '@/api';
import { toast } from '@/hooks/useSweetAlert';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  React.useEffect(() => {
    invoicesApi.getInvoices().then(res => setInvoices(res.data.data || [])).catch(() => toast.error('Gagal memuat invoices'));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Invoices</h2>
      <p className="text-sm text-gray-500 dark:text-scada-muted">{invoices.length} invoices loaded</p>
    </div>
  );
};