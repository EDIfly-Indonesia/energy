//src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store";
import DefaultLayout from "../layouts/DefaultLayout.vue";
import { can, isSuperAdmin } from "../utils/permission";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../pages/auth/Login.vue"),
    meta: { guest: true, requiresAuth: false },
  },
  {
    path: "/",
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../pages/dashboard/Index.vue"),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: "tenants",
        name: "Tenants",
        component: () => import("../pages/tenants/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "tenants" },
        },
      },
      {
        path: "companies",
        name: "Companies",
        component: () => import("../pages/companies/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "companies" },
        },
      },
      {
        path: "sites",
        name: "Sites",
        component: () => import("../pages/sites/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "sites" },
        },
      },
      {
        path: "commissioning",
        name: "Commissioning",
        component: () => import("../pages/commissioning/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "create", resource: "devices" },
        },
      },
      {
        path: "devices",
        name: "Devices",
        component: () => import("../pages/devices/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "devices" },
        },
      },
      {
        path: "devices/:id",
        name: "DeviceDetail",
        component: () => import("../pages/devices/Detail.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "devices" },
        },
      },
      {
        path: "telemetry",
        name: "Telemetry",
        component: () => import("../pages/telemetry/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "telemetry" },
        },
      },
      {
        path: "telemetry_mappings",
        name: "TelemetryMappings",
        component: () => import("../pages/telemetry-mappings/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "telemetry_mappings" },
        },
      },
      {
        path: "telemetry_vendor_mappings",
        name: "VendorMappings",
        component: () => import("../pages/vendor-mappings/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "telemetry_vendor_mappings" },
        },
      },
      {
        path: "invoices",
        name: "Invoices",
        component: () => import("../pages/invoices/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "invoices" },
        },
      },
      {
        path: "rates",
        name: "Rates",
        component: () => import("../pages/rates/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "rates" },
        },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../pages/users/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "users" },
        },
      },
      {
        path: "roles",
        name: "Roles",
        component: () => import("../pages/roles/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "roles" },
        },
      },
      {
        path: "permissions",
        name: "Permissions",
        component: () => import("../pages/permissions/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "permissions" },
        },
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("../pages/settings/Index.vue"),
        meta: {
          requiresAuth: true,
          permission: { action: "view", resource: "settings" },
        },
      },
    ],
  },
  // Catch all - redirect to dashboard
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard",
  },
];

const router = createRouter({
  history: createWebHistory("/scada-vue/"),
  routes,
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // If navigating to login page
  if (to.path === "/login") {
    if (authStore.isAuthenticated) {
      return next("/dashboard");
    }
    return next();
  }

  // If not authenticated, redirect to login
  if (!authStore.isAuthenticated) {
    return next("/login");
  }

  // Check if route requires auth
  if (to.meta.requiresAuth) {
    // Check permission if defined
    if (to.meta.permission) {
      const { action, resource } = to.meta.permission;

      if (!isSuperAdmin() && !can(action, resource)) {
        // Redirect to dashboard if no permission
        return next("/dashboard");
      }
    }

    // If user has permission or no permission required, proceed
    return next();
  }

  // Default: proceed
  next();
});

export default router;
