<!-- components/common/BaseChart.vue -->
<template>
  <div class="chart-wrapper" style="height: 100%; width: 100%">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
// PERBAIKAN 1: Impor berkas register otomatis agar seluruh tipe chart (Pie, Bar, Line) aktif
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const chartRef = ref(null);
let chartInstance = null;

const props = defineProps({
  type: { type: String, required: true },
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) },
});

onMounted(() => {
  nextTick(() => {
    if (chartRef.value) {
      const parent = chartRef.value.parentElement;
      if (parent && !parent.style.height) {
        parent.style.height = "100%";
      }
      createChart();
    }
  });
});

function createChart() {
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!props.data || !props.data.datasets) {
    console.warn("[BaseChart] Data atau datasets belum siap.");
    return;
  }

  chartInstance = new Chart(chartRef.value, {
    type: props.type,
    // Gunakan salinan objek agar reaktivitas binding Vue 3 terjaga dengan aman
    data: JSON.parse(JSON.stringify(props.data)),
    options: {
      ...props.options,
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

// PERBAIKAN 2: Paksa kueri pembuatan ulang instans (re-create) jika data baru masuk dari API
watch(
  () => props.data,
  (newData) => {
    if (newData) {
      nextTick(() => {
        createChart();
      });
    }
  },
  { deep: true },
);

// Bersihkan instans saat halaman berpindah untuk mencegah kebocoran memori (memory leak)
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.chart-wrapper {
  height: 100%;
  min-height: 350px; /* Diturunkan sedikit dari 400px agar proporsional di dalam grid layout */
  width: 100%;
  position: relative;
}
</style>
