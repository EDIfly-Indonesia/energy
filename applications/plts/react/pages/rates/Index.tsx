// src/pages/rates/Index.tsx
import React from 'react';
import { Rate } from '@/types';
import { ratesApi } from '@/api';
import { toast } from '@/hooks/useSweetAlert';

export const Rates: React.FC = () => {
  const [rates, setRates] = React.useState<Rate[]>([]);
  React.useEffect(() => {
    ratesApi.getRates().then(res => setRates(res.data.data || [])).catch(() => toast.error('Gagal memuat rates'));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Rates</h2>
      <p className="text-sm text-gray-500 dark:text-scada-muted">{rates.length} rates loaded</p>
    </div>
  );
};