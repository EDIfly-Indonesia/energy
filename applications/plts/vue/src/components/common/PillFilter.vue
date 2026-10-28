<template>
  <div class="flex items-center p-1 bg-gray-100 dark:bg-scada-bg rounded-full w-fit">
    <button
      v-for="option in options"
      :key="option.value"
      @click="$emit('update:modelValue', option.value)"
      class="px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200"
      :class="[
        modelValue === option.value
          ? 'bg-white dark:bg-scada-card text-gray-900 dark:text-scada-text shadow-sm'
          : 'text-gray-500 dark:text-scada-muted hover:text-gray-700 dark:hover:text-scada-text'
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    default: () => [
      { label: 'Today', value: 'today' },
      { label: '24h', value: '24h' },
      { label: '7D', value: '7d' },
      { label: '30D', value: '30d' }
    ]
  }
});

defineEmits(['update:modelValue']);
</script>
