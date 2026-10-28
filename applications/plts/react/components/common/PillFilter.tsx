// src/components/common/PillFilter.tsx
import React from 'react';
import { clsx } from 'clsx';

interface PillOption {
  label: string;
  value: string;
}

interface PillFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: PillOption[];
}

const defaultOptions: PillOption[] = [
  { label: 'Today', value: 'today' },
  { label: '24h', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
];

export const PillFilter: React.FC<PillFilterProps> = ({
  value,
  onChange,
  options = defaultOptions,
}) => {
  return (
    <div className="flex items-center p-1 bg-gray-100 dark:bg-scada-bg rounded-full w-fit">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
            value === option.value
              ? 'bg-white dark:bg-scada-card text-gray-900 dark:text-scada-text shadow-sm'
              : 'text-gray-500 dark:text-scada-muted hover:text-gray-700 dark:hover:text-scada-text'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};