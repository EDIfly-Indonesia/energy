// src/components/dashboard/LiveEnergyFlowDrawer.tsx
import React from 'react';
import { X, Zap } from 'lucide-react';
import LiveEnergyFlow from './LiveEnergyFlow';

interface LiveEnergyFlowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId?: string | null;
  deviceName?: string;
  selectedSiteId?: string | null;
  /** Data realtime device terpilih — diteruskan agar animasi tetap tampil
   *  meski store global belum memuat data untuk site/device tersebut. */
  deviceRealtime?: any;
}

export const LiveEnergyFlowDrawer: React.FC<LiveEnergyFlowDrawerProps> = ({
  isOpen,
  onClose,
  deviceId,
  deviceName,
  selectedSiteId,
  deviceRealtime,
}) => {
  if (!isOpen) return null;
  

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-scada-card shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-scada-border bg-gradient-to-r from-green-600 to-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">
                Live Energy Flows
              </h2>
              {deviceName && (
                <p className="text-xs text-white/80">{deviceName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <LiveEnergyFlow selectedSiteId={selectedSiteId} deviceRealtime={deviceRealtime} />
          
          {/* Device Info */}
          {deviceId && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-scada-bg rounded-lg border border-gray-200 dark:border-scada-border">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-scada-muted uppercase tracking-wider mb-2">
                Device Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-scada-muted">Device ID</p>
                  <p className="font-medium text-gray-900 dark:text-scada-text font-mono text-xs">
                    {deviceId}
                  </p>
                </div>
                {deviceName && (
                  <div>
                    <p className="text-gray-500 dark:text-scada-muted">Device Name</p>
                    <p className="font-medium text-gray-900 dark:text-scada-text">{deviceName}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LiveEnergyFlowDrawer;