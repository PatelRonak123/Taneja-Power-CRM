import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, ApiEnvelope } from '../app/api/apiClient';
import { toast } from '../utils/toast';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  workType?: 'OFFICE' | 'FIELD';
  designation?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

let isInitializingPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isInitialized: true });
      },

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = (await apiClient.post('/auth/login', credentials)) as unknown as ApiEnvelope<{
            user: User;
          }>;
          const user = response.data.user;
          set({ user, isAuthenticated: true, isInitialized: true, isLoading: false });
          return user;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // Ignore network errors during logout
        } finally {
          set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
        }
      },

      initializeAuth: async () => {
        // Prevent duplicate concurrent initializeAuth calls
        if (isInitializingPromise) {
          return isInitializingPromise;
        }

        isInitializingPromise = (async () => {
          set({ isLoading: true });
          try {
            // Attempt to retrieve current user via /auth/me
            const response = (await apiClient.get('/auth/me')) as unknown as ApiEnvelope<User>;
            set({
              user: response.data,
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false,
            });
          } catch (error: any) {
            const isNetworkErr =
              !error?.statusCode ||
              error?.code === 'NETWORK_ERROR' ||
              error?.message?.includes('Network Error');

            // If the server is restarting or offline, do not unauthenticate an existing session
            if (isNetworkErr) {
              try {
                // Retry once after 2 seconds to allow server reboot to complete
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const retryResponse = (await apiClient.get('/auth/me')) as unknown as ApiEnvelope<User>;
                set({
                  user: retryResponse.data,
                  isAuthenticated: true,
                  isInitialized: true,
                  isLoading: false,
                });
                return;
              } catch {
                // Still offline or failed: maintain whatever authenticated state we have, don't force logout
                const previousAuth = get().isAuthenticated;
                set({
                  isAuthenticated: previousAuth,
                  isInitialized: true,
                  isLoading: false,
                });
                return;
              }
            }

            // If /auth/me returned 401, attempt /auth/refresh
            try {
              await apiClient.post('/auth/refresh');
              const retryResponse = (await apiClient.get('/auth/me')) as unknown as ApiEnvelope<User>;
              set({
                user: retryResponse.data,
                isAuthenticated: true,
                isInitialized: true,
                isLoading: false,
              });
            } catch (refreshErr: any) {
              const refreshStatus = refreshErr?.statusCode || refreshErr?.response?.status;
              // Only set unauthenticated if the server explicitly rejected the refresh token (401/403)
              if (refreshStatus === 401 || refreshStatus === 403) {
                set({
                  user: null,
                  isAuthenticated: false,
                  isInitialized: true,
                  isLoading: false,
                });
              } else {
                // Transient/network error during refresh: keep existing session
                set({
                  isInitialized: true,
                  isLoading: false,
                });
              }
            }
          } finally {
            isInitializingPromise = null;
          }
        })();

        return isInitializingPromise;
      },
    }),
    {
      name: 'taneja-power-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);



// Global listener for unauthorized event from apiClient
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    const wasAuth = useAuthStore.getState().isAuthenticated;
    useAuthStore.setState({ user: null, isAuthenticated: false });
    if (wasAuth) {
      toast.warning('Session Expired', 'Your session has expired. Please sign in again.', {
        dedupeKey: 'auth:session-expired',
      });
    }
  });
}
