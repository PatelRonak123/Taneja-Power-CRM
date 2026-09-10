import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';

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

export interface NormalizedError {
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Envelope Unwrapping & Normalized Error Handling
apiClient.interceptors.response.use(
  (response) => {
    // Return the standard envelope payload
    return response.data;
  },
  (error: AxiosError<ApiEnvelope>) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    const normalizedError: NormalizedError = {
      message: responseData?.message || responseData?.error?.message || error.message || 'An unexpected error occurred',
      code: responseData?.error?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      statusCode: status,
      details: responseData?.error?.details,
    };

    // Handle 401 Unauthorized globally
    if (status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    return Promise.reject(normalizedError);
  }
);
