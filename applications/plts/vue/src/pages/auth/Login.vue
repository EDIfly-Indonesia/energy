<!-- src/pages/auth/Login.vue -->
<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-4">
    <div class="w-full max-w-[1100px] grid lg:grid-cols-2 gap-8 items-center">
      <!-- Left side: Illustration -->
      <div class="hidden lg:flex flex-col items-center justify-center relative">
        <!-- World Map Style background decoration (optional, but keeping it clean) -->
        <div
          class="relative w-full aspect-square max-w-[500px] flex items-center justify-center"
        >
          <img
            src="../../assets/images/bg.png"
            alt="Tower PLTS"
            class="w-full h-full object-contain"
          />
        </div>
      </div>

      <!-- Right side: Login Card -->
      <div class="flex justify-center lg:justify-start">
        <div
          class="w-full max-w-[420px] bg-[#214761] border border-[#2a5573] rounded-lg shadow-2xl p-8"
        >
          <div class="text-center mb-6">
            <!-- Logo area -->
            <div class="flex items-center justify-center gap-2 mb-4">
              <span class="text-white text-3xl font-bold tracking-tighter">
                SCADA Monitoring Platform
              </span>
            </div>
            <h1 class="text-white text-2xl font-normal">Login</h1>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <input
                v-model="form.email"
                type="text"
                class="w-full bg-white border border-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-slate-400"
                placeholder="Email Address / Username"
                required
              />
            </div>

            <!-- Perbaikan: Input Password dengan Icon di Tengah -->
            <div>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full bg-white border border-transparent px-3 py-2 pr-12 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-slate-400"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                >
                  <Eye v-if="showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
              <div class="text-right mt-1">
                <a href="#" class="text-white text-xs hover:underline"
                  >Forgot password?</a
                >
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-[#007fb4] hover:bg-[#006e9c] text-white py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {{ loading ? "Loading..." : "Login" }}
            </button>

            <p
              v-if="error"
              class="mt-4 text-center text-xs text-red-300 bg-red-900/20 py-2 border border-red-900/50"
            >
              {{ error }}
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Eye, EyeOff } from "@lucide/vue";
import { useAuthStore } from "../../stores/auth.store";
import { toast } from "../../composables/useSweetAlert";

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  email: "superadmin@plts.com",
  password: "password123",
});
const loading = ref(false);
const error = ref("");
const notificationsCount = ref(27);
const showPassword = ref(false);

async function handleLogin() {
  loading.value = true;
  error.value = "";

  const result = await authStore.login(form.value.email, form.value.password);

  if (result.success) {
    toast.success("Login berhasil!");
    router.push("/dashboard");
  } else {
    error.value = result.message || "Login gagal";
    toast.error(error.value);
  }

  loading.value = false;
}
</script>
