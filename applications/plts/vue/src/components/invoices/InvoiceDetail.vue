<template>
  <div class="space-y-6" v-if="invoice">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Invoice: {{ invoice.invoiceNumber }}</h2>
      <button @click="$emit('close')" class="text-sm text-scada-600 hover:text-scada-900">
        &times; Close
      </button>
    </div>

    <!-- Invoice Details -->
    <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p class="text-sm text-gray-500 dark:text-scada-muted">Tenant</p>
          <p class="font-medium text-gray-900 dark:text-scada-text">{{ invoice.tenant?.name || '—' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-scada-muted">Period</p>
          <p class="font-medium text-gray-900 dark:text-scada-text">{{ formatDate(invoice.periodStart) }} – {{ formatDate(invoice.periodEnd) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-scada-muted">Total</p>
          <p class="font-medium text-gray-900 dark:text-scada-text">{{ formatCurrency(invoice.total) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-scada-muted">Status</p>
          <p class="font-medium">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="statusClass(invoice.status)">{{ invoice.status }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Invoice Items -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-scada-text mb-3">Invoice Items</h3>
      <div v-if="items.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-scada-border">
          <thead class="bg-gray-50 dark:bg-scada-bg">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
            <tr v-for="item in items" :key="item.id || item.id">
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-scada-text">{{ item.qty }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-scada-muted">{{ item.unit || '—' }}</td>
              <td class="px-6 py-4 text-sm text-right text-gray-900 dark:text-scada-text">{{ formatCurrency(item.rate) }}</td>
              <td class="px-6 py-4 text-sm text-right text-gray-900 dark:text-scada-text">{{ formatCurrency((item.qty || 0) * (item.rate || 0)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-gray-500 dark:text-scada-muted">No items found for this invoice.</p>
    </div>
  </div>
  <div v-else class="text-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600 mx-auto"></div>
    <p class="text-sm text-gray-500 dark:text-scada-muted mt-2">Loading invoice detail…</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import invoicesApi from '../../api/modules/invoices';

const props = defineProps({ invoiceId: String });

const invoice = ref(null);
const items = ref([]);

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusClass(status) {
  const map = {
    PAID: 'badge-success',
    PENDING: 'badge-warning',
    DRAFT: 'badge-info',
    OVERDUE: 'badge-danger',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

async function loadInvoice() {
  try {
    const { data } = await invoicesApi.getInvoice(props.invoiceId);
    invoice.value = data.data;
  } catch (err) {
    console.error('Failed to load invoice:', err);
    invoice.value = null;
  }
  try {
    const { data } = await invoicesApi.getInvoiceItems(props.invoiceId);
    items.value = data.data || [];
  } catch (err) {
    console.error('Failed to load invoice items:', err);
    items.value = [];
  }
}

onMounted(loadInvoice);
watch(() => props.invoiceId, loadInvoice);
</script>
