<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Rates Management</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2"><Plus class="w-4 h-4" /> Add Rate</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Rates</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ rates.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active</p>
        <p class="text-2xl font-bold text-green-600">{{ activeCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Rate per kWh</p>
        <p class="text-2xl font-bold text-amber-600">{{ minRate }} - {{ maxRate }}</p>
      </div>
    </div>

    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search rates..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="rate in filteredRates" :key="rate.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ rate.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ rate.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-scada-text font-medium">{{ rate.price }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ rate.unit }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(rate)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(rate)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Rate' : 'Add Rate' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Name</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Rate name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Description</label>
            <input v-model="form.description" type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Optional description" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Price</label>
            <input v-model="form.price" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="e.g. Rp 1.450" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Unit</label>
            <select v-model="form.unit"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="kWh">kWh</option>
              <option value="kVAh">kVAh</option>
              <option value="MW">MW</option>
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

const rates = ref([
  { id: 1, name: 'Peak Rate', description: 'Higher price during peak demand', price: 'Rp 1.450', unit: 'kWh' },
  { id: 2, name: 'Off Peak', description: 'Lower price outside peak hours', price: 'Rp 1.050', unit: 'kWh' },
]);

const form = ref({ name: '', description: '', price: '', unit: 'kWh' });

const filteredRates = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return rates.value;
  return rates.value.filter(r => [r.name, r.description, r.price, r.unit].join(' ').toLowerCase().includes(q));
});

const activeCount = computed(() => rates.value.length);
const minRate = computed(() => {
  const nums = rates.value.map(r => parseInt(r.price.replace(/[^0-9]/g, ''))).filter(Boolean);
  return nums.length ? Math.min(...nums).toLocaleString('id-ID') : '—';
});
const maxRate = computed(() => {
  const nums = rates.value.map(r => parseInt(r.price.replace(/[^0-9]/g, ''))).filter(Boolean);
  return nums.length ? Math.max(...nums).toLocaleString('id-ID') : '—';
});

function openModal(r = null) {
  editing.value = r;
  form.value = r ? { name: r.name, description: r.description, price: r.price, unit: r.unit } : { name: '', description: '', price: '', unit: 'kWh' };
  showModal.value = true;
}
function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      Object.assign(rates.value.find(x => x.id === editing.value.id), form.value);
      Swal.toast.success('Rate updated');
    } else {
      rates.value.push({ id: Date.now(), ...form.value });
      Swal.toast.success('Rate created');
    }
    closeModal();
  } catch (err) { Swal.toast.error('Failed to save'); }
  finally { saving.value = false; }
}

async function handleDelete(r) {
  if (await Swal.confirm(`Delete rate "${r.name}"?`)) {
    rates.value = rates.value.filter(x => x.id !== r.id);
    Swal.toast.success('Rate deleted');
  }
}
</script>