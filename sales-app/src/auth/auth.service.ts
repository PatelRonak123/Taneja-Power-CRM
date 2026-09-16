import { apiClient, ApiEnvelope } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { tokenStorage } from './tokenStorage';
import { User, LoginCredentials, AuthResponseData } from './auth.types';

export const authService = {
  /**
   * Authenticate employee credentials against backend
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = (await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    )) as unknown as ApiEnvelope<AuthResponseData>;

    const { user, accessToken, refreshToken } = response.data;

    if (!accessToken || !refreshToken || !user) {
      throw new Error('Invalid authentication response from server');
    }

    // Persist securely on device
    await tokenStorage.saveTokens({ accessToken, refreshToken });
    await tokenStorage.saveUser(user);

    return user;
  },

  /**
   * Retrieve current authenticated user profile
   */
  async getProfile(): Promise<User> {
    const response = (await apiClient.get(
      API_ENDPOINTS.AUTH.ME
    )) as unknown as ApiEnvelope<User>;

    const user = response.data;
    await tokenStorage.saveUser(user);
    return user;
  },

  /**
   * Perform secure logout, invalidating refresh token in backend
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
      }
    } catch (error) {
      console.warn('Logout API notification failed (network error or expired token)', error);
    } finally {
      await tokenStorage.clearAll();
    }
  },
};
