// src/pages/dashboard/Index.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart3, Zap, Sun, Battery, TrendingUp, TrendingDown } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { useTelemetryStore } from '@/stores/telemetry.store';
import { formatNumberID } from '@/utils/format';
import telemetryApi from '@/api/modules/telemetry';
import { DeviceStatusMap } from '@/components/dashboard/DeviceStatusMap';
import { DashboardFilter } from '@/components/dashboard/DashboardFilter';
import { ConsumptionHeatmap } from '@/components/dashboard/ConsumptionHeatmap';
import { InverterMonitor } from '@/components/dashboard/InverterMonitor';
import { LiveEnergyFlow } from '@/components/dashboard/LiveEnergyFlow';

export const Dashboard: React.FC = () => {
  const { aggregates, summary, realtimeData, devices, fetchLatestAggregates, fetchSummary, fetchRealtimeSummary } = useTelemetryStore();
  
  const [filters, setFilters] = useState({
    siteId: null as string | null,
    timeRange: 'today' as string,
    startDate: '',
    endDate: ''
  });
  
  // Data ringkasan harian (hari ini vs kemarin) sebagai pembanding trend yang nyata
  const [dailyRows, setDailyRows] = useState<any[]>([]);

  useEffect(() => {
    fetchLatestAggregates({ siteId: filters.siteId || undefined });
    fetchSummary({ siteId: filters.siteId || undefined });
    fetchRealtimeSummary({ siteId: filters.siteId || undefined });
  }, [fetchLatestAggregates, fetchSummary, fetchRealtimeSummary, filters.siteId]);

  useEffect(() => {
    telemetryApi
      .getDailySummary({ siteId: filters.siteId || undefined })
      .then((res) => {
        const rows = res?.data?.data;
        setDailyRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setDailyRows([]));
  }, [filters.siteId]);
  
  const getAggValue = useMemo(() => {
    return (standardKey: string) => {
      const group = aggregates?.[standardKey];
      if (!group || !Array.isArray(group) || group.length === 0) return '—';
      const sum = group.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0);
      return (sum / group.length).toFixed(1);
    };
  }, [aggregates]);

  // Format nilai agregat menjadi persen berformat Indonesia ('—' bila kosong)
  const formatPercent = (raw: string) =>
    raw === '—' ? '—' : `${formatNumberID(raw)}%`;

  // Format nilai menjadi angka berformat Indonesia + satuan ('—' bila kosong)
  const formatUnit = (raw: string | number | undefined | null, unit = '') =>
    raw === '—' || raw === undefined || raw === null || raw === ''
      ? '—'
      : `${formatNumberID(raw)}${unit}`;
  
  // Helper: trend = perubahan % dibanding nilai periode sebelumnya (hari sebelumnya).
  // Trend hanya dihitung bila data aktual DAN pembandingnya valid (> 0).
  // Tanpa pembanding yang nyata, kembalikan null — jangan tampilkan klaim
  // "turun/naik vs target" yang menyesatkan saat data belum tersedia.
  const computeTrend = (currentValue: number, previousValue: number, label: string): { value: number; label: string } | null => {
    if (!currentValue || !previousValue || currentValue <= 0 || previousValue <= 0) return null;
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;
    const trend = ((currentValue - previousValue) / previousValue) * 100;
    // Hindari angka tidak wajar (mis. data parsial/baru mulai) yang hanya membingungkan
    if (Math.abs(trend) > 1000) return null;
    return { value: Math.round(trend * 10) / 10, label };
  };

  const trends = useMemo(() => {
    // Ambil baris "hari ini" & "kemarin" dari daily-summary (urutan DESC)
    const todayRow = dailyRows[0];
    const yesterdayRow = dailyRows[1];
    const todayProd = todayRow ? Number(todayRow.totalProduction) || 0 : 0;
    const yestProd = yesterdayRow ? Number(yesterdayRow.totalProduction) || 0 : 0;
    const todayCons = todayRow ? Number(todayRow.totalConsumption) || 0 : 0;
    const yestCons = yesterdayRow ? Number(yesterdayRow.totalConsumption) || 0 : 0;

    return {
      // Produksi/konsumsi: dibandingkan dengan hari KEMARIN (bukan target konstanta)
      production: computeTrend(todayProd, yestProd, 'vs kemarin'),
      consumption: computeTrend(todayCons, yestCons, 'vs kemarin'),
      // PR/CF/baterai: daily-summary tidak menyediakan pembanding harian yang
      // valid → null. StatCard menampilkan '—', bukan klaim "turun vs target"
      // yang menyesatkan ketika data agregat belum tersedia.
      batteryCharging: null,
      batteryDischarging: null,
      batteryCapacity: null,
      pr: null,
      capacityFactor: null,
    };
  }, [aggregates, dailyRows, getAggValue]);
  
  const summaryData = useMemo(() => {
    const s = summary || {};
    let computedProduction = 0;
    let computedConsumption = 0;
    let computedBatteryCharging = 0;
    let computedBatteryDischarging = 0;
    let socSum = 0;
    let socCount = 0;
    
    if (realtimeData && typeof realtimeData === 'object') {
      Object.values(realtimeData).forEach((d: any) => {
        if (!d) return;
        if (d.power?.p_ac) computedProduction += Number(d.power.p_ac);
        if (d.power?.p_load) computedConsumption += Number(d.power.p_load);
        if (d.power?.p_export) computedConsumption += Number(d.power.p_export);
        if (d.power?.p_import) computedConsumption += Number(d.power.p_import);
        if (d.battery?.b_charge) computedBatteryCharging += Number(d.battery.b_charge);
        if (d.battery?.b_discharge) computedBatteryDischarging += Number(d.battery.b_discharge);
        if (d.battery?.b_soc !== undefined && d.battery?.b_soc !== null) {
          socSum += Number(d.battery.b_soc);
          socCount++;
        }
      });
    }
    
    const avgSoc = socCount > 0 ? socSum / socCount : 0;
    
    // Helper: nilai numerik valid (>0) dari string/number — string '0.0' bersifat
    // truthy di JS dan akan menimpa nilai realtime; cek numerik dulu.
    const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

    return {
      // Produksi/konsumsi: prefer backend (summary), fallback hitungan realtime
      todayProduction: num(s.todayProduction) > 0 ? String(s.todayProduction) : computedProduction > 0 ? computedProduction.toFixed(1) : '—',
      todayConsumption: num(s.todayConsumption) > 0 ? String(s.todayConsumption) : computedConsumption > 0 ? computedConsumption.toFixed(1) : '—',
      // Baterai: SOC rata-rata realtime (b_soc) sebagai kapasitas saat ini;
      // charging/discharging = daya sesaat realtime (b_charge/b_discharge, W → kW).
      batteryCharging: num(s.batteryCharging) > 0 ? String(s.batteryCharging) : computedBatteryCharging > 0 ? (computedBatteryCharging / 1000).toFixed(1) : '—',
      batteryDischarging: num(s.batteryDischarging) > 0 ? String(s.batteryDischarging) : computedBatteryDischarging > 0 ? (computedBatteryDischarging / 1000).toFixed(1) : '—',
      batteryCapacity: num(s.batteryCapacity) > 0 ? String(s.batteryCapacity) : avgSoc > 0 ? avgSoc.toFixed(1) : '—',
      batterySoc: num(s.batterySoc) > 0 ? String(s.batterySoc) : avgSoc > 0 ? avgSoc.toFixed(1) : '—',
    };
  }, [summary, realtimeData]);

  // Nilai KPI hari ini (baris teratas daily-summary, urutan DESC)
  const todayKpi = dailyRows[0];
  const kpiValue = (v: any) => (v === null || v === undefined || Number(v) <= 0 ? '—' : String(v));

  const stats = [
      {
        title: 'PERFORMANCE RATIO (PR)',
        value: formatPercent(kpiValue(todayKpi?.performanceRatio)),
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'green' as const,
        trend: trends.pr
      },
      {
        title: 'KAPASITAS FAKTOR',
        value: formatPercent(kpiValue(todayKpi?.capacityFactor)),
        icon: <Zap className="w-5 h-5" />,
        color: 'tan' as const,
        trend: trends.capacityFactor
      }
    ];
  
  const energyStats = [
      {
        title: 'DAILY PRODUCTION',
        value: formatUnit(summaryData.todayProduction, ' kWh'),
        icon: <Sun className="w-5 h-5" />,
        color: 'blue' as const,
        trend: trends.production
      },
      {
        title: 'DAILY CONSUMPTION',
        value: formatUnit(summaryData.todayConsumption, ' kWh'),
        icon: <Battery className="w-5 h-5" />,
        color: 'orange' as const,
        trend: trends.consumption
      }
    ];
  
  const batteryStats = [
      {
        title: 'TOTAL BATTERY CAPACITY',
        value: formatUnit(summaryData.batteryCapacity, '%'),
        icon: <Battery className="w-5 h-5" />,
        color: 'green' as const,
        trend: trends.batteryCapacity
      },
      {
        title: 'BATTERY CHARGING',
        value: formatUnit(summaryData.batteryCharging, ' kW'),
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'tan' as const,
        trend: trends.batteryCharging
      },
      {
        title: 'BATTERY DISCHARGING',
        value: formatUnit(summaryData.batteryDischarging, ' kW'),
        icon: <TrendingDown className="w-5 h-5" />,
        color: 'red' as const,
        trend: trends.batteryDischarging
      }
    ];

  return (
    <div className="space-y-6 z-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-scada-text">Dashboard Summary</h2>
      </div>

      <DashboardFilter onFilterChange={(newFilters) => {
        setFilters(newFilters);
      }} />
      
      {/* Kartu Statistik Baru */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Energy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {energyStats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Battery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {batteryStats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Live Energy Flow - only shows when site is selected */}
      {filters.siteId && (
        <div className="bg-white dark:bg-scada-card p-4 rounded-lg shadow border border-gray-200 dark:border-scada-border">
          <LiveEnergyFlow selectedSiteId={filters.siteId} />
        </div>
      )}

      {/* Consumption Energy Heatmap */}
      <div className="bg-white dark:bg-scada-card p-4 rounded-lg shadow border border-gray-200 dark:border-scada-border">
        <ConsumptionHeatmap selectedSiteId={filters.siteId} />
      </div>

      {/* Data Inverter Monitor */}
      <div className="bg-white dark:bg-scada-card p-4 rounded-lg shadow border border-gray-200 dark:border-scada-border">
        <InverterMonitor selectedSiteId={filters.siteId} />
      </div>

      {/* Device Status Map */}
      <div className="bg-white dark:bg-scada-card p-4 rounded-lg shadow border border-gray-200 dark:border-scada-border">
        <h3 className="text-lg font-medium text-gray-900 dark:text-scada-text mb-4">Device Status Map</h3>
        <DeviceStatusMap selectedSiteId={filters.siteId} />
      </div>
    </div>
  );
};
