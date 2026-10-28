// src/components/dashboard/StatCard.tsx
import React from 'react';
import { clsx } from 'clsx';
import * as LucideIcons from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  realtimeValue?: string | number;
  unit?: string;
  icon: keyof typeof LucideIcons;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  realtimeValue,
  unit,
  icon,
  color = 'blue',
}) => {
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Server;
  
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    yellow: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-500',
  };

  return (
    <div className="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-scada-muted">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-scada-text mt-1 tracking-tight">
            {value}
          </p>
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', colorMap[color])}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wider">Live</span>
        {realtimeValue !== undefined && (
          <span className="text-xs font-bold text-gray-700 dark:text-scada-text ml-auto">
            {realtimeValue} {unit}
          </span>
        )}
      </div>
    </div>
  );
};