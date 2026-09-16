import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens } from './auth.types';

const ACCESS_TOKEN_KEY = 'taneja_access_token';
const REFRESH_TOKEN_KEY = 'taneja_refresh_token';
const USER_DATA_KEY = 'taneja_user_data';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch {
      return null;
    }
  },

  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      ]);
    } catch (error) {
      console.error('Failed to save authentication tokens to SecureStore', error);
      throw error;
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user info to SecureStore', error);
    }
  },

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_DATA_KEY);
      if (raw) {
        return JSON.parse(raw) as User;
      }
      return null;
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_DATA_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear SecureStore credentials', error);
    }
  },
};
