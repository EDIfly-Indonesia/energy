// src/stores/telemetry.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import telemetryApi from '@/api/modules/telemetry';

interface TelemetryState {
  realtimeData: Record<string, any>;
  aggregates: any[];
  summary: any;
  devices: any[];

  isRealtimeLoading: boolean;
  isAggregatesLoading: boolean;
  isSummaryLoading: boolean;

  lastError: string | null;
  consecutiveFailures: number;

  fetchRealtimeSummary: (params?: Record<string, any>) => Promise<void>;
  fetchAggregates: (params?: Record<string, any>) => Promise<void>;
  fetchLatestAggregates: (params?: Record<string, any>) => Promise<void>;
  fetchSummary: (params?: Record<string, any>) => Promise<void>;

  resetError: () => void;
}

const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

export const useTelemetryStore = create<TelemetryState>()(
  devtools((set, get) => ({
    realtimeData: {},
    aggregates: [],
    summary: { todayProduction: '0', todayConsumption: '0', batteryCharging: '0', batteryDischarging: '0', batteryCapacity: '0' },
    devices: [],
    isRealtimeLoading: false,
    isAggregatesLoading: false,
    isSummaryLoading: false,
    lastError: null,
    consecutiveFailures: 0,

    fetchRealtimeSummary: async (params) => {
      const { isRealtimeLoading, consecutiveFailures } = get();
      if (isRealtimeLoading || consecutiveFailures >= 3) return;

      set({ isRealtimeLoading: true, lastError: null });
      try {
        const res = await telemetryApi.getRealtimeSummary(params);
        const devs = res?.data?.data?.devices || res?.data?.devices || [];
        const data: Record<string, any> = {};
        devs.forEach((d: any) => {
          data[d.id || d.deviceId] = { ...d.realtime, status: d.status };
        });
        set({
          realtimeData: data,
          summary: res?.data?.data || res?.data,
          devices: devs,
          isRealtimeLoading: false,
          consecutiveFailures: 0
        });
      } catch (error: any) {
        const isRateLimited = error?.response?.status === 429;
        set((s) => ({
          isRealtimeLoading: false,
          lastError: isRateLimited
            ? `Rate limited (429) — backing off`
            : error?.message || 'Failed to fetch real-time data',
          consecutiveFailures: isRateLimited ? s.consecutiveFailures + 1 : 0,
          devices: []
        }));
      }
    },

    fetchAggregates: async (params) => {
      const { isAggregatesLoading, consecutiveFailures } = get();
      if (isAggregatesLoading || consecutiveFailures >= 3) return;

      set({ isAggregatesLoading: true, lastError: null });
      try {
        const res = await telemetryApi.getTelemetryAggregates(params);
        const data = res?.data?.data || [];
        set({
          aggregates: Array.isArray(data) ? data : [],
          isAggregatesLoading: false,
          consecutiveFailures: 0
        });
      } catch (error: any) {
        const isRateLimited = error?.response?.status === 429;
        set((s) => ({
          isAggregatesLoading: false,
          lastError: isRateLimited ? 'Rate limited (429) — backing off' : error?.message,
          consecutiveFailures: isRateLimited ? s.consecutiveFailures + 1 : 0
        }));
      }
    },

    // Compatibility alias for Dashboard Index.tsx
    fetchLatestAggregates: async (params) => {
      const { isAggregatesLoading, consecutiveFailures } = get();
      if (isAggregatesLoading || consecutiveFailures >= 3) return;

      set({ isAggregatesLoading: true, lastError: null });
      try {
        const res = await telemetryApi.getLatestAggregates(params);
        const grouped = res?.data?.data || {};
        // Flatten grouped object into array
        let flat: any[] = [];
        if (Array.isArray(grouped)) {
          flat = grouped;
        } else if (typeof grouped === 'object') {
          Object.values(grouped).forEach((v: any) => {
            if (Array.isArray(v)) flat.push(...v);
          });
        }
        set({
          aggregates: flat,
          isAggregatesLoading: false,
          consecutiveFailures: 0
        });
      } catch (error: any) {
        const isRateLimited = error?.response?.status === 429;
        set((s) => ({
          isAggregatesLoading: false,
          lastError: isRateLimited ? 'Rate limited (429) — backing off' : error?.message,
          consecutiveFailures: isRateLimited ? s.consecutiveFailures + 1 : 0
        }));
      }
    },

    fetchSummary: async (params) => {
      const { isSummaryLoading, consecutiveFailures } = get();
      if (isSummaryLoading || consecutiveFailures >= 3) return;

      set({ isSummaryLoading: true, lastError: null });
      try {
        const res = await telemetryApi.getSummary(params);
        set({
          summary: res?.data?.data || {},
          isSummaryLoading: false,
          consecutiveFailures: 0
        });
      } catch (error: any) {
        const isRateLimited = error?.response?.status === 429;
        set((s) => ({
          isSummaryLoading: false,
          lastError: isRateLimited ? 'Rate limited (429) — backing off' : error?.message,
          consecutiveFailures: isRateLimited ? s.consecutiveFailures + 1 : 0
        }));
      }
    },

    resetError: () => set({ lastError: null, consecutiveFailures: 0 })
  }))
);

export default useTelemetryStore;