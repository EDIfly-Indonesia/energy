// src/pages/dashboard/Index.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart3, Zap, Sun, Battery, TrendingUp, TrendingDown } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { useTelemetryStore } from '@/stores/telemetry.store';
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
  
  useEffect(() => {
    fetchLatestAggregates({ siteId: filters.siteId || undefined });
    fetchSummary({ siteId: filters.siteId || undefined });
    fetchRealtimeSummary({ siteId: filters.siteId || undefined });
  }, [fetchLatestAggregates, fetchSummary, fetchRealtimeSummary, filters.siteId]);
  
  const getAggValue = useMemo(() => {
    return (standardKey: string) => {
      const group = aggregates?.[standardKey];
      if (!group || !Array.isArray(group) || group.length === 0) return '—';
      const sum = group.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0);
      return (sum / group.length).toFixed(1);
    };
  }, [aggregates]);
  
  // Helper: return trend object only if we have valid data to compare
  const computeTrend = (currentValue: number, targetValue: number, label: string): { value: number; label: string } | null => {
    if (!currentValue || !targetValue || currentValue === 0) return null;
    const trend = ((currentValue - targetValue) / targetValue) * 100;
    return { value: Math.round(trend * 10) / 10, label };
  };

  const trends = useMemo(() => {
    const s = summary || {};
    let prodTotal = Number(s.totalProduction || 0);
    let consTotal = Number(s.totalConsumption || 0);
    let chargingTotal = Number(s.batteryCharging || 0);
    let dischargingTotal = Number(s.batteryDischarging || 0);
    let socSum = 0;
    let socCount = 0;
    
    if (realtimeData && typeof realtimeData === 'object') {
      Object.values(realtimeData).forEach((d: any) => {
        if (!d) return;
        if (d.energy?.e_daily) prodTotal += Number(d.energy.e_daily);
        if (d.power?.p_load) consTotal += Number(d.power.p_load);
        if (d.battery?.b_charge) chargingTotal += Number(d.battery.b_charge);
        if (d.battery?.b_discharge) dischargingTotal += Number(d.battery.b_discharge);
        if (d.battery?.b_soc !== undefined && d.battery?.b_soc !== null) {
          socSum += Number(d.battery.b_soc);
          socCount++;
        }
      });
    }
    
    const prValue = Number(getAggValue('e_pr')) || 0;
    const cfValue = Number(getAggValue('e_capacity_factor')) || 0;
    const avgSoc = socCount > 0 ? socSum / socCount : 0;
    
    return {
      production: computeTrend(prodTotal, 1000000, 'vs target'),
      consumption: computeTrend(consTotal, 500000, 'vs baseline'),
      batteryCharging: computeTrend(chargingTotal, 100, 'vs baseline'),
      batteryDischarging: computeTrend(dischargingTotal, 100, 'vs baseline'),
      batteryCapacity: computeTrend(avgSoc, 80, 'vs target'),
      pr: computeTrend(prValue, 85, 'vs target'),
      capacityFactor: computeTrend(cfValue, 75, 'vs target'),
    };
  }, [aggregates, summary, realtimeData, getAggValue]);
  
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
    
    return {
      todayProduction: s.todayProduction || computedProduction.toFixed(1) || '0',
      todayConsumption: s.todayConsumption || computedConsumption.toFixed(1) || '0',
      batteryCharging: s.batteryCharging || computedBatteryCharging.toFixed(1) || '0',
      batteryDischarging: s.batteryDischarging || computedBatteryDischarging.toFixed(1) || '0',
      batteryCapacity: s.batteryCapacity || avgSoc.toFixed(1) || '0',
      batterySoc: s.batterySoc || avgSoc.toFixed(1) || '0',
    };
  }, [summary, realtimeData]);

  const stats = [
      {
        title: 'PERFORMANCE RATIO (PR)',
        value: `${getAggValue('e_pr')}%`,
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'green' as const,
        trend: trends.pr
      },
      {
        title: 'KAPASITAS FAKTOR',
        value: `${getAggValue('e_capacity_factor')}%`,
        icon: <Zap className="w-5 h-5" />,
        color: 'tan' as const,
        trend: trends.capacityFactor
      }
    ];
  
  const energyStats = [
      {
        title: 'DAILY PRODUCTION',
        value: `${Number(summaryData.todayProduction).toFixed(1)} kWh`,
        icon: <Sun className="w-5 h-5" />,
        color: 'blue' as const,
        trend: trends.production
      },
      {
        title: 'DAILY CONSUMPTION',
        value: `${Number(summaryData.todayConsumption).toFixed(1)} kWh`,
        icon: <Battery className="w-5 h-5" />,
        color: 'orange' as const,
        trend: trends.consumption
      }
    ];
  
  const batteryStats = [
      {
        title: 'TOTAL BATTERY CAPACITY',
        value: `${Number(summaryData.batteryCapacity).toFixed(1)}%`,
        icon: <Battery className="w-5 h-5" />,
        color: 'green' as const,
        trend: trends.batteryCapacity
      },
      {
        title: 'BATTERY CHARGING',
        value: `${Number(summaryData.batteryCharging).toFixed(1)} kWh`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'tan' as const,
        trend: trends.batteryCharging
      },
      {
        title: 'BATTERY DISCHARGING',
        value: `${Number(summaryData.batteryDischarging).toFixed(1)} kWh`,
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
