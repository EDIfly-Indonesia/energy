//src/utils/permission.js

import { useAuthStore } from "../stores/auth.store";

/**
 * Check if current user is super admin
 */
export function isSuperAdmin() {
  const authStore = useAuthStore();
  const role = authStore.user?.role || {};
  const user = authStore.user || {};

  const roleName = (role.name || role.role_name || user.role_name || role.slug || "").toLowerCase();
  const roleId = role.id || role.role_id || user.role_id;

  return (
    roleId === 1 ||
    ["super_admin", "super admin", "superadmin"].includes(roleName)
  );
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
  const authStore = useAuthStore();
  if (isSuperAdmin()) return true;

  const role = authStore.user?.role || {};
  const user = authStore.user || {};
  const roleName = (role.name || role.role_name || user.role_name || role.slug || "").toLowerCase();

  return roleName === "admin";
}

/**
 * Check if current user has permission
 */
export function userCan(capability, feature = null) {
  const authStore = useAuthStore();

  if (!authStore.user) return false;

  // Super admin has all permissions
  if (isSuperAdmin()) return true;

  // Admin has most permissions except system/settings
  if (isAdmin()) {
    if (feature !== "system" && feature !== "settings" && feature !== "permissions" && feature !== "roles") {
      return true;
    }
  }

  // Get permissions from store
  const permissions = authStore.permissions || [];

  // Check for 'all' capability or feature
  const hasGlobalPermission = permissions.some(
    (p) => (p.capability === "all" || p.capability === capability) && 
           (p.feature === "all" || p.feature === feature)
  );
  
  if (hasGlobalPermission) return true;

  if (!feature) {
    return permissions.some((p) => p.capability === capability);
  }

  return permissions.some(
    (p) => (p.feature === feature || p.module === feature) && 
           (p.capability === capability || p.action === capability)
  );
}

/**
 * Check if user can perform action on a resource
 */
export function can(action, resource, userId = null) {
  return userCan(action, resource, userId);
}

/**
 * Check if user cannot perform action on a resource
 */
export function cannot(action, resource, userId = null) {
  return !userCan(action, resource, userId);
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
  const authStore = useAuthStore();
  return !!authStore.token;
}

/**
 * Vue directive for permission-based rendering
 */
export const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding;

    let action, resource;

    if (typeof value === "string") {
      const parts = value.split(" ");
      action = parts[0];
      resource = parts.slice(1).join(" ");
    } else if (typeof value === "object") {
      action = value.action;
      resource = value.resource;
    }

    if (!can(action, resource)) {
      el.style.display = "none";
    }
  },

  updated(el, binding) {
    const { value } = binding;

    let action, resource;

    if (typeof value === "string") {
      const parts = value.split(" ");
      action = parts[0];
      resource = parts.slice(1).join(" ");
    } else if (typeof value === "object") {
      action = value.action;
      resource = value.resource;
    }

    if (!can(action, resource)) {
      el.style.display = "none";
    } else {
      el.style.display = "";
    }
  },
};

/**
 * Vue plugin
 */
export default {
  install(app) {
    app.config.globalProperties.$can = can;
    app.config.globalProperties.$cannot = cannot;
    app.config.globalProperties.$userCan = userCan;
    app.config.globalProperties.$isLoggedIn = isLoggedIn;
    app.config.globalProperties.$isAdmin = isAdmin;
    app.config.globalProperties.$isSuperAdmin = isSuperAdmin;

    app.directive("permission", permissionDirective);
  },
};
