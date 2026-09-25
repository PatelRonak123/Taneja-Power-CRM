import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = (await apiClient.post('/auth/login', credentials)) as unknown as ApiEnvelope<{
        user: User;
      }>;
      const user = response.data.user;
      set({ user, isAuthenticated: true, isLoading: false });
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
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  initializeAuth: async () => {
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
    } catch {
      // If /auth/me fails (e.g., access token expired), attempt /auth/refresh once
      try {
        await apiClient.post('/auth/refresh');
        const retryResponse = (await apiClient.get('/auth/me')) as unknown as ApiEnvelope<User>;
        set({
          user: retryResponse.data,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
      } catch {
        // Refresh failed -> set unauthenticated
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      }
    }
  },
}));



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
