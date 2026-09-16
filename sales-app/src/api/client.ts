import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { tokenStorage } from '../auth/tokenStorage';
import { NormalizedApiError } from '../auth/auth.types';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach Bearer Access Token
apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token Refresh Mutex State & Queue
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

// Global unauthorized listeners (e.g. auth store logout trigger)
type UnauthorizedListener = () => void;
const unauthorizedListeners: UnauthorizedListener[] = [];

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.push(listener);
  return () => {
    const index = unauthorizedListeners.indexOf(listener);
    if (index > -1) {
      unauthorizedListeners.splice(index, 1);
    }
  };
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in unauthorized listener', e);
    }
  });
};

// Response Interceptor: Envelope Unwrapping, 401 Refresh Queue & Normalized Error Handling
apiClient.interceptors.response.use(
  (response) => {
    // Backend envelopes responses with { success: true, data: ... }
    return response.data;
  },
  async (error: AxiosError<ApiEnvelope>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const responseData = error.response?.data;

    const normalizedError: NormalizedApiError = {
      message:
        responseData?.message ||
        responseData?.error?.message ||
        error.message ||
        'An unexpected network error occurred',
      code: responseData?.error?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      statusCode: status,
      details: responseData?.error?.details,
    };

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
        const storedRefreshToken = await tokenStorage.getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint with stored refresh token in body
        const refreshResponse = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user?: any }>>(
          `${env.API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newTokens = refreshResponse.data?.data;
        if (newTokens?.accessToken && newTokens?.refreshToken) {
          await tokenStorage.saveTokens({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          });

          if (newTokens.user) {
            await tokenStorage.saveUser(newTokens.user);
          }

          processQueue(null);
          return apiClient(originalRequest);
        } else {
          throw new Error('Malformed refresh token response');
        }
      } catch (refreshError) {
        processQueue(refreshError);
        await tokenStorage.clearAll();
        notifyUnauthorized();
        return Promise.reject(normalizedError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && isAuthEndpoint && !originalRequest?.url?.includes('/auth/login')) {
      await tokenStorage.clearAll();
      notifyUnauthorized();
    }

    return Promise.reject(normalizedError);
  }
);
