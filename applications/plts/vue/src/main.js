//src/main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import { AgentationVuePlugin } from 'agentation-vue'
import App from "./App.vue";
import router from "./router";
import permissionPlugin from "./plugins/permission";
import { useAuthStore } from "./stores/auth.store";
import "./styles/tailwind.css";
import 'agentation-vue/style.css'

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(permissionPlugin);
app.use(AgentationVuePlugin);

// Initialize auth before mounting
const authStore = useAuthStore();

const initializeAuth = async () => {
  try {
    await authStore.checkAuth();
  } catch (error) {
    console.error("Failed to initialize auth", error);
  }
};

initializeAuth().finally(() => {
  app.mount("#app");
});
