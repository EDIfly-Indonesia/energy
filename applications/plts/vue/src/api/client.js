import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import Swal from '../composables/useSweetAlert';

const apiClient = axios.create({
  baseURL: '/plts/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post('/plts/api/v1/auth/refresh-token', {
            refreshToken
          })
          const { accessToken } = response.data.data

          localStorage.setItem('access_token', accessToken)
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        } else {
          // Trigger catch block for redirect
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
          const authStore = useAuthStore();
          // Clear state manually in case logout API fails
          localStorage.clear();
          Swal.toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          window.location.href = '/scada-vue/login';
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
