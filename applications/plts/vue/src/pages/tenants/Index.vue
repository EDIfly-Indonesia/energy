<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Tenants Management</h2>
      <button
        v-if="canCreate"
        @click="openModal()"
        class="btn-primary flex items-center gap-2"
      >
        <Plus class="w-4 h-4" /> Add Tenant
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Tenants</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-scada-text">{{ stats.total }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active</p>
        <p class="mt-2 text-3xl font-semibold text-green-600">{{ stats.active }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Inactive</p>
        <p class="mt-2 text-3xl font-semibold text-gray-400">{{ stats.inactive }}</p>
      </div>
    </div>

    <!-- Search (Right Aligned) -->
    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Search tenants..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredTenants.length === 0"
      class="bg-white dark:bg-scada-card rounded-lg shadow p-8 text-center border border-gray-200 dark:border-scada-border"
    >
      <p class="text-gray-500 dark:text-scada-muted">No tenants found</p>
    </div>

    <!-- Table -->
    <div
      v-else
      class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border"
    >
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead class="bg-gray-50 dark:bg-scada-bg">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr
            v-for="tenant in filteredTenants"
            :key="tenant.id"
            class="hover:bg-gray-50 dark:hover:bg-scada-bg/50"
          >
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">
              {{ tenant.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">
              {{ tenant.type || '—' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'"
              >
                {{ tenant.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">
              {{ formatDate(tenant.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button
                v-if="canUpdate"
                @click="openModal(tenant)"
                class="text-scada-600 hover:text-scada-900"
              >
                <Pencil class="w-4 h-4 inline" />
              </button>
              <button
                v-if="canDelete"
                @click="handleDelete(tenant)"
                class="text-red-600 hover:text-red-900"
              >
                <Trash2 class="w-4 h-4 inline" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Create/Edit -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-scada-card rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200 dark:border-scada-border">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">
            {{ editing ? 'Edit Tenant' : 'Add Tenant' }}
          </h3>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">
              Name
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
              placeholder="Tenant name"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">
              Type
            </label>
            <select
              v-model="form.type"
              class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text focus:ring-2 focus:ring-scada-500"
            >
              <option value="">Select Type</option>
              <option value="utility">Utility</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="residential">Residential</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">
              Status
            </label>
            <div class="flex items-center gap-3 mt-1">
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.isActive"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-scada-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-scada-600"></div>
              </label>
              <span class="text-sm text-gray-700 dark:text-scada-muted">
                {{ form.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-scada-600 hover:bg-scada-700 rounded-md disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Plus, Search, Pencil, Trash2 } from '@lucide/vue';
import tenantsApi from '../../api/modules/tenants';
import Swal from '../../composables/useSweetAlert';
import { useAuthStore } from '../../stores/auth.store';
import { can } from '../../utils/permission';

const authStore = useAuthStore();
const tenants = ref([]);
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const editing = ref(null);
const search = ref('');

const form = ref({
  name: '',
  type: '',
  isActive: true,
});

const canCreate = computed(() => can('create', 'tenants') || isSuperAdmin());
const canUpdate = computed(() => can('update', 'tenants') || isSuperAdmin());
const canDelete = computed(() => can('delete', 'tenants') || isSuperAdmin());

function isSuperAdmin() {
  return authStore.user?.role_name === 'super_admin' || authStore.user?.role?.name === 'super_admin';
}

const stats = computed(() => ({
  total: tenants.value.length,
  active: tenants.value.filter(t => t.isActive).length,
  inactive: tenants.value.filter(t => !t.isActive).length,
}));

const filteredTenants = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return tenants.value;
  return tenants.value.filter(t =>
    t.name?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q)
  );
});

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function loadTenants() {
  loading.value = true;
  try {
    const { data } = await tenantsApi.getTenants();
    tenants.value = data.data || [];
  } catch (err) {
    Swal.toast.error('Failed to load tenants');
  } finally {
    loading.value = false;
  }
}

function openModal(tenant = null) {
  editing.value = tenant;
  form.value = tenant
    ? { name: tenant.name, type: tenant.type || '', isActive: tenant.isActive }
    : { name: '', type: '', isActive: true };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editing.value = null;
}

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await tenantsApi.updateTenant(editing.value.id, form.value);
      Swal.toast.success('Tenant updated');
    } else {
      await tenantsApi.createTenant(form.value);
      Swal.toast.success('Tenant created');
    }
    closeModal();
    loadTenants();
  } catch (err) {
    Swal.toast.error(err.response?.data?.message || 'Failed to save');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(tenant) {
  if (await Swal.confirm(`Delete tenant "${tenant.name}"?`)) {
    try {
      await tenantsApi.deleteTenant(tenant.id);
      Swal.toast.success('Tenant deleted');
      loadTenants();
    } catch (err) {
      Swal.toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }
}

onMounted(loadTenants);
</script>