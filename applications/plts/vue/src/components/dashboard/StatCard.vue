<template>
  <div class="bg-white dark:bg-scada-card rounded-xl shadow-sm border border-gray-200 dark:border-scada-border p-5 hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between mb-2">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-scada-muted">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-scada-text mt-1 font-display tracking-tight">
          {{ value }}
        </p>
      </div>
      <div
        class="w-11 h-11 rounded-xl flex items-center justify-center"
        :class="colorClass"
      >
        <component :is="iconComponent" class="w-5 h-5" />
      </div>
    </div>
    
    <!-- Real-time indicator -->
    <div class="flex items-center gap-1.5 mt-2">
      <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
      <span class="text-[10px] font-medium text-green-600 uppercase tracking-wider">Live</span>
      <span v-if="realtimeValue !== undefined" class="text-xs font-bold text-gray-700 dark:text-scada-text ml-auto">
        {{ realtimeValue }} {{ unit }}
      </span>
    </div>

    <!-- sparkline slot -->
    <div v-if="$slots.spark" class="mt-3">
      <slot name="spark" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  Server,
  Wifi,
  Bell,
  Bolt,
  Battery,
  BatteryCharging,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Activity
} from "@lucide/vue";

const props = defineProps({
  title: String,
  value: [String, Number],
  realtimeValue: [String, Number],
  unit: String,
  icon: String,
  color: {
    type: String,
    default: "blue",
  },
});

const iconMap = {
  Server,
  Wifi,
  Bell,
  Bolt,
  Battery,
  BatteryCharging,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Activity
};

const iconComponent = computed(() => iconMap[props.icon] || Server);

const colorClass = computed(() => {
  const map = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-emerald-50 text-emerald-600",
    red:    "bg-red-50 text-red-500",
    yellow: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-500",
  };
  return map[props.color] || map.blue;
});
</script>
