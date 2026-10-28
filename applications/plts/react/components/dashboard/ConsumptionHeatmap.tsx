import React, { useEffect, useState, useMemo, useCallback } from 'react';
import telemetryApi from '@/api/modules/telemetry';
import sitesApi from '@/api/modules/sites';

interface Site {
  id: string;
  name: string;
  tenantId: string;
  capacityKwp: string;
  latitude: string;
  longitude: string;
  _count?: { devices: number };
  tenant?: { name: string };
}

interface HeatmapData {
  siteId: string;
  hour: number;
  value: number;
}

interface AggregateData {
  id: string;
  deviceId: string;
  standardKey: string;
  period: string;
  periodStart: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sumValue: number;
  count: number;
  device?: {
    id: string;
    serialNumber: string;
    siteId: string;
    siteName?: string;
  };
}

interface ConsumptionHeatmapProps {
  selectedSiteId?: string | null;
}

export const ConsumptionHeatmap: React.FC<ConsumptionHeatmapProps> = ({ selectedSiteId }) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sites from API (all sites, or filtered by selectedSiteId)
  const fetchSites = useCallback(async () => {
    try {
      const response = await sitesApi.getSites();
      // Adjust based on actual API response structure
      let data = response.data?.data || response.data || [];
      if (selectedSiteId) {
        data = data.filter((s: Site) => s.id === selectedSiteId);
      }
      setSites(data);
      return data;
    } catch (err) {
      console.error('Error fetching sites:', err);
      throw err;
    }
  }, [selectedSiteId]);

  // Fetch telemetry aggregates for a site
  const fetchSiteTelemetry = useCallback(async (siteId: string) => {
    try {
      // Get today's date range
      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const response = await telemetryApi.getTelemetryAggregates({
        // siteId sent as device.siteId filter (backend maps it via where.device)
        deviceId: undefined,
        siteId,
        period: 'hourly',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        standardKey: 'p_load'
      });

      const data = response.data?.data || [];
      return data;
    } catch (err) {
      console.error(`Error fetching telemetry for site ${siteId}:`, err);
      return [];
    }
  }, []);

  // Generate mock data for demo/fallback
  const generateMockData = useCallback((sitesList: Site[]) => {
    const mockData: HeatmapData[] = [];
    sitesList.forEach(site => {
      const isOffline = site.name.toLowerCase().includes('offline');
      for (let h = 0; h < 24; h++) {
        let val = (h >= 10 && h <= 16) ? Math.random() * 200 + 100 : Math.random() * 50;
        // Some sites have lower consumption
        if (isOffline || site.name.toLowerCase().includes('lombok')) {
          val = Math.random() * 10;
        }
        mockData.push({ siteId: site.id, hour: h, value: val });
      }
    });
    return mockData;
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch sites
      const sitesData = await fetchSites();
      
      if (!sitesData || sitesData.length === 0) {
        throw new Error('No sites found');
      }

      // 2. Fetch telemetry for each site
      const allData: HeatmapData[] = [];
      let hasRealData = false;

      // Process with a small delay between batches to avoid 429
      const batchSize = 2;
      for (let i = 0; i < sitesData.length; i += batchSize) {
        const batch = sitesData.slice(i, i + batchSize);
        const batchPromises = batch.map(async (site: Site) => {
          // Add a jittery delay to avoid hammering the server all at once
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
          
          const data = await fetchSiteTelemetry(site.id);
          if (data && data.length > 0) {
            hasRealData = true;
            return data.map((item: AggregateData) => ({
              siteId: site.id,
              hour: new Date(item.periodStart).getHours(),
              value: item.avgValue || item.sumValue || 0
            }));
          }
          return [];
        });
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => allData.push(...result));
      }

      // 3. If no real data, use mock data
      if (!hasRealData || allData.length === 0) {
        console.warn('No real telemetry data found, using mock data');
        const mockData = generateMockData(sitesData);
        setHeatmapData(mockData);
      } else {
        setHeatmapData(allData);
      }

    } catch (err) {
      console.error('Error loading heatmap data:', err);
      // Only set error if we don't have existing sites data to show a fallback
      if (sites.length === 0) {
        setError('Failed to load data. Please try again.');
      }
      
      // Fallback: generate mock data
      if (sites.length > 0) {
        const mockData = generateMockData(sites);
        setHeatmapData(mockData);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSites, fetchSiteTelemetry, generateMockData, sites, loading]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized data
  const siteNames = useMemo(() => {
    const siteMap: Record<string, string> = {};
    sites.forEach(s => { siteMap[s.id] = s.name; });
    return siteMap;
  }, [sites]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getValue = useCallback((siteId: string, hour: number) => {
    const entry = heatmapData.find(d => d.siteId === siteId && d.hour === hour);
    return entry ? entry.value : 0;
  }, [heatmapData]);

  const getColor = (val: number) => {
    if (val < 20) return '#1e1b15';
    if (val < 100) return '#78350f';
    return '#fbbf24';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <h3 className="text-xs font-bold text-amber-600 mb-6 tracking-wider uppercase">DAILY CONSUMPTION ENERGY (TODAY)</h3>
        <div className="py-10 text-center text-gray-500 dark:text-scada-muted">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          Loading data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <h3 className="text-xs font-bold text-amber-600 mb-6 tracking-wider uppercase">DAILY CONSUMPTION ENERGY (TODAY)</h3>
        <div className="py-10 text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <h3 className="text-xs font-bold text-amber-600 mb-6 tracking-wider uppercase">
        DAILY CONSUMPTION ENERGY (TODAY)
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="flex mb-2">
            <div className="w-[100px] flex-shrink-0" />
            <div className="flex flex-1">
              {hours.map(h => (
                <div
                  key={h}
                  className="flex-1 text-center text-[10px] text-gray-400 dark:text-scada-muted"
                >
                  {h}
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows */}
          <div className="flex flex-col gap-1">
            {sites.map(site => (
              <div key={site.id} className="flex items-center">
                <div
                  className="w-[100px] flex-shrink-0 text-xs text-gray-600 dark:text-scada-text font-medium truncate"
                  title={site.name}
                >
                  {site.name}
                </div>
                <div className="flex flex-1 gap-1">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="flex-1 h-6 rounded transition-all hover:scale-110 hover:ring-2 hover:ring-white"
                      style={{ backgroundColor: getColor(getValue(site.id, hour)) }}
                      title={`${site.name} - ${hour}:00: ${getValue(site.id, hour).toFixed(1)} kW`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-4 text-xs text-gray-500 dark:text-scada-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#1e1b15' }} />
          Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#78350f' }} />
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }} />
          High
        </span>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={loadData}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-scada-muted dark:hover:text-scada-text transition-colors"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default ConsumptionHeatmap;
