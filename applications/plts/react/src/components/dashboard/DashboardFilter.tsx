// src/components/dashboard/DashboardFilter.tsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import devicesApi from '@/api/modules/devices';

interface Site {
  id: string;
  name: string;
}

interface DashboardFilterProps {
  onFilterChange?: (filters: {
    siteId: string | null;
    timeRange: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export const DashboardFilter: React.FC<DashboardFilterProps> = ({ onFilterChange }) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d'>('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  // Calculate startDate and endDate based on timeRange and selectedDate
  const getDateRange = () => {
    const end = new Date(selectedDate + 'T23:59:59');
    let start = new Date(end);
    
    switch (timeRange) {
      case 'today':
        start = new Date(selectedDate + 'T00:00:00');
        break;
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const { startDate, endDate } = getDateRange();

  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await devicesApi.getDevices();
        const devices = res.data?.data || res.data || [];
        
        // Extract unique sites from devices
        const siteMap = new Map<string, string>();
        devices.forEach((device: any) => {
          if (device.site?.id && device.site?.name) {
            siteMap.set(device.site.id, device.site.name);
          }
        });
        
        const siteList = Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }));
        setSites(siteList);
      } catch (error) {
        console.error('Error loading sites:', error);
      }
    };
    
    loadSites();
  }, []);

  const handleFilterChange = () => {
    onFilterChange?.({
      siteId: selectedSite,
      timeRange,
      startDate,
      endDate
    });
  };

  useEffect(() => {
    handleFilterChange();
  }, [selectedSite, timeRange, selectedDate]);

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="bg-white dark:bg-scada-card rounded-lg shadow-sm p-4 border border-gray-200 dark:border-scada-border mb-4 flex flex-wrap gap-4 items-end">
      {/* Site Selection */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-scada-text whitespace-nowrap">Site:</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="w-48 px-3 py-2 text-sm bg-white border border-gray-300 dark:border-scada-border dark:bg-scada-card rounded-md text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-haspopup="listbox"
            aria-expanded={siteDropdownOpen}
          >
            <span className="truncate pr-6">
              {selectedSite ? sites.find(s => s.id === selectedSite)?.name : 'All Sites'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {siteDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-scada-card border border-gray-300 dark:border-scada-border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
              <button
                onClick={() => {
                  setSelectedSite(null);
                  setSiteDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left ${!selectedSite ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700' : 'text-gray-700 dark:text-scada-text hover:bg-gray-50 dark:hover:bg-scada-border'}`}
              >
                All Sites
              </button>
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    setSelectedSite(site.id);
                    setSiteDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left ${selectedSite === site.id ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700' : 'text-gray-700 dark:text-scada-text hover:bg-gray-50 dark:hover:bg-scada-border'}`}
                >
                  {site.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-scada-text whitespace-nowrap">Range:</span>
        <div className="flex gap-1 bg-gray-100 dark:bg-scada-bg rounded-full p-1">
          {(['today', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range);
                if (range === 'today') {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                timeRange === range
                  ? 'bg-white dark:bg-scada-card shadow-sm text-teal-700 dark:text-teal-400 font-medium'
                  : 'text-gray-500 dark:text-scada-muted hover:text-gray-700 dark:hover:text-scada-text'
              }`}
            >
              {range === 'today' ? 'Today' : range === '24h' ? '24h' : '7D'}
            </button>
          ))}
        </div>
      </div>

      {/* Single Date Picker (for custom date when not "Today") */}
      {timeRange !== 'today' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-scada-text whitespace-nowrap">Date:</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-36 px-3 py-2 text-sm bg-white border border-gray-300 dark:border-scada-border dark:bg-scada-card rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}            
    </div>
  );
};

export default DashboardFilter;
