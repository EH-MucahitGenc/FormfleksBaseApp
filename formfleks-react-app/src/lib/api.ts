import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Create Formfleks Base API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7124/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Avoid infinite interceptor loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// --- Request Interceptor ---
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized globally
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        
        // Ensure refresh exists before trying
        if (!refreshToken) throw new Error("No refresh token");

        // Request new token
        const rs = await axios.post(`${import.meta.env.VITE_API_URL || 'https://localhost:7124/api'}/auth/refresh`, {
          refreshToken,
        });

        const { token: newToken, refreshToken: newRefresh } = rs.data;

        // Update state
        useAuthStore.getState().setTokens(newToken, newRefresh);

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return api(originalRequest);
        
      } catch (_error) {
        processQueue(_error, null);
        // Force logout if refresh also fails
        useAuthStore.getState().logout();
        return Promise.reject(_error);
        
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
