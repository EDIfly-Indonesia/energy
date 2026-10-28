<template>
  <!-- Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/25 z-30"
    @click="$emit('close')"
  />

  <!-- Sidebar Panel -->
  <div
    :class="[
      'fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-40 flex flex-col transition-transform duration-300',
      isOpen ? 'translate-x-0' : 'translate-x-full',
    ]"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-5 py-4 border-b border-gray-100"
    >
      <div class="flex items-center gap-2">
        <SlidersHorizontal class="w-4 h-4 text-green-700" />
        <span class="font-semibold text-gray-800">Filter</span>
        <span
          v-if="activeCount > 0"
          class="bg-green-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
          >{{ activeCount }}</span
        >
      </div>
      <button
        @click="$emit('close')"
        class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Filter Content (slot) -->
    <div class="flex-1 overflow-y-auto p-5 space-y-4">
      <slot />
    </div>

    <!-- Footer Actions -->
    <div class="p-4 border-t border-gray-100 flex gap-2">
      <button
        @click="$emit('reset')"
        class="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Reset
      </button>
      <button
        @click="$emit('apply')"
        class="flex-1 px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        Terapkan Filter
      </button>
    </div>
  </div>
</template>

<script setup>
import { X, SlidersHorizontal } from "@lucide/vue";

defineProps({
  isOpen: { type: Boolean, default: false },
  activeCount: { type: Number, default: 0 },
});
defineEmits(["close", "apply", "reset"]);
</script>
