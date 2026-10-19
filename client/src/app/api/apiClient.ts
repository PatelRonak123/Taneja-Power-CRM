import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';

import {
  ApiEnvelope,
  NormalizedError,
  normalizeApiError,
} from './apiErrorNormalizer';

export type { ApiEnvelope, NormalizedError };
export { normalizeApiError };

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor: Envelope Unwrapping, 401 Refresh Queue & Normalized Error Handling
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error: AxiosError<ApiEnvelope>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const normalizedError: NormalizedError = normalizeApiError(error);

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    // Handle 401: attempt single refresh call and queue parallel requests
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError);
        const refreshStatus = refreshError?.statusCode || refreshError?.response?.status;
        // Only trigger auth:unauthorized if the server specifically returned 401 or 403
        // If the server is temporarily restarting/offline (Network Error), do NOT log the user out!
        if (refreshStatus === 401 || refreshStatus === 403) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        return Promise.reject(normalizedError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && isAuthEndpoint && !originalRequest?.url?.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return Promise.reject(normalizedError);
  }
);
