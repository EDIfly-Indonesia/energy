<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Device Commissioning</h2>

    <div class="bg-white dark:bg-scada-card rounded-lg shadow p-6 border border-gray-200 dark:border-scada-border">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Tenant</label>
            <select v-model="form.tenantId" required class="w-full px-3 py-2 border rounded-md">
              <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Site</label>
            <select v-model="form.siteId" required class="w-full px-3 py-2 border rounded-md">
              <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Device ID / Serial</label>
            <input v-model="form.serialNumber" type="text" required class="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-scada-muted mb-1">Model Name</label>
            <input v-model="form.modelName" type="text" class="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <button type="submit" class="btn-primary">Register Device</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const form = ref({ tenantId: '', siteId: '', serialNumber: '', modelName: '' });
const tenants = ref([]);
const sites = ref([]);

async function handleSubmit() {
  console.log('Registering:', form.value);
  // Implement API call
}
</script>
