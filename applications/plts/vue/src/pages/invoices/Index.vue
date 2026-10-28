<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Invoices</h2>
      <button v-if="canCreate" @click="openModal()" class="btn-primary flex items-center gap-2">
        <Plus class="w-4 h-4" /> Add Invoice
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Invoices</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ invoices.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Paid</p>
        <p class="text-2xl font-bold text-green-600">{{ paidCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Pending</p>
        <p class="text-2xl font-bold text-yellow-600">{{ pendingCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Overdue</p>
        <p class="text-2xl font-bold text-red-600">{{ overdueCount }}</p>
      </div>
    </div>

    <!-- Search (Right Aligned) -->
    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search invoices..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white dark:bg-scada-card w-full max-w-2xl rounded-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-scada-text">
            {{ editing ? 'Edit Invoice' : 'Add Invoice' }}
          </h3>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-700 dark:text-scada-muted"><X class="w-5 h-5" /></button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Invoice #</label>
              <input v-model="form.invoiceNumber" type="text" required
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Tenant</label>
              <select v-model="form.tenantId" required
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm">
                <option value="">Pilih Tenant</option>
                <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Period Start</label>
              <input v-model="form.periodStart" type="date" required
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Period End</label>
              <input v-model="form.periodEnd" type="date" required
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Total</label>
              <input v-model.number="form.total" type="number" min="0" step="0.01" required
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Status</label>
              <select v-model="form.status"
                class="w-full px-3 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm">
                <option>DRAFT</option>
                <option>PENDING</option>
                <option>PAID</option>
                <option>OVERDUE</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="closeModal"
              class="px-4 py-2 border border-gray-300 dark:border-scada-border rounded-md text-gray-700 dark:text-scada-muted text-sm">Cancel</button>
            <button type="submit" :disabled="saving"
              class="px-4 py-2 bg-scada-600 hover:bg-scada-700 text-white rounded-md text-sm flex items-center">
              <span v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ saving ? 'Saving...' : (editing ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>


    <!-- Loading -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredInvoices.length === 0"
      class="bg-white dark:bg-scada-card rounded-lg shadow p-8 text-center border border-gray-200 dark:border-scada-border">
      <p class="text-gray-500 dark:text-scada-muted">No invoices found</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
        <thead class="bg-gray-50 dark:bg-scada-bg">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-scada-text">{{ invoice.invoiceNumber }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ invoice.tenant?.name || '—' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ formatDate(invoice.periodStart) }} ~ {{ formatDate(invoice.periodEnd) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-scada-text">{{ formatCurrency(invoice.total) }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="statusClass(invoice.status)">{{ invoice.status }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button @click="viewDetail(invoice.id)" class="text-blue-600 hover:text-blue-900"><Eye class="w-4 h-4 inline" /></button>
              <button v-if="canUpdate" @click="openModal(invoice)" class="text-scada-600 hover:text-scada-900"><Pencil class="w-4 h-4 inline" /></button>
              <button v-if="canDelete" @click="handleDelete(invoice.id)" class="text-red-600 hover:text-red-900"><Trash2 class="w-4 h-4 inline" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white dark:bg-scada-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl">
        <InvoiceDetail :invoiceId="selectedInvoiceId" @close="showDetailModal = false" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Plus, Search, Pencil, Trash2, X, Eye } from '@lucide/vue';
import InvoiceDetail from '../../components/invoices/InvoiceDetail.vue';
import invoicesApi from '../../api/modules/invoices';
import tenantsApi from '../../api/modules/tenants';
import Swal from '../../composables/useSweetAlert';
import { useAuthStore } from '../../stores/auth.store';
import { can } from '../../utils/permission';

const authStore = useAuthStore();
const invoices = ref([]);
const tenants = ref([]);
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const editing = ref(null);
const search = ref('');
const showDetailModal = ref(false);
const selectedInvoiceId = ref(null);

const form = ref({
  invoiceNumber: '',
  tenantId: '',
  periodStart: '',
  periodEnd: '',
  total: 0,
  status: 'DRAFT',
});

function viewDetail(id) {
  selectedInvoiceId.value = id;
  showDetailModal.value = true;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

const canCreate = computed(() => can('create', 'invoices'));
const canUpdate = computed(() => can('update', 'invoices'));
const canDelete = computed(() => can('delete', 'invoices'));

const paidCount = computed(() => invoices.value.filter(i => i.status === 'PAID' || i.status === 'Paid').length);
const pendingCount = computed(() => invoices.value.filter(i => i.status === 'PENDING' || i.status === 'Pending').length);
const overdueCount = computed(() => invoices.value.filter(i => i.status === 'OVERDUE' || i.status === 'Overdue').length);

const filteredInvoices = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return invoices.value;
  return invoices.value.filter(i =>
    [i.invoiceNumber, i.tenant?.name, i.status].join(' ').toLowerCase().includes(q)
  );
});

const statusClass = (status) => {
  const map = {
    PAID: 'badge-success', Paid: 'badge-success',
    PENDING: 'badge-warning', Pending: 'badge-warning',
    DRAFT: 'badge-info', Draft: 'badge-info',
    OVERDUE: 'badge-danger', Overdue: 'badge-danger',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
};

async function loadInvoices() {
  loading.value = true;
  try {
    const { data } = await invoicesApi.getInvoices();
    invoices.value = data.data || [];
  } catch (err) {
    Swal.toast.error('Failed to load invoices');
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  try {
    const { data } = await tenantsApi.getTenants();
    tenants.value = data.data || [];
  } catch (err) { console.error(err); }
}

function openModal(invoice = null) {
  editing.value = invoice;
  form.value = invoice
    ? { ...invoice }
    : { invoiceNumber: '', tenantId: '', periodStart: '', periodEnd: '', total: 0, status: 'DRAFT' };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

async function handleSubmit() {
  saving.value = true;
  try {
    if (editing.value) {
      await invoicesApi.updateInvoice(editing.value.id, form.value);
      Swal.toast.success('Invoice updated');
    } else {
      await invoicesApi.createInvoice(form.value);
      Swal.toast.success('Invoice created');
    }
    closeModal();
    loadInvoices();
  } catch (err) {
    Swal.toast.error(err.response?.data?.message || 'Failed to save');
  } finally { saving.value = false; }
}

async function handleDelete(id) {
  if (await Swal.confirm('Are you sure you want to delete this invoice?')) {
    try {
      await invoicesApi.deleteInvoice(id);
      Swal.toast.success('Invoice deleted');
      loadInvoices();
    } catch (err) { Swal.toast.error('Failed to delete'); }
  }
}

onMounted(() => { loadInvoices(); loadTenants(); });
</script>