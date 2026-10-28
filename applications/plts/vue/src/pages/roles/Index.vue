<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Roles Management</h2>
      <button @click="openModal()" class="btn-primary flex items-center gap-2"><Plus class="w-4 h-4" /> Add Role</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Roles</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ roles.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">System Level</p>
        <p class="text-2xl font-bold text-red-600">{{ systemCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Business & Field</p>
        <p class="text-2xl font-bold text-yellow-600">{{ businessCount }}</p>
      </div>
    </div>

    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search roles..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="role in filteredRoles" :key="role.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ role.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="badge badge-info">{{ role.level }}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ role.description }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="openModal(role)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button @click="handleDelete(role)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">{{ editing ? 'Edit Role' : 'Add Role' }}</h3>
        </div>
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Name</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Role name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Level</label>
            <select v-model="form.level"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500">
              <option value="System">System</option>
              <option value="Business">Business</option>
              <option value="Field">Field</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Description</label>
            <textarea v-model="form.description" rows="2"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500" placeholder="Role description"></textarea>
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

const roles = ref([]);

const fetchRoles = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/roles');
    roles.value = (res.data.data || []).map(r => ({
      id: r.id,
      name: r.name,
      level: r.level || r.description || 'System',
      description: r.description || ''
    }));
  } catch (e) {
    console.error('fetchRoles failed', e.message);
    Swal.toast.error('Gagal memuat role');
  } finally {
    loading.value = false;
  }
};

const form = ref({ name: '', level: 'Business', description: '' });

const filteredRoles = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return roles.value;
  return roles.value.filter(r => [r.name, r.level, r.description].join(' ').toLowerCase().includes(q));
});

const systemCount = computed(() => roles.value.filter(r => r.level === 'System').length);
const businessCount = computed(() => roles.value.filter(r => r.level !== 'System').length);

function openModal(r = null) {
  editing.value = r;
  form.value = r ? { name: r.name, level: r.level, description: r.description } : { name: '', level: 'Business', description: '' };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await apiClient.put(`/roles/${editing.value.id}`, form.value);
      Swal.toast.success('Role updated');
    } else {
      await apiClient.post('/roles', form.value);
      Swal.toast.success('Role created');
    }
    closeModal();
    await fetchRoles();
  } catch (err) {
    Swal.toast.error('Failed to save');
  } finally { saving.value = false; }
}

async function handleDelete(r) {
  if (await Swal.confirm(`Delete role "${r.name}"?`)) {
    try {
      await apiClient.delete(`/roles/${r.id}`);
      Swal.toast.success('Role deleted');
      await fetchRoles();
    } catch { Swal.toast.error('Failed to delete'); }
  }
}

onMounted(fetchRoles);
</script>