// src/stores/auth.store.ts
import { create } from 'zustand';
import apiClient from '../api/client';
import { User, Permission, AuthState } from '../types';

interface AuthStore extends AuthState {
  setAuthData: (accessToken: string, rToken: string, userData: User) => void;
  login: (email: string, password: string) => Promise<{ success: boolean, message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  user: JSON.parse(localStorage.getItem("user_data") || "null"),
  permissions: JSON.parse(localStorage.getItem("user_permissions") || "[]"),
  isAuthenticated: !!localStorage.getItem("access_token") && !!localStorage.getItem("user_data"),

  setAuthData: (accessToken, rToken, userData) => {
    const role = (userData.role as any) || {};
    const roleName = (role.name || role.role_name || userData.role_name || role.slug || "").toLowerCase();
    const roleId = role.id || role.role_id || userData.role_id;

    let perms: Permission[] = [];
    if (roleName.includes("super_admin") || roleName.includes("superadmin") || roleId === 1) {
      perms = [{ capability: "all", feature: "all" }];
    } else if (userData.permissions) {
      perms = userData.permissions;
    } else if (role.permissions) {
      perms = role.permissions;
    }

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", rToken);
    localStorage.setItem("user_data", JSON.stringify(userData));
    localStorage.setItem("user_permissions", JSON.stringify(perms));

    apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    set({
      token: accessToken,
      refreshToken: rToken,
      user: userData,
      permissions: perms,
      isAuthenticated: true
    });
  },

  login: async (email, password) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      get().setAuthData(accessToken, refreshToken, user);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Login failed" };
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      localStorage.clear();
      delete apiClient.defaults.headers.common["Authorization"];
      set({ token: null, refreshToken: null, user: null, permissions: [], isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    const storedToken = localStorage.getItem("access_token");
    if (!storedToken) return false;
    try {
      const response = await apiClient.get("/auth/verify");
      get().setAuthData(storedToken, localStorage.getItem("refresh_token") || "", response.data.data.user);
      return true;
    } catch {
      get().logout();
      return false;
    }
  }
}));
