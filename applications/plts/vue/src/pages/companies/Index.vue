<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Companies Management</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2">
        <Plus class="w-4 h-4" /> Add Company
      </button>
    </div>

    <!-- Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Companies</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ stats.total }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.active }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Pending</p>
        <p class="text-2xl font-bold text-amber-600">{{ stats.pending }}</p>
      </div>
    </div>

    <!-- Search Section (Right Aligned) -->
    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search companies..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="company in filteredCompanies" :key="company.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ company.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ company.industry }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ company.region }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="getStatusClass(company.status)">{{ company.status }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(company)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(company)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Create/Edit -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Company' : 'Add Company' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Name</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              placeholder="Company name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Industry</label>
            <select v-model="form.industry"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="">Select Industry</option>
              <option value="Utilities">Utilities</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Renewables">Renewables</option>
              <option value="Energy Services">Energy Services</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Region</label>
            <input v-model="form.region" type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              placeholder="Region / City" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Status</label>
            <select v-model="form.status"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Review">Review</option>
              <option value="Inactive">Inactive</option>
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
import { computed, ref, onMounted } from 'vue';
import { Search, Pencil, Trash2, Plus } from '@lucide/vue';
import Swal from '../../composables/useSweetAlert';
import apiClient from '../../api/client';

const search = ref('');
const showModal = ref(false);
const editing = ref(null);
const saving = ref(false);
const loading = ref(false);

const companies = ref([]);

const fetchCompanies = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/companies');
    companies.value = (res.data.data || []).map(c => ({
      id: c.id,
      name: c.name,
      industry: c.industry || '-',
      region: c.region || c.city || '-',
      status: c.status || 'Active'
    }));
  } catch (e) {
    console.error('fetchCompanies failed', e.message);
    Swal.toast.error('Gagal memuat company');
  } finally {
    loading.value = false;
  }
};

const filteredCompanies = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return companies.value;
  return companies.value.filter(c => [c.name, c.industry, c.region, c.status].join(' ').toLowerCase().includes(q));
});

const stats = computed(() => ({
  total: companies.value.length,
  active: companies.value.filter(c => String(c.status).toLowerCase() === 'active').length,
  pending: companies.value.filter(c => String(c.status).toLowerCase() === 'pending').length,
}));

const getStatusClass = (status) => {
  const l = String(status).toLowerCase();
  const classes = { 'active': 'badge-success', 'pending': 'badge-warning', 'inactive': 'badge-danger', 'review': 'badge-info' };
  return classes[l] || 'badge-info';
};

function openModal(c = null) {
  editing.value = c;
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

const form = ref({
  name: '',
  industry: '',
  region: '',
  status: 'Active',
});

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await apiClient.put(`/companies/${editing.value.id}`, form.value);
      Swal.toast.success('Company updated');
    } else {
      await apiClient.post('/companies', form.value);
      Swal.toast.success('Company created');
    }
    closeModal();
    await fetchCompanies();
  } catch (err) {
    Swal.toast.error('Failed to save');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(c) {
  if (await Swal.confirm(`Delete ${c.name}?`)) {
    try {
      await apiClient.delete(`/companies/${c.id}`);
      Swal.toast.success('Company deleted');
      await fetchCompanies();
    } catch { Swal.toast.error('Failed to delete'); }
  }
}

onMounted(fetchCompanies);
</script>