<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Sites Management</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2"><Plus class="w-4 h-4" /> Add Site</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Sites</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ sites.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Online</p>
        <p class="text-2xl font-bold text-green-600">{{ onlineCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Offline</p>
        <p class="text-2xl font-bold text-red-600">{{ offlineCount }}</p>
      </div>
    </div>

    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search sites..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devices</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="site in filteredSites" :key="site.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ site.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ site.location }}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="badge" :class="getStatusClass(site.status)">{{ site.status }}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ site.devices }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(site)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(site)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Site' : 'Add Site' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Name</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Site name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Location</label>
            <input v-model="form.location" type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="City / Region" />
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
import { Plus, Search, Pencil, Trash2 } from '@lucide/vue';
import Swal from '../../composables/useSweetAlert';
import apiClient from '../../api/client';

const search = ref('');
const showModal = ref(false);
const editing = ref(null);
const saving = ref(false);
const loading = ref(false);

const sites = ref([]);

const fetchSites = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/sites', { params: { include: 'devices' } });
    sites.value = (res.data.data || []).map(s => {
      const deviceCount = s.devices?.length || 0;
      // Compute status: if has devices, consider online; else offline
      // In the future, this could check device.lastSeenAt or telemetry recency
      const computedStatus = deviceCount > 0 ? 'Online' : 'Offline';
      return {
        id: s.id,
        name: s.name,
        location: s.location || 'Unknown',
        status: computedStatus,
        devices: deviceCount,
        rawStatus: computedStatus // keep for reference
      };
    });
  } catch (err) {
    console.error('fetchSites failed', err.message);
    Swal.toast.error('Gagal memuat daftar site');
  } finally {
    loading.value = false;
  }
};

const form = ref({ name: '', location: '' });

const filteredSites = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return sites.value;
  return sites.value.filter(s => [s.name, s.location, s.status].join(' ').toLowerCase().includes(q));
});

const onlineCount = computed(() => sites.value.filter(s => String(s.status).toLowerCase() === 'online').length);
const offlineCount = computed(() => sites.value.filter(s => String(s.status).toLowerCase() === 'offline').length);

const getStatusClass = (s) => {
  const l = String(s).toLowerCase();
  if (l === 'online') return 'badge-success';
  if (l === 'maintenance') return 'badge-warning';
  if (l === 'offline') return 'badge-danger';
  return 'badge-info';
};

function openModal(site = null) {
  editing.value = site;
  form.value = site ? { name: site.name, location: site.location } : { name: '', location: '' };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await apiClient.put(`/sites/${editing.value.id}`, form.value);
      Swal.toast.success('Site updated');
    } else {
      await apiClient.post('/sites', form.value);
      Swal.toast.success('Site created');
    }
    closeModal();
    await fetchSites();
  } catch (err) {
    Swal.toast.error('Failed to save');
  } finally { saving.value = false; }
}

async function handleDelete(site) {
  if (await Swal.confirm(`Delete site "${site.name}"?`)) {
    try {
      await apiClient.delete(`/sites/${site.id}`);
      Swal.toast.success('Site deleted');
      await fetchSites();
    } catch { Swal.toast.error('Failed to delete'); }
  }
}

onMounted(() => {
  fetchSites();
});
</script>