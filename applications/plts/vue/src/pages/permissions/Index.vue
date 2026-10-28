<!-- src/pages/permissions/Index.vue -->
<template>
  <div>
    <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text mb-6">
      Role & Permission Management
    </h2>

    <!-- Roles Overview -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div
        v-for="role in roles"
        :key="role.name"
        class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-scada-text">
              {{ role.label }}
            </p>
            <p class="text-xs text-gray-500 dark:text-scada-muted">
              {{ role.count }} users
            </p>
          </div>
          <span class="badge" :class="getRoleBadgeClass(role.name)">{{
            role.name
          }}</span>
        </div>
      </div>
    </div>

    <!-- Permission Matrix -->
    <div
      class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border"
    >
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead
            class="bg-gray-50 dark:bg-scada-bg border-b border-gray-200 dark:border-scada-border"
          >
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-scada-muted uppercase tracking-wider min-w-[150px]"
              >
                Module / Permission
              </th>
              <th
                v-for="role in roles"
                :key="role.name"
                class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-scada-muted uppercase tracking-wider"
              >
                {{ role.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
            <tr v-for="module in permissionModules" :key="module.name">
              <td
                class="px-6 py-3 text-sm font-medium text-gray-700 dark:text-scada-text"
              >
                {{ module.label }}
              </td>
              <td
                v-for="role in roles"
                :key="role.name"
                class="px-4 py-3 text-center"
              >
                <div class="flex justify-center space-x-1">
                  <span
                    v-for="perm in ['view', 'create', 'edit']"
                    :key="perm"
                    class="inline-flex items-center"
                  >
                    <span
                      class="w-3 h-3 rounded-full"
                      :class="
                        getPermissionStatus(role.name, module.name, perm)
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      "
                    ></span>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div
      class="flex items-center justify-end space-x-6 mt-4 text-sm text-gray-500 dark:text-scada-muted"
    >
      <span class="flex items-center">
        <span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
        Granted
      </span>
      <span class="flex items-center">
        <span
          class="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 mr-2"
        ></span>
        Not Granted
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const roles = ref([
  { name: "super_admin", label: "Super Admin", count: 1 },
  { name: "admin", label: "Admin", count: 0 },
  { name: "tenant_admin", label: "Tenant Admin", count: 2 },
  { name: "tenant_user", label: "Tenant User", count: 0 },
  { name: "installer", label: "Installer", count: 2 },
  { name: "finance", label: "Finance", count: 1 },
]);

const permissionModules = ref([
  {
    name: "invoice",
    label: "Invoice",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: true, create: true, edit: true },
    },
  },
  {
    name: "rate",
    label: "Rate",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "report",
    label: "Report",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: true, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: true, create: true, edit: true },
    },
  },
  {
    name: "site",
    label: "Site",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: true, create: false, edit: false },
      installer: { view: true, create: true, edit: false },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "tenant",
    label: "Tenant",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: false, edit: false },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "company",
    label: "Company",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: false, edit: false },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "device",
    label: "Device",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: true, create: true, edit: true },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "commissioning",
    label: "Commissioning",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: true, create: true, edit: true },
      finance: { view: false, create: false, edit: false },
    },
  },
  {
    name: "users",
    label: "Users",
    permissions: {
      super_admin: { view: true, create: true, edit: true },
      admin: { view: true, create: true, edit: true },
      tenant_admin: { view: true, create: true, edit: true },
      tenant_user: { view: false, create: false, edit: false },
      installer: { view: false, create: false, edit: false },
      finance: { view: false, create: false, edit: false },
    },
  },
]);

const getRoleBadgeClass = (role) => {
  const classes = {
    super_admin: "badge-danger",
    admin: "badge-warning",
    tenant_admin: "badge-info",
    tenant_user: "badge-info",
    installer: "badge-warning",
    finance: "badge-info",
  };
  return classes[role] || "badge-info";
};

const getPermissionStatus = (role, moduleName, perm) => {
  const module = permissionModules.value.find((m) => m.name === moduleName);
  if (!module) return false;
  return module.permissions[role]?.[perm] || false;
};
</script>