<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-scada-bg text-gray-900 dark:text-scada-text">
    <router-view />
    <agentation-vue />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.store'

const authStore = useAuthStore()

onMounted(() => {
  authStore.checkAuth()
})
</script>
