import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

const apiTarget = process.env.VITE_API_TARGET || "http://127.0.0.1:9001";

export default defineConfig({
  plugins: [vue()],
  base: "/scada-vue/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/plts/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
          charts: ["chart.js", "vue-chartjs"],
        },
      },
    },
  },
});
