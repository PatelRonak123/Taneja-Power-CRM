import { create } from 'zustand';
import { User, LoginCredentials } from './auth.types';
import { authService } from './auth.service';
import { tokenStorage } from './tokenStorage';
import { onUnauthorized } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(credentials);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign in. Please verify your credentials.';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Error during logout', err);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const tokens = await tokenStorage.getTokens();
      if (!tokens) {
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
        return;
      }

      // Check stored cached user first for instantaneous UI hydration
      const cachedUser = await tokenStorage.getStoredUser();
      if (cachedUser) {
        set({ user: cachedUser, isAuthenticated: true });
      }

      // Validate session with server
      try {
        const freshUser = await authService.getProfile();
        set({
          user: freshUser,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
      } catch (profileError) {
        // If profile fetch fails even after retry interceptor handled it, clear session
        console.warn('Session verification failed, logging out', profileError);
        await tokenStorage.clearAll();
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('Failed to initialize auth', err);
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      });
    }
  },
}));

// Connect global 401 unauthorized interceptor
onUnauthorized(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    error: 'Your session has expired. Please sign in again.',
  });
});
