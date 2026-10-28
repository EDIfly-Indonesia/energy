<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-scada-text">Users Management</h2>
      <button v-if="$can('create', 'users')" class="btn-primary" @click="openCreateModal">
        <Plus class="w-4 h-4 inline mr-2" /> Add User
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Total Users</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text">{{ usersStore.users.length }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Active</p>
        <p class="text-2xl font-bold text-green-600">{{ activeCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Roles</p>
        <p class="text-2xl font-bold text-blue-600">{{ roleCount }}</p>
      </div>
      <div class="bg-white dark:bg-scada-card rounded-lg shadow p-4 border border-gray-200 dark:border-scada-border">
        <p class="text-sm text-gray-500 dark:text-scada-muted">Inactive</p>
        <p class="text-2xl font-bold text-red-600">{{ inactiveCount }}</p>
      </div>
    </div>

    <!-- Search (Right Aligned) -->
    <div class="flex justify-end">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" type="text" placeholder="Search users..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-scada-border rounded-md bg-white dark:bg-scada-bg text-gray-900 dark:text-scada-text text-sm focus:ring-2 focus:ring-scada-500" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="usersStore.loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-scada-600"></div>
    </div>

    <!-- Table -->
    <div v-else class="bg-white dark:bg-scada-card rounded-lg shadow overflow-hidden border border-gray-200 dark:border-scada-border">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-scada-bg border-b border-gray-200 dark:border-scada-border">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-scada-border">
          <tr v-if="filteredUsers.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500 dark:text-scada-muted">No users found</td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-scada-bg/50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-scada-text">{{ user.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="getRoleClass(user.role?.name)">{{ user.role?.name || '-' }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-scada-muted">{{ user.tenant?.name || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="badge" :class="user.isActive ? 'badge-success' : 'badge-danger'">{{ user.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
              <button v-if="$can('edit', 'users')" @click="openEditModal(user)" class="text-scada-600 hover:text-scada-900">
                <Pencil class="w-4 h-4 inline" />
              </button>
              <button v-if="$can('delete', 'users')" @click="handleDelete(user)" class="text-red-600 hover:text-red-900">
                <Trash2 class="w-4 h-4 inline" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-gray-500 dark:text-scada-muted">Showing {{ usersStore.users.length }} of {{ usersStore.total }} users</div>
      <div class="flex space-x-2">
        <button @click="usersStore.setPage(usersStore.pagination.page - 1)"
          :disabled="usersStore.pagination.page <= 1"
          class="px-3 py-1 rounded border border-gray-300 dark:border-scada-border disabled:opacity-50">Previous</button>
        <span class="px-3 py-1 rounded bg-scada-600 text-white">{{ usersStore.pagination.page }}</span>
        <button @click="usersStore.setPage(usersStore.pagination.page + 1)"
          :disabled="usersStore.pagination.page >= usersStore.pagination.totalPages"
          class="px-3 py-1 rounded border border-gray-300 dark:border-scada-border disabled:opacity-50">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { Plus, Search, Pencil, Trash2, X } from "@lucide/vue";
import Swal from '../../composables/useSweetAlert';
import { useUsersStore } from "../../stores/users.store";
import { can, isAdmin, isSuperAdmin } from "../../utils/permission";
import usersApi from "../../api/modules/users";
import tenantsApi from "../../api/modules/tenants";
import rolesApi from "../../api/modules/roles";

const usersStore = useUsersStore();
const showModal = ref(false);
const editingUser = ref(null);
const submitting = ref(false);
const tenants = ref([]);
const roles = ref([]);
const roleSelectionError = ref(false);
const permissionSelectionError = ref(false);
const search = ref('');

const userForm = reactive({
  name: "", email: "", password: "", roleId: "", tenantId: "", isActive: true,
});

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return usersStore.users;
  return usersStore.users.filter(u =>
    [u.name, u.email, u.role?.name, u.tenant?.name].join(' ').toLowerCase().includes(q)
  );
});

const activeCount = computed(() => usersStore.users.filter(u => u.isActive).length);
const inactiveCount = computed(() => usersStore.users.filter(u => !u.isActive).length);
const roleCount = computed(() => new Set(usersStore.users.map(u => u.role?.name)).size);

const permissionModules = ref([
  { name: "tenants", label: "Tenants", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "companies", label: "Companies", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "sites", label: "Sites", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "devices", label: "Devices", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "telemetry_mappings", label: "Telemetry Mappings", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "telemetry_vendor_mappings", label: "Vendor Mappings", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "invoices", label: "Invoices", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "rates", label: "Rates", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "users", label: "Users", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "roles", label: "Roles", permissions: { view: false, create: false, edit: false, delete: false } },
  { name: "permissions", label: "Permissions", permissions: { view: false, create: false, edit: false, delete: false } },
]);

const getRoleClass = (role) => {
  const classes = { super_admin: "badge-danger", admin: "badge-warning", tenant_admin: "badge-info", tenant_user: "badge-info", installer: "badge-warning", finance: "badge-info" };
  return classes[role] || "badge-info";
};

const openCreateModal = () => {
  editingUser.value = null;
  resetForm();
  showModal.value = true;
};

const openEditModal = (user) => {
  editingUser.value = user;
  userForm.name = user.name;
  userForm.email = user.email;
  userForm.password = "";
  userForm.roleId = user.roleId || "";
  userForm.tenantId = user.tenantId || "";
  userForm.isActive = user.isActive;
  loadUserPermissions(user.id);
  showModal.value = true;
};

const resetForm = () => {
  Object.assign(userForm, { name: "", email: "", password: "", roleId: "", tenantId: "", isActive: true });
  permissionModules.value.forEach(m => { m.permissions = { view: false, create: false, edit: false, delete: false }; });
  roleSelectionError.value = false;
  permissionSelectionError.value = false;
};

const closeModal = () => { showModal.value = false; editingUser.value = null; };

const handleSubmit = async () => {
  roleSelectionError.value = false;
  permissionSelectionError.value = false;
  if (!userForm.roleId) roleSelectionError.value = true;
  const hasAnyPermission = permissionModules.value.some(m => Object.values(m.permissions).some(Boolean));
  if (!hasAnyPermission) permissionSelectionError.value = true;
  if (roleSelectionError.value || permissionSelectionError.value) {
    Swal.toast.error("Please select a role and assign at least one permission.");
    return;
  }
  submitting.value = true;
  try {
    const payload = { name: userForm.name, email: userForm.email, roleId: userForm.roleId, tenantId: userForm.tenantId || null, isActive: userForm.isActive };
    if (userForm.password) payload.password = userForm.password;
    payload.permissions = [];
    permissionModules.value.forEach(m => {
      const caps = [];
      if (m.permissions.view) caps.push("view");
      if (m.permissions.create) caps.push("create");
      if (m.permissions.edit) caps.push("edit");
      if (m.permissions.delete) caps.push("delete");
      caps.forEach(cap => payload.permissions.push({ module: m.name, capability: cap }));
    });
    if (editingUser.value) await usersStore.updateUser(editingUser.value.id, payload);
    else await usersStore.createUser(payload);
    closeModal();
  } catch (error) { console.error("Submit error:", error); }
  finally { submitting.value = false; }
};

const handleDelete = async (user) => {
  if (await Swal.confirm(`Are you sure you want to delete user ${user.name}?`)) {
    await usersStore.deleteUser(user.id);
  }
};

const fetchTenants = async () => {
  try { const r = await tenantsApi.getTenants(); tenants.value = r.data.data || []; }
  catch (error) { Swal.toast.error("Failed to load tenants"); }
};

const fetchRoles = async () => {
  try { const r = await rolesApi.getRoles(); roles.value = r.data.data || []; }
  catch (error) { Swal.toast.error("Failed to load roles"); }
};

const loadUserPermissions = async (userId) => {
  try {
    const r = await usersApi.getUserPermissions(userId);
    const permissions = r.data.data || [];
    permissionModules.value.forEach(module => {
      module.permissions.view = false;
      module.permissions.create = false;
      module.permissions.edit = false;
      module.permissions.delete = false;
      permissions.forEach(p => {
        const m = p.module || p.resource || p.feature;
        if (m !== module.name) return;
        if (p.capability === "view") module.permissions.view = true;
        if (p.capability === "create") module.permissions.create = true;
        if (p.capability === "edit") module.permissions.edit = true;
        if (p.capability === "delete") module.permissions.delete = true;
      });
    });
  } catch (error) { Swal.toast.error("Failed to load user permissions"); }
};

onMounted(async () => { await Promise.all([usersStore.fetchUsers(), fetchTenants(), fetchRoles()]); });
</script>