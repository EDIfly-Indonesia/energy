<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Alarms</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ alarms.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Critical</p>
        <p class="text-2xl font-bold text-red-600">{{ criticalCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Warning</p>
        <p class="text-2xl font-bold text-yellow-600">{{ warningCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Resolved</p>
        <p class="text-2xl font-bold text-green-600">{{ resolvedCount }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap justify-end items-center gap-3">
      <div class="relative w-56">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search alarms..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
      <select v-model="severityFilter"
        class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500">
        <option value="">All Severity</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
      <select v-model="statusFilter"
        class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="resolved">Resolved</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="a in filteredAlarms" :key="a.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ a.time }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-scada-text">{{ a.device }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ a.code }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ a.message }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="{ 'badge-danger': a.severity === 'critical', 'badge-warning': a.severity === 'warning', 'badge-info': a.severity === 'info' }">{{ a.severity }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="a.status === 'active' ? 'badge-danger' : 'badge-success'">{{ a.status }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button v-if="a.status === 'active'" class="text-green-600 hover:text-green-800"><CheckCircle class="w-4 h-4 inline" /></button>
              <button class="text-scada-600 hover:text-scada-900 ml-2"><Pencil class="w-4 h-4 inline" /></button>
              <button class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, CheckCircle, Pencil, Trash2 } from '@lucide/vue';
import apiClient from '../../api/client';
import Swal from '../../composables/useSweetAlert';

const search = ref('');
const severityFilter = ref('');
const statusFilter = ref('');
const loading = ref(false);
const alarms = ref([]);

const fetchAlarms = async () => {
  loading.value = true;
  try {
    const params = {};
    if (severityFilter.value) params.severity = severityFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await apiClient.get('/alarms', { params });
    alarms.value = (res.data.data || []).map(a => ({
      id: a.id,
      time: new Date(a.createdAt).toLocaleString('id-ID'),
      device: a.device?.serialNumber || '-',
      code: a.errorCode || '-',
      message: a.message || '-',
      severity: (a.severity || 'info').toLowerCase(),
      status: a.resolvedAt ? 'resolved' : 'active'
    }));
  } catch (e) {
    console.error('fetchAlarms failed', e.message);
    Swal.toast.error('Gagal memuat alarm');
  } finally {
    loading.value = false;
  }
};

const filteredAlarms = computed(() => {
  let result = alarms.value;
  if (severityFilter.value) result = result.filter(a => a.severity === severityFilter.value);
  if (statusFilter.value) result = result.filter(a => a.status === statusFilter.value);
  const q = search.value.trim().toLowerCase();
  if (q) result = result.filter(a => [a.device, a.code, a.message, a.severity, a.status].join(' ').toLowerCase().includes(q));
  return result;
});

const criticalCount = computed(() => alarms.value.filter(a => a.severity === 'critical').length);
const warningCount = computed(() => alarms.value.filter(a => a.severity === 'warning').length);
const resolvedCount = computed(() => alarms.value.filter(a => a.status === 'resolved').length);

onMounted(fetchAlarms);
</script>