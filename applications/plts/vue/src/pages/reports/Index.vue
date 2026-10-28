<template>
  <div class="space-y-6">
    <!-- Header with Export Buttons -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Reports</h2>
      <div class="flex gap-2">
        <button @click="exportReport('csv')" class="btn-secondary flex items-center gap-2" :disabled="exporting">
          <Download class="w-4 h-4" /> Export CSV
        </button>
        <button @click="exportReport('xlsx')" class="btn-secondary flex items-center gap-2" :disabled="exporting">
          <Download class="w-4 h-4" /> Export XLSX
        </button>
        <button @click="exportReport('pdf')" class="btn-primary flex items-center gap-2" :disabled="exporting">
          <Download class="w-4 h-4" /> Export PDF
        </button>
      </div>
    </div>

    <!-- Date Range Filter -->
    <div class="flex flex-wrap gap-4 items-center">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Date Range</label>
        <div class="flex gap-2">
          <input v-model="dateFrom" type="date" class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
          <span class="self-center text-gray-400">to</span>
          <input v-model="dateTo" type="date" class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Sites</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ stats.total }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Capacity (kWp)</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats.capacity }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active Devices</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.activeDevices }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active Alarms</p>
        <p class="text-2xl font-bold text-red-600">{{ stats.activeAlarms }}</p>
      </div>
    </div>

    <!-- Search (Right Aligned) -->
    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search sites..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredReports.length === 0"
      class="bg-white dark:bg-scada-card rounded-lg shadow p-8 text-center border border-gray-200 dark:border-scada-border">
      <p class="text-gray-500 dark:text-scada-muted">No sites found</p>
    </div>

    <!-- Table - Shows sites for energy report -->
    <div v-else class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead class="bg-gray-50 dark:bg-scada-bg">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity (kWp)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="site in filteredReports" :key="site.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ site.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ Number(site.capacityKwp).toFixed(2) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ site.latitude ? Number(site.latitude).toFixed(8) : '—' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ site.longitude ? Number(site.longitude).toFixed(8) : '—' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button class="text-scada-600 hover:text-scada-900"><Eye class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Export Loading Modal -->
    <div v-if="exporting" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-scada-card rounded-lg p-6 text-center shadow-xl">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-scada-600 mx-auto mb-4"></div>
        <p class="text-gray-900 dark:text-scada-text">Generating {{ exportFormat.toUpperCase() }} report...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, Download, Eye } from '@lucide/vue';
import reportsApi from '../../api/modules/reports';
import Swal from '../../composables/useSweetAlert';

const search = ref('');
const loading = ref(false);
const exporting = ref(false);
const exportFormat = ref('csv');
const dateFrom = ref('');
const dateTo = ref('');

const reports = ref([]);

const filteredReports = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return reports.value;
  return reports.value.filter(r => [r.name, r.capacityKwp].join(' ').toLowerCase().includes(q));
});

const stats = ref({ total: 0, capacity: '0.00', activeDevices: 0, activeAlarms: 0 });

async function loadReports() {
  loading.value = true;
  try {
    const res = await reportsApi.getEnergyReport();
    reports.value = res.data.data || [];
    stats.value = res.data.stats || { total: 0, capacity: 0, activeDevices: 0, activeAlarms: 0 };
  } catch (err) {
    console.error('loadReports failed', err);
    Swal.toast.error('Gagal memuat laporan');
  } finally {
    loading.value = false;
  }
}

async function exportReport(format) {
  exporting.value = true;
  exportFormat.value = format;
  try {
    const params = { format };
    if (dateFrom.value) params.from = dateFrom.value;
    if (dateTo.value) params.to = dateTo.value;

    const res = await reportsApi.exportEnergyReport(params);
    const blob = new Blob([res.data], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : format === 'pdf'
          ? 'application/pdf'
          : 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `energy-report-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    Swal.toast.success(`${format.toUpperCase()} report downloaded`);
  } catch (err) {
    console.error('Export failed', err);
    Swal.toast.error('Gagal export laporan');
  } finally {
    exporting.value = false;
  }
}

onMounted(loadReports);
</script>