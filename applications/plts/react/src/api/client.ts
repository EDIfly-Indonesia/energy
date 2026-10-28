// src/api/client.ts
import axios from 'axios';
import Swal from 'sweetalert2';

const apiClient = axios.create({
  baseURL: '/plts/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 Too Many Requests — retry once after delay
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Read retry-after from headers (seconds) or default 2s
      const retryAfter = error.response.headers['retry-after'];
      const delay = (retryAfter ? parseFloat(retryAfter) : 2) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('/plts/api/v1/auth/refresh-token', {
            refreshToken
          });
          const { accessToken } = response.data.data;

          localStorage.setItem('access_token', accessToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('No refresh token available');
        }
      } catch {
        localStorage.clear();
        Swal.fire({
          icon: 'error',
          title: 'Sesi berakhir',
          text: 'Silakan login kembali.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        window.location.href = `${import.meta.env.BASE_URL}login`;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;