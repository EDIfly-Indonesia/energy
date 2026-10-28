// src/components/common/StatusBadge.tsx
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  value: number | string;
  trueLabel?: string;
  falseLabel?: string;
  trueClass?: string;
  falseClass?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  value,
  trueLabel = 'Kirim',
  falseLabel = 'Tidak Kirim',
  trueClass = 'bg-green-100 text-green-700',
  falseClass = 'bg-red-100 text-red-700',
}) => {
  const status = Number(value) === 1;
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded',
        status ? trueClass : falseClass
      )}
    >
      {status ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {status ? trueLabel : falseLabel}
    </span>
  );
};