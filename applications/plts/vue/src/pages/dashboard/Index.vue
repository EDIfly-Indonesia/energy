<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
      <StatCard title="Production" :value="stats.todayProduction + ' kWh'" :realtimeValue="realtimeSummary.totalProduction" unit="kW" icon="Zap" color="blue" />
      <StatCard title="Consumption" :value="stats.todayConsumption + ' kWh'" :realtimeValue="realtimeSummary.totalConsumption" unit="kW" icon="Bolt" color="yellow" />
      <StatCard title="Battery SOC" :value="stats.batterySoc + '%'" :realtimeValue="realtimeSummary.batterySoc" unit="%" icon="BatteryCharging" color="green" />
      <StatCard title="Grid Export" :value="stats.gridExport + ' kWh'" :realtimeValue="realtimeSummary.gridExport" unit="kW" icon="ArrowUpRight" color="purple" />
      <StatCard title="Grid Import" :value="stats.gridImport + ' kWh'" :realtimeValue="realtimeSummary.gridImport" unit="kW" icon="ArrowDownLeft" color="red" />
    </div>

    <!-- Filter Bar -->
    <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-2 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-600">Site:</label>
          <select v-model="selectedSiteId" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white" @change="refreshDashboard">
            <option value="">All Sites</option>
            <option v-for="site in sortedSites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>
      </div>

      <!-- Time Range Selector (Today, 24h, 7D, 30D) -->
      <div class="flex items-center gap-4">
        <PillFilter v-model="timeRange" />
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-600">Date:</label>
          <input type="date" v-model="dateFrom" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white" @change="refreshDashboard" />
          <span class="text-gray-400">-</span>
          <input type="date" v-model="dateTo" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white" @change="refreshDashboard" />
        </div>
      </div>
    </div>

    <!-- Indonesia Map Card -->
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        <Map class="w-5 h-5 inline mr-2 text-green-600" /> Device Status Map
      </h3>
      <div id="device-map" class="h-[500px] w-full rounded-lg border border-gray-200"></div>
    </div>
    <style>
      .leaflet-tile { outline: 1px solid transparent; }
      .marker-cluster-custom { display: flex; align-items: center; justify-content: center; }
    </style>

    <!-- ── Daily Summary ────────────────────────── -->
    <div v-if="dailySummaryData.length" class="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
      <div class="h-64">
        <Bar :data="dailyChartData" :options="barOpts" />
      </div>
    </div>

    <!-- ── Telemetry Aggregates ───────────────────────────────────────────── -->
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
      <!-- Header + controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 class="text-lg font-semibold text-gray-900-scada-text">
          <Activity class="w-5 h-5 inline mr-2 text-purple-600" /> Telemetry Aggregates
        </h3>
        <div class="flex flex-wrap gap-2 items-center">
          <!-- Period selector -->
          <div class="flex rounded-lg border border-gray-200-scada-border overflow-hidden text-sm">
            <button
              v-for="p in periods" :key="p.value"
              :class="['px-3 py-1.5 transition-colors font-medium',
                aggPeriod === p.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white-scada-card text-gray-600-scada-text hover:bg-gray-50:bg-scada-bg/60'
              ]"
              @click="aggPeriod = p.value; fetchAggregates()"
            >{{ p.label }}</button>
          </div>
          <!-- Standard key filter -->
          <select v-model="aggKey" @change="fetchAggregates()"
            class="px-3 py-1.5 border border-gray-200-scada-border rounded-lg text-sm bg-white-scada-card text-gray-700-scada-text">
            <option value="">All Parameters</option>
            <option v-for="(label, prefix) in parameterLabels" :key="prefix" :value="prefix">{{ label }}</option>
          </select>
          <!-- View toggle -->
          <div class="flex rounded-lg border border-gray-200-scada-border overflow-hidden text-sm">
            <button
              v-for="v in views" :key="v.value"
              :class="['px-3 py-1.5 transition-colors',
                aggView === v.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white-scada-card text-gray-600-scada-text hover:bg-gray-50'
              ]"
              @click="aggView = v.value"
            >
              <component :is="v.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="aggLoading" class="flex items-center justify-center h-48 text-gray-400">
        <svg class="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Memuat data aggregates...
      </div>

      <!-- Empty state -->
      <div v-else-if="!aggregates.length" class="flex flex-col items-center justify-center h-48 text-gray-400">
        <Activity class="w-10 h-10 mb-2 opacity-40" />
        <p class="text-sm">Belum ada data telemetry aggregates</p>
        <p class="text-xs mt-1">Data akan muncul setelah inverter mengirimkan telemetry</p>
      </div>

      <template v-else>
        <!-- ── CHART VIEW ── -->
        <div v-show="aggView === 'chart'" class="h-72 mb-4">
          <Line :data="aggChartData" :options="aggChartOptions" />
        </div>

        <!-- ── TABLE VIEW ── -->
        <div v-show="aggView === 'table'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200-scada-border text-sm">
            <thead class="bg-gray-50-scada-bg/40">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sum</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period Start</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200-scada-border">
              <tr v-for="a in aggregates" :key="a.id" class="hover:bg-gray-50:bg-scada-bg/50 transition-colors">
                <td class="px-4 py-3 text-gray-900-scada-text font-medium">
                  {{ a.device?.serialNumber || '—' }}
                </td>
                <!-- Parameter column -->
                <td class="px-4 py-3 text-center">
                  <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', getParamBadgeClass(a.standardKey)]">
                    {{ getParamConfig(a.standardKey).label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-gray-500 capitalize">{{ a.period }}</td>
                <td class="px-4 py-3 text-right text-blue-600 font-semibold">{{ fmtVal(a.avgValue) }}</td>
                <td class="px-4 py-3 text-right text-gray-500">{{ fmtVal(a.minValue) }}</td>
                <td class="px-4 py-3 text-right text-gray-500">{{ fmtVal(a.maxValue) }}</td>
                <td class="px-4 py-3 text-right text-emerald-600">{{ fmtVal(a.sumValue) }}</td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ fmtDate(a.periodStart) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Meta info -->
        <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{{ aggregates.length }} records · Period: <strong class="capitalize">{{ aggPeriod }}</strong></span>
          <span>Updated: {{ lastUpdated }}</span>
        </div>
      </template>
    </div>

    <!-- ── Recent Telemetry Data ────────────────────────────────- -->
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          <Database class="w-5 h-5 inline mr-2 text-gray-600" /> Recent Telemetry Data
        </h3>
        <div class="flex flex-wrap gap-2">
          <label class="text-sm font-medium text-gray-600 flex items-center">Date:</label>
          <input type="date" v-model="dateFrom" :min="minDate" :max="maxDate" class="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white" />
          <select v-model="selectedDeviceFilter" class="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">All Devices</option>
            <option v-for="d in filteredDevices" :key="d.id" :value="d.id">{{ d.serialNumber }}</option>
          </select>
          <select v-model="selectedParam" class="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white">
            <option v-for="(label, prefix) in parameterLabels" :key="prefix" :value="prefix">{{ label }}</option>
          </select>
        </div>
      </div>
      <div class="h-80">
        <Line :data="telemetryChartData" :options="telemetryChartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Line, Bar } from 'vue-chartjs';
import PillFilter from '../../components/common/PillFilter.vue';
import { Map, BarChart2, List, Activity, Database, DownloadCloud } from '@lucide/vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import 'leaflet-fullscreen';

// Fix Leaflet default icon for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import apiClient from '../../api/client';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

// ─── State ─────────────────────────────────────────────────────────────────────
const stats = ref({
  todayProduction: 0,
  todayConsumption: 0,
  batterySoc: 0,
  gridExport: 0,
  gridImport: 0,
});
const sites             = ref([]);
const devices           = ref([]);
const devicesCache      = ref([]);
const dailySummaryData  = ref([]);
const aggregates        = ref([]);
const aggChart          = ref({ labels: [], series: [] });
const telemetryData     = ref([]);
const selectedSiteId    = ref('');
const selectedDeviceFilter = ref('');
const filteredDevices = computed(() => {
  if (!selectedSiteId.value) return devices.value;
  return devices.value.filter(d => d && d.site && d.site.id === selectedSiteId.value);
});
const aggLoading        = ref(false);
const lastUpdated       = ref('—');
const realtimeSummary   = ref({});
const timeRange         = ref('today');

//Sorted Sites Name
const sortedSites = computed(() => {
  return [...sites.value].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
});

// Map state
const mapInstance       = ref(null);
const deviceMarkers     = ref({});
const mapInitialized    = ref(false);

// Aggregate controls
const aggPeriod = ref('hourly');
const aggKey    = ref('');
const aggView   = ref('chart'); // 'chart' | 'table'

const periods = [
  { value: 'hourly',  label: 'Hourly' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];
const views = [
  { value: 'chart', icon: BarChart2 },
  { value: 'table', icon: List },
];

// Recent telemetry controls
const todayStr = new Date().toISOString().slice(0, 10);
const dateFrom      = ref(todayStr);
const dateTo        = ref(todayStr);
const selectedParam = ref('e_');

// Date limits: minimal -29 hari dari hari ini
const maxDate = todayStr;
const minDate = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
});

const refreshDashboard = () => {
  fetchStats();
  fetchDailySummary();
  fetchAggregates();
  fetchRealtimeSummary();
};

// ─── Parameter config ─────────────────────────────────────────────────────────
const PARAM_CONFIG = {
  'b_':         { label: 'Battery',     color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  'c_':         { label: 'Current',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  'e_':         { label: 'Energy',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'f_':         { label: 'Frequency',   color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  'i_':         { label: 'Irradiance',  color: '#facc15', bg: 'rgba(250,204,21,0.15)' },
  'p_':         { label: 'Power',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
  's_':         { label: 'Status',      color: '#6b7280', bg: 'rgba(107,114,128,0.15)'},
  't_':         { label: 'Temperature', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  'v_':         { label: 'Voltage',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
};

// Palette for multiple series
const PALETTE = ['#6366f1','#ef4444','#10b981','#f59e0b','#8b5cf6','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];

function getParamConfig(key) {
  for (const prefix in PARAM_CONFIG) {
    if (key.startsWith(prefix)) return PARAM_CONFIG[prefix];
  }
  return { label: key, color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
}

function getParamBadgeClass(key) {
  const cfg = getParamConfig(key);
  const map = {
    '#10b981': 'bg-emerald-100 text-emerald-700',
    '#8b5cf6': 'bg-purple-100 text-purple-700',
    '#f59e0b': 'bg-amber-100 text-amber-700',
    '#6366f1': 'bg-indigo-100 text-indigo-700',
    '#facc15': 'bg-yellow-100 text-yellow-700',
    '#ef4444': 'bg-red-100 text-red-700',
    '#6b7280': 'bg-gray-100 text-gray-600',
    '#ec4899': 'bg-pink-100 text-pink-700',
    '#3b82f6': 'bg-blue-100 text-blue-700',
  };
  return map[cfg.color] || 'bg-orange-100 text-orange-700';
}

const parameterLabels = computed(() => {
  const out = {};
  for (const k in PARAM_CONFIG) out[k] = PARAM_CONFIG[k].label;
  return out;
});

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatNum = v  => v != null ? Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—';
const fmtVal    = v  => v != null ? Number(v).toFixed(2) : '—';
const fmtDate   = ts => ts ? new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── API Calls ───────────────────────────────────────────────────────────────
const fetchStats = async () => {
  try {
    const params = new URLSearchParams();
    if (selectedSiteId.value) params.set('siteId', selectedSiteId.value);
    if (dateFrom.value)      params.set('startDate', dateFrom.value);
    if (dateTo.value)        params.set('endDate', dateTo.value);

    const { data } = await apiClient.get(`/telemetry/summary?${params}`);
    if (data.success) {
      // Mapping backend summary to our specific dashboard stats
      const d = data.data;
      stats.value = {
        todayProduction:  d.todayProduction || 0,
        todayConsumption: d.todayConsumption || 0,
        batterySoc:       d.batterySoc || 0,
        gridExport:       d.gridExport || 0,
        gridImport:       d.gridImport || 0,
      };
    }
  } catch (e) {
    console.warn('fetchStats failed', e.message);
  }
};

const fetchSites = async () => {
  try {
    const { data } = await apiClient.get('/sites');
    if (data.success) sites.value = data.data;
  } catch {}
};

const fetchDevices = async () => {
  try {
    const { data } = await apiClient.get('/devices?include=site');
    if (data.success) {
      devices.value = data.data;
      devicesCache.value = data.data; // Store for marker lookup
    }

    // 2. Set default device ke index pertama
      if (devices.value.length > 0 && !selectedDeviceFilter.value) {
        selectedDeviceFilter.value = devices.value[0].id;
      }
      
  } catch {}
};

const fetchDailySummary = async () => {
  try {
    const q = selectedSiteId.value ? `?siteId=${selectedSiteId.value}` : '';
    const { data } = await apiClient.get(`/telemetry/daily-summary${q}`);
    if (data.success) dailySummaryData.value = data.data || [];
  } catch {}
};

const fetchAggregates = async () => {
  aggLoading.value = true;
  try {
    const params = new URLSearchParams({ period: aggPeriod.value });
    if (aggKey.value) params.set('standardKey', aggKey.value);

    const { data } = await apiClient.get(`/telemetry/aggregates?${params}`);
    if (data.success) {
      aggregates.value = data.data   || [];
      aggChart.value   = data.chart  || { labels: [], series: [] };
      lastUpdated.value = new Date().toLocaleTimeString('id-ID');
    }
  } catch (e) {
    console.warn('fetchAggregates failed', e.message);
  } finally {
    aggLoading.value = false;
  }
};

const fetchTelemetryData = async () => {
  try {
    const params = new URLSearchParams();
    if (selectedDeviceFilter.value) params.set('deviceId', selectedDeviceFilter.value);
    
    // Always use dateFrom as single reference date
    if (dateFrom.value) {
        const d = new Date(dateFrom.value);
        d.setHours(0,0,0,0);
        params.set('startDate', d.toISOString());
        
        const de = new Date(dateFrom.value);
        de.setHours(23,59,59,999);
        params.set('endDate', de.toISOString());
    }
    params.set('limit', '10000');

    const { data } = await apiClient.get(`/telemetry/data?${params}`);
    if (data.success) {
      telemetryData.value = data.data || [];
    }
  } catch {}
};

const fetchRealtimeSummary = async () => {
  try {
    const params = new URLSearchParams();
    const rangeMap = { today: '1h', '24h': '24h', '7d': '7d', '30d': '30d' };
    params.set('range', rangeMap[timeRange.value] || '1h');
    if (selectedSiteId.value) params.set('siteId', selectedSiteId.value);
    
    const { data } = await apiClient.get(`/telemetry/realtime/summary?${params}`);
    if (data.success) {
      realtimeSummary.value = data.data;
      updateDeviceMarkers(); // Update markers when realtime data changes
    }
  } catch (e) {
    console.warn('fetchRealtimeSummary failed', e.message);
  }
};

// ─── Watch timeRange untuk auto-refresh real-time stat cards ───────────────────
watch(timeRange, (newRange) => {
  fetchRealtimeSummary();
});

// Watch site changes to refresh map + device filter + chart
watch(selectedSiteId, () => {
  // Update map focus and markers based on selected site
  if (mapInitialized.value) {
    if (selectedSiteId.value) {
      const site = sites.value.find(s => s.id === selectedSiteId.value);
      if (site) {
        mapInstance.value.setView([parseFloat(site.latitude), parseFloat(site.longitude)], 10);
      }
    } else {
      mapInstance.value.setView([-2.5, 118.0], 5);
    }
    updateDeviceMarkers();
  }
  fetchTelemetryData();
  
  // Reset device filter when site changes
  if (selectedDeviceFilter.value) {
    const stillValid = filteredDevices.value.some(d => d.id === selectedDeviceFilter.value);
    if (!stillValid) selectedDeviceFilter.value = '';
  }
});

import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

const initializeMap = async () => {
  await nextTick();
  
  const mapContainer = document.getElementById('device-map');
  if (!mapContainer) return;
  
  // Destroy existing map if any
  if (mapInstance.value) {
    mapInstance.value.remove();
  }
  
  // Initialize map centered on Indonesia
  mapInstance.value = L.map('device-map',{
      fullscreenControl: true,
      fullscreenControlOptions: {
          position: 'topleft'
      },
      layers: []
  }).setView([-2.5, 118.0], 5);
  
  // Tile layers
  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar, and the Geospatial Intelligence Center',
      maxZoom: 18,
      zIndex: 1,
      detectRetina: true
  });
  
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      zIndex: 2,
      detectRetina: true
  });
  
  esriSatellite.addTo(mapInstance.value);
  
  L.control.layers(
      { 'Satellite (Esri)': esriSatellite },
      { 'OpenStreetMap': osmLayer },
      { collapsed: true, position: 'topright' }
  ).addTo(mapInstance.value);

  // Initialize marker cluster group
  window.markerLayer = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      const markers = cluster.getAllChildMarkers();
      
      // Filter by selectedSiteId if active
      const visibleMarkers = selectedSiteId.value 
        ? markers.filter(m => m.options.siteId === selectedSiteId.value)
        : markers;

      const countToDisplay = visibleMarkers.length;

      // Determine dominant status by majority
      let online = 0;
      let offline = 0;
      markers.forEach(m => {
        if (m.options.status === 'OFFLINE') offline++;
        else online++;
      });

      // Color by majority
      let color;
      if (offline > online) color = '#ef4444';       // red if more offline
      else if (online > offline) color = '#10b981';   // green if more online
      else color = '#f59e0b';                          // orange if tied/mixed

      // Show breakdown: e.g., "3 (2/1)" when mixed, just "3" otherwise
      const breakdown = (online > 0 && offline > 0) 
        ? `${countToDisplay}<br/>(${online}/${offline})` 
        : `${countToDisplay}`;

      return L.divIcon({
        html: `<div style="background: ${color}; border-radius: 50%; width: 48px; height: 48px; text-align: center; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${breakdown}</div>`,
        className: 'marker-cluster-custom',
        iconSize: [48, 48]
      });
    }
  });
  
  mapInstance.value.addLayer(window.markerLayer);
    
  // Add device markers
  await updateDeviceMarkers();
    
  mapInitialized.value = true;
  };

  const updateDeviceMarkers = async () => {
  if (!mapInstance.value || !window.markerLayer) return;

  try {
    const realtimeDevices = realtimeSummary.value.devices || [];
    const realtimeStatusMap = {};
    realtimeDevices.forEach(d => {
      realtimeStatusMap[d.id] = d.status;
    });

    // Filter devices based on selectedSiteId
    const deviceList = selectedSiteId.value 
      ? devicesCache.value.filter(d => d.siteId === selectedSiteId.value || d.site_id === selectedSiteId.value || d.site?.id === selectedSiteId.value)
      : devicesCache.value;

    if (!deviceList.length) {
       window.markerLayer.clearLayers();
       deviceMarkers.value = {};
       return;
    }

    // Clear existing markers from cluster group
    window.markerLayer.clearLayers();
    deviceMarkers.value = {};
      
    // Build siteId -> {latitude, longitude, name} map from sites.value (authoritative source)
    const siteCoordsMap = {};
    sites.value.forEach(s => {
      siteCoordsMap[s.id] = {
        latitude:    parseFloat(s.latitude),
        longitude:   parseFloat(s.longitude),
        name:        s.name,
        capacityKwp: s.capacityKwp,
        tenantName:  s.tenant?.name || '-'
      };
    });

    deviceList.forEach(device => {
      const siteId = device.siteId || device.site_id || device.site?.id;
      let site = siteCoordsMap[siteId];

      // Fallback: use site object embedded in device (from devicesCache)
      if (!site && device.site) {
        site = {
          latitude:  parseFloat(device.site.latitude),
          longitude: parseFloat(device.site.longitude),
          name:      device.site.name,
        };
      }

      if (!site) return;

      const baseLat = site.latitude;
      const baseLng = site.longitude;
      if (isNaN(baseLat) || isNaN(baseLng)) return;

      // const offset = (Math.random() - 0.5) * 0.002;
      // const lat = baseLat + offset;
      // const lng = baseLng + offset;
      const lat = baseLat;
      const lng = baseLng;

      // Prefer realtime status, fallback to device.status or OFFLINE
      const status = realtimeStatusMap[device.id] || device.status || 'OFFLINE';
      const color = status === 'ONLINE' ? '#10b981' : status === 'WARNING' ? '#f59e0b' : '#ef4444';

      const customIcon = L.divIcon({
        className: 'custom-device-marker',
        html: `<div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lat, lng], { 
        icon: customIcon,
        status: status, // Pass status to options for cluster icon logic
        siteId: siteId, // Store siteId for filtering
      });
        
      marker.bindPopup(`
        <div class="text-xs p-1">
          <div class="font-bold border-bottom mb-1 pb-1">${device.serialNumber}</div>
          <div>Tenant: <span class="font-semibold">${site.tenantName}</span></div>
          <div>Status: <span style="color: ${color}; font-weight: bold;">${status}</span></div>
          <div>Site: ${site.name}</div>
          <div>Capacity: ${site.capacityKwp || '-'} kWp</div>
          ${device.p_total ? `<div>Current Power: ${device.p_total.toFixed(2)} kW</div>` : ''}
        </div>
      `);
        
      window.markerLayer.addLayer(marker);
      deviceMarkers.value[device.id] = marker;
    });
  } catch (e) {
    console.warn('Failed to update device markers:', e.message);
  }
};

// ─── Initialize ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchSites();
  await fetchDevices();
  await fetchRealtimeSummary();  // ensure realtimeSummary + devices are populated before map init
  refreshDashboard();
  initializeMap();
  
  // Auto-refresh real-time data every 30 seconds
  setInterval(() => {
    fetchRealtimeSummary();
  }, 30000);
});

// ─── Chart Configs ────────────────────────────────────────────────────────────

// Daily summary bar chart
const barOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: { display: false },
  },
  scales: {
    x: {
      ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45, autoSkip: true },
      grid:  { display: false },
    },
    y: {
      beginAtZero: true,
      title:       { display: true, text: 'kWh' },
      ticks:       { font: { size: 10 } },
      grid:        { color: 'rgba(0,0,0,0.06)' },
    },
  },
};

const dailyChartData = computed(() => ({
  labels:   dailySummaryData.value.map(s => (s.date ?? s.period_start ?? '').slice?.(0, 10)),
  datasets: [{
    label:           'Production (kWh)',
    data:            dailySummaryData.value.map(s => s.totalProduction ?? s.totalproduction),
    backgroundColor: 'rgba(59,130,246,0.55)',
    borderColor:     '#3b82f6',
    borderWidth:     2,
    borderRadius:    4,
  }],
}));

// Telemetry Aggregates multi-line chart
const aggChartData = computed(() => {
  const { labels, series } = aggChart.value;
  const fmtLabel = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    return aggPeriod.value === 'hourly'
      ? d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filtered = aggKey.value
    ? series.filter(s => s.key.startsWith(aggKey.value))
    : series;

  return {
    labels: labels.map(fmtLabel),
    datasets: filtered.map((s, idx) => {
      const cfg   = getParamConfig(s.key);
      const color = cfg.color !== '#f97316' ? cfg.color : PALETTE[idx % PALETTE.length];
      return {
        label:           s.key,
        data:            s.values,
        borderColor:     color,
        backgroundColor: color.replace(')', ', 0.12)').replace('rgb', 'rgba'),
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius:6,
        tension:         0.35,
        fill:            false,
        spanGaps:        true,
      };
    }),
  };
});

const aggChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction:         { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display:  true,
      position: 'top',
      labels:   {
        usePointStyle: true,
        pointStyleWidth: 8,
        padding: 12,
        font: { size: 11 },
        generateLabels: (chart) => {
          const data = chart.data;
          return data.datasets.map((ds, i) => ({
            text: ds.label,
            fill: ds.backgroundColor,
            hidden: false,
            index: i,
          }));
        },
      },
    },
    tooltip: {
      callbacks: {
        label: ctx => ` ${getParamConfig(ctx.dataset.label || '').label || ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : 'N/A'}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { maxRotation: 40, minRotation: 20, autoSkip: true, maxTicksLimit: 12, font: { size: 10 } },
      grid:  { display: false },
    },
    y: {
      beginAtZero: false,
      ticks:       { font: { size: 10 } },
      grid:        { color: 'rgba(0,0,0,0.06)' },
    },
  },
};

// Recent telemetry line chart
const telemetryChartData = computed(() => {
  const cfg = getParamConfig(selectedParam.value);
  const isSum = selectedParam.value === 'p_' || selectedParam.value === 'e_';
  
  const labels = [];
  const buckets = [];
  let startDt = new Date();
  
  if (dateFrom.value) {
    startDt = new Date(dateFrom.value);
  }
  startDt.setHours(0, 0, 0, 0);
  
  let current = new Date(startDt.getTime() + 5 * 60000); // 00:05
  const endLimit = new Date(startDt.getTime() + 24 * 3600000); // end of day
  
  while (current <= endLimit) {
    const is2400 = current.getHours() === 0 && current.getMinutes() === 0;
    const displayH = is2400 ? '24' : current.getHours().toString().padStart(2, '0');
    const displayM = current.getMinutes().toString().padStart(2, '0');
    labels.push(`${displayH}:${displayM}`);
    buckets.push([]);
    current = new Date(current.getTime() + 5 * 60000);
  }

  const filtered = telemetryData.value.filter(d => d.standardKey?.startsWith(selectedParam.value));
  
  filtered.forEach(d => {
    const ts = new Date(d.timestamp);
    const diffMin = Math.floor((ts - startDt) / 60000);
    let bucketIdx = Math.ceil(diffMin / 5) - 1;
    if (bucketIdx < 0) bucketIdx = 0;
    
    if (bucketIdx >= 0 && bucketIdx < buckets.length) {
      buckets[bucketIdx].push(d.value);
    }
  });
  
  const dataArray = buckets.map(b => {
    if (b.length === 0) return null;
    const sum = b.reduce((x, y) => x + y, 0);
    return isSum ? sum : sum / b.length;
  });

  return {
    labels,
    datasets: [{
      label:           cfg.label,
      data:            dataArray,
      borderColor:     cfg.color,
      backgroundColor: cfg.bg,
      borderWidth:     2,
      pointRadius:     0,
      pointHoverRadius: 4,
      tension:         0.3,
      fill:            true,
      spanGaps:        true,
    }],
  };
});

const telemetryChartOptions = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend:  { display: true, position: 'top' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, font: { size: 10 } } },
    y: { beginAtZero: false },
  },
};

// ─── Watchers ────────────────────────────────────────────────────────────────
watch([selectedDeviceFilter, selectedParam, dateFrom], fetchTelemetryData);
</script>
