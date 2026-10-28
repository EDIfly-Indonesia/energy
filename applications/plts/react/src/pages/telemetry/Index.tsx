// src/pages/telemetry/Index.tsx
import React from 'react';
import { TelemetryData } from '@/types';
import { telemetryApi } from '@/api';
import { toast } from '@/hooks/useSweetAlert';

export const Telemetry: React.FC = () => {
  const [telemetryData, setTelemetryData] = React.useState<TelemetryData[]>([]);
  React.useEffect(() => {
    telemetryApi.getTelemetryData().then(res => setTelemetryData(res.data.data || [])).catch(() => toast.error('Gagal memuat telemetry'));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Telemetry</h2>
      <p className="text-sm text-gray-500 dark:text-scada-muted">{telemetryData.length} telemetry records loaded</p>
    </div>
  );
};