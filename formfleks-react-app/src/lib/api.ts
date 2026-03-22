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

    // Formfleks Global Error Handling
    if (error.response) {
      const status = error.response.status;
      
      // Handle 500 Server Error
      if (status >= 500) {
        import('./notifications').then(({ notify }) => {
          notify.error('Sunucu tarafında beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        });
      }
      
      // Handle 403 Forbidden
      else if (status === 403) {
        import('./notifications').then(({ notify }) => {
          notify.error('Bu işlem için gerekli yetkiniz bulunmamaktadır.');
        });
      }
      
      // Handle 400 Bad Request
      else if (status === 400) {
        const data = error.response.data as any;
        const message = data?.message || data?.title || 'Geçersiz istek. Lütfen verilerinizi kontrol edin.';
        import('./notifications').then(({ notify }) => {
          notify.error(message);
        });
      }

      // Handle 401 Unauthorized (Refresh Logic)
      else if (status === 401 && originalRequest && !originalRequest._retry) {
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
          if (!refreshToken) throw new Error("No refresh token");

          const rs = await axios.post(`${import.meta.env.VITE_API_URL || 'https://localhost:7124/api'}/auth/refresh`, {
            refreshToken,
          });

          const { token: newToken, refreshToken: newRefresh } = rs.data;
          useAuthStore.getState().setTokens(newToken, newRefresh);

          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          return api(originalRequest);
          
        } catch (_error) {
          processQueue(_error, null);
          useAuthStore.getState().logout();
          import('./notifications').then(({ notify }) => {
            notify.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
          });
          return Promise.reject(_error);
          
        } finally {
          isRefreshing = false;
        }
      }
    } else if (error.request) {
      // Network Error
      import('./notifications').then(({ notify }) => {
        notify.error('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.');
      });
    }

    return Promise.reject(error);
  }
);
