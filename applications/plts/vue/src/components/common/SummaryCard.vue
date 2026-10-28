<!-- components/common/SummaryCard.vue -->
<template>
  <!-- h-full memastikan tinggi semua card dalam grid seragam mengikuti card tertinggi -->
  <div
    class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col justify-between"
  >
    <!-- Bagian Atas: Icon, Title, & Percentage -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div :class="['p-2 rounded-lg', iconBg]">
          <component :is="icon" :class="['w-4 h-4', iconColor]" />
        </div>
        <span class="text-sm font-semibold text-gray-600">{{ title }}</span>
      </div>
      <span
        v-if="percentage !== undefined"
        :class="[
          'text-xs font-bold px-2 py-1 rounded-full',
          percentage >= 80
            ? 'bg-green-50 text-green-700'
            : percentage >= 50
              ? 'bg-yellow-50 text-yellow-600'
              : 'bg-red-50 text-red-600',
        ]"
      >
        {{ percentage }}
      </span>
    </div>

    <!-- Bagian Tengah/Bawah: Konten Utama Dinamis -->
    <!-- flex-1 memastikan bagian ini mengambil sisa ruang kosong jika showValue bernilai false -->
    <div class="flex-1 flex flex-col justify-center">
      <!-- Tampilkan nilai total besar jika diperbolehkan -->
      <div v-if="showValue" class="text-2xl font-bold text-gray-800 mb-2">
        {{ formatNumber(value) }}
      </div>

      <!-- Slot Default untuk statistik detail (Kirim/Tidak Kirim atau Keberangkatan/Kedatangan) -->
      <slot>
        <!-- mt-0 diset jika showValue false agar nempel sejajar vertikal di tengah card -->
        <div class="grid grid-cols-2 gap-2" :class="{ 'mt-4': showValue }">
          <div
            class="bg-green-50 rounded-lg px-3 py-2 text-center flex flex-col justify-center"
          >
            <div class="text-xs text-green-600 font-medium">Kirim</div>
            <div class="text-sm font-bold text-green-800 mt-0.5">
              {{ formatNumber(sent) }}
            </div>
          </div>
          <div
            class="bg-red-50 rounded-lg px-3 py-2 text-center flex flex-col justify-center"
          >
            <div class="text-xs text-red-600 font-medium">Tidak Kirim</div>
            <div class="text-sm font-bold text-red-800 mt-0.5">
              {{ formatNumber(notSentValue) }}
            </div>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { formatNumber } from "@/utils/formatters";

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: [Object, Function], required: true },
  iconBg: { type: String, default: "bg-green-50" },
  iconColor: { type: String, default: "text-green-700" },
  value: { type: [Number, String], default: 0 },
  showValue: { type: Boolean, default: true },
  sent: { type: [Number, String], default: 0 },
  notSent: { type: [Number, String], default: undefined },
  percentage: { type: [Number, String], default: undefined },
});

const notSentValue = computed(() => {
  if (props.notSent !== undefined) return props.notSent;
  return safeNumeric(props.value) - safeNumeric(props.sent);
});

function safeNumeric(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}
</script>
