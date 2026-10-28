//src/stores/auth.store.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiClient from "../api/client";
import router from "../router";
import { userCan } from "../utils/permission";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("access_token") || null);
  const refreshToken = ref(localStorage.getItem("refresh_token") || null);
  const user = ref(JSON.parse(localStorage.getItem("user_data") || "null"));
  const permissions = ref(JSON.parse(localStorage.getItem("user_permissions") || "[]"));

  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value;
  });

  function setAuthData(accessToken, rToken, userData) {
    token.value = accessToken;
    refreshToken.value = rToken;
    user.value = userData;

    const role = userData?.role || {};
    const roleName = (role.name || role.role_name || userData.role_name || role.slug || "").toLowerCase();
    const roleId = role.id || role.role_id || userData.role_id;

    if (
      roleName.includes("super_admin") ||
      roleName.includes("super admin") ||
      roleName.includes("superadmin") ||
      roleId === 1
    ) {
      permissions.value = [{ capability: "all", feature: "all" }];
    } else if (userData.permissions) {
      permissions.value = userData.permissions;
    } else if (userData.role?.permissions) {
      permissions.value = userData.role.permissions;
    } else {
      permissions.value = [];
    }

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", rToken);
    localStorage.setItem("user_data", JSON.stringify(userData));
    localStorage.setItem("user_permissions", JSON.stringify(permissions.value));

    apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  }

  async function login(email, password) {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const { accessToken, refreshToken: rToken, user: userData } = response.data.data;
      
      setAuthData(accessToken, rToken, userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all data
      token.value = null;
      refreshToken.value = null;
      user.value = null;
      permissions.value = [];

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("user_permissions");

      delete apiClient.defaults.headers.common["Authorization"];

      router.push("/login");
    }
  }

  async function checkAuth() {
    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user_data");

    if (storedToken && storedUser) {
      try {
        const response = await apiClient.get("/auth/verify");
        const userData = response.data.data.user;

        setAuthData(storedToken, localStorage.getItem("refresh_token"), userData);
        return true;
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.clear();
        token.value = null;
        user.value = null;
        permissions.value = [];
        delete apiClient.defaults.headers.common["Authorization"];
        router.push("/login");
        return false;
      }
    }
    return false;
  }

  function hasPermission(capability, feature = null) {
    if (!user.value) return false;
    return userCan(capability, feature);
  }

  return {
    token,
    refreshToken,
    user,
    permissions,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    hasPermission,
  };
});
