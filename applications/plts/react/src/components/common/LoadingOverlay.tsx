// src/components/common/LoadingOverlay.tsx
import React from 'react';

interface LoadingOverlayProps {
  show: boolean;
  text?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, text = 'Memuat data...' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">
          {text}
          <span className="animate-pulse">...</span>
        </p>
      </div>
    </div>
  );
};