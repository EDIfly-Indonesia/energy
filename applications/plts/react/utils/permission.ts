// src/utils/permission.ts
import { useAuthStore } from "../stores/auth.store";
import { Permission } from "../types";

export function isSuperAdmin(): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  const role = (user.role as any) || {};
  const roleName = (role.name || role.role_name || user.role_name || role.slug || "").toLowerCase();
  const roleId = role.id || role.role_id || user.role_id;

  return (
    roleId === 1 ||
    ["super_admin", "super admin", "superadmin"].includes(roleName)
  );
}

export function isAdmin(): boolean {
  if (isSuperAdmin()) return true;
  const user = useAuthStore.getState().user;
  if (!user) return false;
  const role = (user.role as any) || {};
  const roleName = (role.name || role.role_name || user.role_name || role.slug || "").toLowerCase();
  return roleName === "admin";
}

export function userCan(capability: string, feature: string | null = null): boolean {
  if (isSuperAdmin()) return true;
  
  if (isAdmin() && feature !== "system" && feature !== "settings" && feature !== "permissions" && feature !== "roles") {
    return true;
  }

  const permissions = useAuthStore.getState().permissions;
  const hasGlobalPermission = permissions.some(
    (p: Permission) => (p.capability === "all" || p.capability === capability) && 
           (p.feature === "all" || p.feature === feature)
  );
  
  if (hasGlobalPermission) return true;
  if (!feature) return permissions.some((p: Permission) => p.capability === capability);

  return permissions.some(
    (p: Permission) => (p.feature === feature || p.module === feature) && 
           (p.capability === capability || p.action === capability)
  );
}

export function can(action: string, resource: string): boolean {
  return userCan(action, resource);
}
