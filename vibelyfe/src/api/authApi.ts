// Vibely — Auth API
// Real backend: POST /api/v1/auth/login, /register, GET /api/v1/auth/me

import { apiClient, tokenStore } from './apiClient';
import { BackendUser, BackendToken } from './types';

export const authApi = {
  /**
   * Login — backend uses OAuth2PasswordRequestForm (username + password, URL-encoded)
   * The backend /login endpoint uses 'username' field, not 'email'.
   */
  async login(username: string, password: string): Promise<{ user: BackendUser; token: string }> {
    const tokenResp = await apiClient.postUrlEncoded<BackendToken>('/auth/login', {
      username,
      password,
    });
    await tokenStore.set(tokenResp.access_token);
    const user = await authApi.me();
    return { user, token: tokenResp.access_token };
  },

  /**
   * Register — backend schema: { username, email, password }
   */
  async register(username: string, email: string, password: string): Promise<BackendUser> {
    return apiClient.post<BackendUser>('/auth/register', { username, email, password });
  },

  /**
   * Get current authenticated user
   */
  async me(): Promise<BackendUser> {
    return apiClient.get<BackendUser>('/auth/me');
  },

  /**
   * Logout — clear stored token
   */
  async logout(): Promise<void> {
    await tokenStore.clear();
  },
};
