<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Telemetry Mappings</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2"><Plus class="w-4 h-4" /> Add Mapping</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Mappings</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ mappings.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Configured</p>
        <p class="text-2xl font-bold text-green-600">{{ configuredCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Draft</p>
        <p class="text-2xl font-bold text-gray-400">{{ draftCount }}</p>
      </div>
    </div>

    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search mappings..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Key</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Key</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="m in filteredMappings" :key="m.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ m.device }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ m.vendorKey }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ m.standardKey }}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="badge" :class="m.status === 'Configured' ? 'badge-success' : 'badge-info'">{{ m.status }}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(m)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(m)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Mapping' : 'Add Mapping' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Device</label>
            <input v-model="form.device" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Device name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Vendor Key</label>
            <input v-model="form.vendorKey" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="e.g. voltage" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Standard Key</label>
            <input v-model="form.standardKey" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="e.g. energy_kwh" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Status</label>
            <select v-model="form.status"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="Configured">Configured</option>
              <option value="Draft">Draft</option>
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
import { ref, computed } from 'vue';
import { Plus, Search, Pencil, Trash2 } from '@lucide/vue';
import Swal from '../../composables/useSweetAlert';

const search = ref('');
const showModal = ref(false);
const editing = ref(null);
const saving = ref(false);

const mappings = ref([
  { id: 1, device: 'Meter-01', vendorKey: 'voltage', standardKey: 'energy_kwh', status: 'Configured' },
  { id: 2, device: 'Gateway-02', vendorKey: 'state', standardKey: 'status', status: 'Draft' },
]);

const form = ref({ device: '', vendorKey: '', standardKey: '', status: 'Configured' });

const filteredMappings = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return mappings.value;
  return mappings.value.filter(m => [m.device, m.vendorKey, m.standardKey, m.status].join(' ').toLowerCase().includes(q));
});

const configuredCount = computed(() => mappings.value.filter(m => m.status === 'Configured').length);
const draftCount = computed(() => mappings.value.filter(m => m.status !== 'Configured').length);

function openModal(m = null) {
  editing.value = m;
  form.value = m ? { device: m.device, vendorKey: m.vendorKey, standardKey: m.standardKey, status: m.status } : { device: '', vendorKey: '', standardKey: '', status: 'Configured' };
  showModal.value = true;
}
function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      Object.assign(mappings.value.find(x => x.id === editing.value.id), form.value);
      Swal.toast.success('Mapping updated');
    } else {
      mappings.value.push({ id: Date.now(), ...form.value });
      Swal.toast.success('Mapping created');
    }
    closeModal();
  } catch (err) { Swal.toast.error('Failed to save'); }
  finally { saving.value = false; }
}

async function handleDelete(m) {
  if (await Swal.confirm(`Delete mapping for ${m.device}?`)) {
    mappings.value = mappings.value.filter(x => x.id !== m.id);
    Swal.toast.success('Mapping deleted');
  }
}
</script>