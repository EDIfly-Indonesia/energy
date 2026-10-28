// src/components/common/StatCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type StatCardProps = {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // +/- persentase, misal: 1.2 atau -0.5
    label?: string; // opsional: "dari kemarin" / "dari target"
  } | null;
  // Warna: 'blue' | 'green' | 'yellow' | 'orange' | 'tan'
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'tan' | 'red';
};

// Light theme color palette
const colorMap = {
  blue:   { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-700', text: 'text-blue-900' },
  green:  { bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100', iconText: 'text-green-700', text: 'text-green-900' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-100', iconText: 'text-yellow-700', text: 'text-yellow-900' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-700', text: 'text-orange-900' },
  tan:    { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconText: 'text-amber-700', text: 'text-amber-900' },
  red:    { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconText: 'text-red-700', text: 'text-red-900' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
}) => {
  const colors = colorMap[color];

  return (
    <div className={`p-5 rounded-xl border shadow-sm ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        {/* Icon Box */}
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.iconBg} ${colors.iconText}`}>
            {icon}
          </div>
        )}
        {/* Text Content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {/* Trend */}
          {trend !== undefined && trend !== null ? (
            <div className="mt-2 flex items-center gap-1">
              {trend.value > 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    {Math.abs(trend.value)}% naik
                    {trend.label && ` ${trend.label}`}
                  </span>
                </>
              ) : trend.value < 0 ? (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-medium text-red-600">
                    {Math.abs(trend.value)}% turun
                    {trend.label && ` ${trend.label}`}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-500">
                    Tidak ada perubahan
                    {trend.label && ` ${trend.label}`}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1">
              <Minus className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-400 italic">
                Trend not defined
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
