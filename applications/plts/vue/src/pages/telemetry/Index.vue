<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Points</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ telemetryData.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Devices</p>
        <p class="text-2xl font-bold text-blue-600">{{ deviceCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Online</p>
        <p class="text-2xl font-bold text-green-600">{{ onlineCount }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap justify-end items-center gap-3">
      <div class="relative w-56">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
      <select v-model="selectedDevice"
        class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500">
        <option value="">All Devices</option>
        <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <input type="datetime-local" v-model="startDate"
        class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
      <input type="datetime-local" v-model="endDate"
        class="px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Power (kW)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voltage (V)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current (A)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="d in filteredData" :key="d.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ d.timestamp }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-scada-text">{{ d.device }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ d.power }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ d.voltage }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ d.current }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="d.status === 'normal' ? 'badge-success' : 'badge-warning'">{{ d.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Search } from '@lucide/vue';

const search = ref('');
const selectedDevice = ref('');
const startDate = ref('');
const endDate = ref('');

const devices = ref([
  { id: 1, name: 'SN-2026-001 - SMA Sunny Boy 5.0' },
  { id: 2, name: 'SN-2026-002 - Sungrow SG110CX' },
  { id: 3, name: 'SN-2026-003 - Huawei SUN2000' },
]);

const telemetryData = ref([
  { id: 1, timestamp: '2026-07-13 14:30:00', device: 'SN-2026-001', power: 4.5, voltage: 230, current: 19.6, status: 'normal' },
  { id: 2, timestamp: '2026-07-13 14:25:00', device: 'SN-2026-002', power: 3.2, voltage: 228, current: 14.0, status: 'normal' },
  { id: 3, timestamp: '2026-07-13 14:20:00', device: 'SN-2026-003', power: 0.0, voltage: 0, current: 0, status: 'offline' },
  { id: 4, timestamp: '2026-07-13 14:15:00', device: 'SN-2026-001', power: 4.8, voltage: 232, current: 20.7, status: 'normal' },
  { id: 5, timestamp: '2026-07-13 14:10:00', device: 'SN-2026-002', power: 3.5, voltage: 229, current: 15.3, status: 'normal' },
]);

const filteredData = computed(() => {
  let result = telemetryData.value;
  if (selectedDevice.value) result = result.filter(d => d.id === selectedDevice.value);
  const q = search.value.trim().toLowerCase();
  if (q) result = result.filter(d => [d.device, d.timestamp, d.status].join(' ').toLowerCase().includes(q));
  return result;
});

const deviceCount = computed(() => new Set(telemetryData.value.map(d => d.device)).size);
const onlineCount = computed(() => telemetryData.value.filter(d => d.status === 'normal').length);
</script>