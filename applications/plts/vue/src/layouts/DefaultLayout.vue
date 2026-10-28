<template>
  <div class="flex h-screen overflow-hidden bg-gray-100 dark:bg-scada-bg">
    <!-- Sidebar -->
    <AppSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-20 bg-black/30"
      @click="isSidebarOpen = false"
    />

    <!-- Main Content -->
    <div
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300"
    >
      <!-- Header -->
      <header
        class="h-16 bg-white dark:bg-scada-card flex items-center justify-between px-6 shadow-sm border-b border-gray-200 dark:border-scada-border"
      >
        <div class="flex items-center gap-4">
          <button
            @click="isSidebarOpen = !isSidebarOpen"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :aria-expanded="isSidebarOpen"
          >
            <Menu class="w-5 h-5 text-gray-500 dark:text-scada-muted" />
          </button>
          <h1 class="text-lg font-semibold text-gray-800 dark:text-scada-text">
            {{ pageTitle }}
          </h1>
        </div>

        <div class="flex items-center space-x-3">
          <button
            @click="isSearchDrawerOpen = true"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter class="w-5 h-5 text-gray-500 dark:text-scada-muted" />
          </button>
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 rounded-full bg-scada-600 flex items-center justify-center text-white text-xs font-bold"
            >
              {{ userInitials }}
            </div>
            <div class="hidden md:block">
              <p
                class="text-sm font-medium text-gray-700 dark:text-scada-text leading-none"
              >
                {{ userName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-scada-muted mt-1">
                {{ userRole }}
              </p>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-2 z-30">
        <router-view />
      </main>
    </div>

    <!-- Search Drawer -->
    <div class="fixed inset-0 z-40" v-if="isSearchDrawerOpen">
      <div
        class="absolute inset-0 bg-black/50 transition-opacity"
        @click="isSearchDrawerOpen = false"
      />
      <div
        class="absolute right-0 top-0 h-full w-96 bg-white dark:bg-scada-card shadow-xl transition-transform duration-300"
      >
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-scada-border"
        >
          <h2 class="text-lg font-semibold text-gray-800 dark:text-scada-text">
            Filter
          </h2>
          <button
            @click="isSearchDrawerOpen = false"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X class="w-5 h-5 text-gray-500 dark:text-scada-muted" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto h-[calc(100%-4rem)]">
          <router-view name="filters" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth.store";
import AppSidebar from "../components/layout/AppSidebar.vue";
import { Menu, Filter, X } from "@lucide/vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isSidebarOpen = ref(false);
const isSearchDrawerOpen = ref(false);

const pageTitle = computed(() => {
  return route.name || "Dashboard";
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

const userName = computed(() => {
  return authStore.user?.name || "User";
});

const userRole = computed(() => {
  const role = authStore.user?.role || {};
  return (
    role.name ||
    role.role_name ||
    authStore.user?.role_name ||
    role.slug ||
    "User"
  );
});
</script>
