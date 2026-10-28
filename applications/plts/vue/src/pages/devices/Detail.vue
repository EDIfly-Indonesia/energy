<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <nav class="text-sm text-gray-500 mb-1">
          <router-link to="/devices" class="hover:text-scada-600">Devices</router-link> / <span class="text-gray-700 dark:text-scada-text">{{ device?.serialNumber || 'Detail' }}</span>
        </nav>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-scada-text">
          {{ device?.serialNumber || 'Loading...' }}
        </h1>
      </div>
      <span :class="statusBadge(device?.status)">{{ device?.status || '—' }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-xs text-gray-500">Site</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ device?.site?.name || '—' }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-xs text-gray-500">Model</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ device?.modelName || '—' }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-xs text-gray-500">Serial</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ device?.serialNumber || '—' }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-xs text-gray-500">Last Seen</p>
        <p class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ fmt(device?.lastSeenAt) }}</p>
      </div>
    </div>

    <!-- Daily Summary Chart -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text mb-4">
        <DownloadCloud class="w-5 h-5 inline mr-2 text-blue-600" /> Daily Summary
      </h3>
      <div class="h-64">
        <Bar :data="dailyChart" :options="chartOpts" />
      </div>
    </div>

    <!-- Aggregates -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text mb-4">
        <Activity class="w-5 h-5 inline mr-2 text-purple-600" /> Telemetry Aggregates
      </h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
            <tr v-for="a in aggregates" :key="a.id" class="hover:bg-gray-50">
              <td class="px-4 py-2 text-sm font-medium text-gray-900">{{ a.standardKey }}</td>
              <td class="px-4 py-2 text-sm text-blue-600">{{ a.avgValue?.toFixed(2) ?? '—' }}</td>
              <td class="px-4 py-2 text-sm">{{ a.minValue?.toFixed(2) ?? '—' }}</td>
              <td class="px-4 py-2 text-sm">{{ a.maxValue?.toFixed(2) ?? '—' }}</td>
              <td class="px-4 py-2 text-sm text-gray-500">{{ a.period }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Raw Telemetry Data -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text mb-4">
        <Database class="w-5 h-5 inline mr-2 text-orange-600" /> Raw Telemetry Data
      </h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
            <tr v-for="d in telemetryData" :key="d.id" class="hover:bg-gray-50">
              <td class="px-4 py-2 text-sm font-medium text-gray-900">{{ d.standardKey }}</td>
              <td class="px-4 py-2 text-sm text-blue-600 font-bold">{{ d.value }}</td>
              <td class="px-4 py-2"><span :class="qClass(d.quality)">{{ d.quality }}</span></td>
              <td class="px-4 py-2 text-sm text-gray-500">{{ fmt(d.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { DownloadCloud, Activity, Database } from '@lucide/vue';
import { toast } from '../../composables/useSweetAlert';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const route = useRoute();
const API = '/plts/api/v1';

const device = ref(null);
const aggregates = ref([]);
const telemetryData = ref([]);

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
const dailyChart = computed(() => ({
  labels: ['Production', 'Consumption', 'Export', 'Import'],
  datasets: [{
    data: [
      device.value?.totalProduction || 0,
      device.value?.totalConsumption || 0,
      device.value?.totalExport || 0,
      device.value?.totalImport || 0,
    ],
    backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'],
    borderWidth: 0,
  }],
}));

const fmt = ts => ts ? new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const statusBadge = s => {
  const m = { ONLINE: 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700', OFFLINE: 'px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700' };
  return m[s] || 'px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500';
};
const qClass = q => {
  const m = { GOOD: 'px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700', BAD: 'px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700', UNCERTAIN: 'px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700' };
  return m[q] || 'px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500';
};

onMounted(async () => {
  const id = route.params.id;
  try {
    const r = await (await fetch(`${API}/devices/${id}`)).json();
    if (r.success) device.value = r.data;
  } catch { toast.error('Gagal muat detail device'); }
  try {
    const r = await (await fetch(`${API}/telemetry/aggregates?deviceId=${id}`)).json();
    if (r.success) aggregates.value = r.data || [];
  } catch {}
  try {
    const r = await (await fetch(`${API}/telemetry/data?deviceId=${id}`)).json();
    if (r.success) telemetryData.value = r.data || [];
  } catch {}
});
</script>