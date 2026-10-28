<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Devices Management</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2"><Plus class="w-4 h-4" /> Add Device</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Devices</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ devices.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Online</p>
        <p class="text-2xl font-bold text-green-600">{{ onlineCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Warning</p>
        <p class="text-2xl font-bold text-yellow-600">{{ warningCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Offline</p>
        <p class="text-2xl font-bold text-red-600">{{ offlineCount }}</p>
      </div>
    </div>

    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search devices..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="device in filteredDevices" :key="device.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <router-link :to="`/devices/${device.id}`" class="text-scada-600 hover:text-scada-900 hover:underline">{{ device.name }}</router-link>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ device.type }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ device.site }}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="badge" :class="getStatusClass(device.status)">{{ device.status }}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(device)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(device)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Device' : 'Add Device' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Name</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Device name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Type</label>
            <select v-model="form.type"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="Smart Meter">Smart Meter</option>
              <option value="Gateway">Gateway</option>
              <option value="Sensor">Sensor</option>
              <option value="Inverter">Inverter</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Site</label>
            <input v-model="form.site" type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Site name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Status</label>
            <select v-model="form.status"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="Online">Online</option>
              <option value="Warning">Warning</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Plus, Search, Pencil, Trash2, RefreshCw } from '@lucide/vue';
import { useRouter } from 'vue-router';
import Swal from '../../composables/useSweetAlert';
import apiClient from '../../api/client';

const router = useRouter();
const search = ref('');
const showModal = ref(false);
const editing = ref(null);
const saving = ref(false);
const loading = ref(false);

const devices = ref([]);
const sites = ref([]);

// Helper: format device data from backend to component structure
const formatDevices = (dList) => dList.map(d => ({
  id: d.id,
  name: d.serialNumber,
  type: d.type?.name || 'Unknown',
  site: d.site?.name || 'Unknown',
  status: d.status || 'Unknown',
  brand: d.brand?.name || '',
  lastSeen: d.lastSeenAt || null
}));

const fetchDevices = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/devices', { params: { include: 'site,brand,type' } });
    devices.value = formatDevices(res.data.data || []);
  } catch (err) {
    console.error('fetchDevices failed', err.message);
    Swal.toast.error('Gagal memuat daftar perangkat');
  } finally {
    loading.value = false;
  }
};

const form = ref({ name: '', type: 'Smart Meter', site: '', status: 'Online' });

const filteredDevices = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return devices.value;
  return devices.value.filter(d => [d.name, d.type, d.site, d.status].join(' ').toLowerCase().includes(q));
});

const onlineCount = computed(() => devices.value.filter(d => String(d.status).toLowerCase() === 'online').length);
const warningCount = computed(() => devices.value.filter(d => String(d.status).toLowerCase() === 'warning').length);
const offlineCount = computed(() => devices.value.filter(d => String(d.status).toLowerCase() === 'offline').length);

const getStatusClass = (s) => {
  const l = String(s).toLowerCase();
  if (l === 'online') return 'badge-success';
  if (l === 'warning') return 'badge-warning';
  if (l === 'offline') return 'badge-danger';
  if (l === 'maintenance') return 'badge-info';
  return 'badge-secondary';
};

function openModal(device = null) {
  editing.value = device;
  form.value = device ? { name: device.name, type: device.type, site: device.site, status: device.status } : { name: '', type: 'Smart Meter', site: '', status: 'Online' };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await apiClient.put(`/devices/${editing.value.id}`, form.value);
      Swal.toast.success('Device updated');
    } else {
      await apiClient.post('/devices', form.value);
      Swal.toast.success('Device created');
    }
    closeModal();
    await fetchDevices();
  } catch (err) {
    Swal.toast.error('Failed to save');
  } finally { saving.value = false; }
}

async function handleDelete(device) {
  if (await Swal.confirm(`Delete device "${device.name}"?`)) {
    try {
      await apiClient.delete(`/devices/${device.id}`);
      Swal.toast.success('Device deleted');
      await fetchDevices();
    } catch { Swal.toast.error('Failed to delete'); }
  }
}

onMounted(() => {
  fetchDevices();
});
</script>