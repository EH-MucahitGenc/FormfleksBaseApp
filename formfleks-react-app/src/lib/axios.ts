import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Create base instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7127/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (Insert Auth Token)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (Global Error Handling / Token Refresh)
apiClient.interceptors.response.use(
  (response) => {
    // Return direct data payload
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401 && originalRequest) {
      console.warn('Session expired. Redirecting to login...');
      useAuthStore.getState().logout();
      window.location.href = '/auth/login';
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('You do not have permission to access this resource.');
    }

    return Promise.reject(error);
  }
);
