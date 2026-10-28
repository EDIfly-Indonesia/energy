<!-- src/layouts/AppSidebar.vue -->
<template>
  <!-- Sidebar kiri navigasi -->
  <aside
      :class="[
        'fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
    <!-- Logo -->
    <div class="p-6 border-b border-gray-100 flex flex-col items-center gap-3">
      <div class="w-40 h-40 bg-white rounded-lg flex items-center justify-center">
        <img src="../../assets/images/smple-logo.png" class="w-full h-auto" />
      </div>
      <div>
        <p class="text-sm font-bold text-gray-800 text-center">SCADA Monitoring Platform</p>
      </div>
    </div>

    <!-- Menu Items -->
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <!-- Dashboard - always visible -->
      <RouterLink
        v-if="$can('view', 'dashboard')"
        :to="'/dashboard'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/dashboard'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <LayoutDashboard class="w-4 h-4 shrink-0" />
        <span>Dashboard</span>
        <span
          v-if="$route.path === '/dashboard'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Usage -->
      <RouterLink
        v-if="$can('view', 'usage')"
        :to="'/usage'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/usage'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Activity class="w-4 h-4 shrink-0" />
        <span>Usage</span>
        <span
          v-if="$route.path === '/usage'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Analytics -->
      <RouterLink
        v-if="$can('view', 'analytics')"
        :to="'/analytics'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/analytics'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Database class="w-4 h-4 shrink-0" />
        <span>Analytics</span>
        <span
          v-if="$route.path === '/analytics'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Invoices -->
      <RouterLink
        v-if="$can('view', 'invoices')"
        :to="'/invoices'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/invoices'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <FileText class="w-4 h-4 shrink-0" />
        <span>Invoices</span>
        <span
          v-if="$route.path === '/invoices'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Reports -->
      <RouterLink
        v-if="$can('view', 'reports')"
        :to="'/reports'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/reports'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <BarChart2 class="w-4 h-4 shrink-0" />
        <span>Reports</span>
        <span
          v-if="$route.path === '/reports'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Divider -->
      <div class="my-4 border-t border-gray-200"></div>

      <!-- Administration Section -->
      <div
        class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2"
      >
        Administration
      </div>

      <!-- Tenants -->
      <RouterLink
        v-if="$can('view', 'tenants')"
        :to="'/tenants'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/tenants'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Building2 class="w-4 h-4 shrink-0" />
        <span>Tenants</span>
        <span
          v-if="$route.path === '/tenants'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Companies -->
      <RouterLink
        v-if="$can('view', 'companies')"
        :to="'/companies'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/companies'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Building class="w-4 h-4 shrink-0" />
        <span>Companies</span>
        <span
          v-if="$route.path === '/companies'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Sites -->
      <RouterLink
        v-if="$can('view', 'sites')"
        :to="'/sites'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/sites'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <MapPin class="w-4 h-4 shrink-0" />
        <span>Sites</span>
        <span
          v-if="$route.path === '/sites'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Devices -->
      <RouterLink
        v-if="$can('view', 'devices')"
        :to="'/devices'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/devices'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Server class="w-4 h-4 shrink-0" />
        <span>Devices</span>
        <span
          v-if="$route.path === '/devices'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Telemetry Mappings -->
      <RouterLink
        v-if="$can('view', 'telemetry_mappings')"
        :to="'/telemetry_mappings'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/telemetry_mappings'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Activity class="w-4 h-4 shrink-0" />
        <span>Telemetry Mappings</span>
        <span
          v-if="$route.path === '/telemetry_mappings'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Vendor Mappings -->
      <RouterLink
        v-if="$can('view', 'telemetry_vendor_mappings')"
        :to="'/telemetry_vendor_mappings'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/telemetry_vendor_mappings'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Database class="w-4 h-4 shrink-0" />
        <span>Vendor Mappings</span>
        <span
          v-if="$route.path === '/telemetry_vendor_mappings'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Rates -->
      <RouterLink
        v-if="$can('view', 'rates')"
        :to="'/rates'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/rates'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <DollarSign class="w-4 h-4 shrink-0" />
        <span>Rates</span>
        <span
          v-if="$route.path === '/rates'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Users -->
      <RouterLink
        v-if="canSeeMenu('users')"
        :to="'/users'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/users'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Users class="w-4 h-4 shrink-0" />
        <span>Users</span>
        <span
          v-if="$route.path === '/users'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Roles -->
      <RouterLink
        v-if="canSeeMenu('roles')"
        :to="'/roles'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/roles'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Shield class="w-4 h-4 shrink-0" />
        <span>Roles</span>
        <span
          v-if="$route.path === '/roles'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Permissions -->
      <RouterLink
        v-if="canSeeMenu('permissions')"
        :to="'/permissions'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/permissions'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Lock class="w-4 h-4 shrink-0" />
        <span>Permissions</span>
        <span
          v-if="$route.path === '/permissions'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>

      <!-- Settings - always visible -->
      <RouterLink
        v-if="$can('view', 'settings')"
        :to="'/settings'"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        :class="[
          $route.path === '/settings'
            ? 'bg-scada-50 text-scada-700 border border-scada-100'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
        ]"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>Settings</span>
        <span
          v-if="$route.path === '/settings'"
          class="ml-auto w-1.5 h-1.5 rounded-full bg-scada-600"
        />
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-100">
      <div class="flex items-center gap-3 px-3 py-2">
        <div
          class="w-8 h-8 rounded-full bg-scada-100 flex items-center justify-center"
        >
          <span class="text-xs font-bold text-scada-600">
            {{ userInitials }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">
            {{ userName }}
          </p>
          <p class="text-xs text-gray-500 truncate">{{ userRole }}</p>
        </div>
        <button @click="handleLogout" class="text-gray-400 hover:text-gray-600">
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth.store";
import { isSuperAdmin, can } from "../../utils/permission";
import {
  Activity,
  LayoutDashboard,
  Building2,
  Building,
  MapPin,
  Server,
  Database,
  FileText,
  DollarSign,
  Users,
  Shield,
  Lock,
  Settings,
  LogOut,
  BarChart2,
} from "@lucide/vue";

defineProps({ isOpen: Boolean });
defineEmits(["close"]);

const router = useRouter();
const authStore = useAuthStore();

const userName = computed(() => authStore.user?.name || "User");
const userRole = computed(() => {
  const role = authStore.user?.role || {};
  const roleName =
    role.name ||
    role.role_name ||
    authStore.user?.role_name ||
    role.slug ||
    "User";
  return roleName;
});
const userInitials = computed(() => {
  const name = authStore.user?.name || "User";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const canSeeMenu = (resource) => {
  return can("view", resource);
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};
</script>