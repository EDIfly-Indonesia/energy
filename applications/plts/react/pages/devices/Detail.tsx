// src/pages/devices/Detail.tsx
import React from 'react';
import { useParams } from 'react-router-dom';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Device Detail (ID: {id})</h2>
      <p className="text-gray-500 dark:text-scada-muted">Device detail page is under construction.</p>
    </div>
  );
};