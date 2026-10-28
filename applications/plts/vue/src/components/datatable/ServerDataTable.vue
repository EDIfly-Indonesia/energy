<!-- src/components/datatable/ServerDataTable.vue -->
<template>
  <div>
    <!-- Export Buttons -->
    <div class="flex gap-2 mb-3">
      <button
        @click="exportData('excel')"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
      >
        <FileSpreadsheet class="w-3.5 h-3.5" /> Excel
      </button>
      <button
        @click="exportData('pdf')"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        <FileText class="w-3.5 h-3.5" /> PDF
      </button>
    </div>

    <!-- Table Container -->
    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table
        ref="tableRef"
        class="min-w-full bg-white text-sm"
        style="width: 100%"
      >
        <thead class="bg-gray-100">
          <tr>
            <th
              v-for="col in columns"
              :key="col.data || col.title"
              class="p-2 border-b border-gray-200 text-left font-semibold text-gray-700 whitespace-nowrap"
            >
              {{ col.title }}
            </th>
          </tr>
        </thead>
        <tbody />
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { FileSpreadsheet, FileText } from "@lucide/vue";
import { API_BASE_URL } from "@/composables/useApi";
import { DT_LANGUAGE_ID } from "@/utils/formatters";
import "datatables.net-dt/css/dataTables.dataTables.min.css";
import DataTable from "datatables.net-dt";
import "datatables.net-buttons-dt";
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Register ke window agar DataTables Buttons bisa menggunakannya
window.JSZip = JSZip;
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;
window.pdfMake = pdfMake;

const props = defineProps({
  columns: { type: Array, required: true },
  apiEndpoint: { type: String, required: true },
  filterParams: { type: Object, default: () => ({}) },
  exportTitle: { type: String, default: "Data Export" },
  defaultOrder: { type: Array, default: () => [[3, "desc"]] },
});

const emit = defineEmits(["dataLoaded"]);

const tableRef = ref(null);
let dtInstance = null;

function buildUrl() {
  return `${API_BASE_URL}${props.apiEndpoint}`;
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
}

function initDataTable() {
  if (dtInstance) {
    dtInstance.destroy();
    dtInstance = null;
  }

  dtInstance = new DataTable(tableRef.value, {
    serverSide: true,
    processing: true,
    pageLength: 50,
    order: props.defaultOrder,
    ajax: {
      url: buildUrl(),
      type: "GET",
      data(d) {
        return { ...d, ...cleanParams(props.filterParams) };
      },
      dataFilter(data) {
        const json = JSON.parse(data);
        emit("dataLoaded", json);
        return JSON.stringify(json);
      },
      error(xhr, err) {
        console.error("[DataTable] AJAX error:", err);
      },
    },
    columns: props.columns,
    language: DT_LANGUAGE_ID,
  });
}

function reloadTable() {
  if (dtInstance) {
    dtInstance.ajax.reload(null, false);
  }
}

function exportData(format) {
  const params = cleanParams(props.filterParams);
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${props.apiEndpoint}/export?${query}&format=${format}`;
  window.open(url, "_blank");
}

onMounted(() => initDataTable());

// Watch filter changes → reload DataTable
watch(
  () => props.filterParams,
  () => reloadTable(),
  { deep: true },
);

onBeforeUnmount(() => {
  if (dtInstance) dtInstance.destroy();
});
</script>
