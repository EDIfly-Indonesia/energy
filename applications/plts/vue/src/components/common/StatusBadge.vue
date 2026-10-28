<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded',
      value == 1
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    ]"
  >
    <CheckCircle v-if="value == 1" class="w-3 h-3 mr-1" />
    <XCircle v-else class="w-3 h-3 mr-1" />
    {{ value == 1 ? 'Kirim' : 'Tidak Kirim' }}
  </span>
</template>

<script setup>
import { CheckCircle, XCircle } from '@lucide/vue'
defineProps({ value: { type: [Number, String], default: 0 } })
</script>
