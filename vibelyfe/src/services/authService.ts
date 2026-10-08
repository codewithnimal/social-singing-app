// Vibely — Service: Auth (mock implementation)

import { AuthUser, User } from '../types';
import { MOCK_CURRENT_USER } from '../mock/users';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Simulated auth state
let _isAuthenticated = false;
let _currentUser: AuthUser | null = null;

export const authService = {
  async login(emailOrPhone: string, _password: string): Promise<AuthUser> {
    await delay(1200);
    // Mock success — any credentials work
    const user: AuthUser = {
      ...MOCK_CURRENT_USER,
      email: emailOrPhone.includes('@') ? emailOrPhone : MOCK_CURRENT_USER.email,
      token: 'mock-jwt-token-' + Date.now(),
    };
    _isAuthenticated = true;
    _currentUser = user;
    return user;
  },

  async sendOTP(emailOrPhone: string): Promise<void> {
    await delay(800);
    console.log(`[Mock] OTP sent to ${emailOrPhone}: 123456`);
  },

  async verifyOTP(_emailOrPhone: string, otp: string): Promise<AuthUser> {
    await delay(1000);
    if (otp === '123456') {
      const user: AuthUser = {
        ...MOCK_CURRENT_USER,
        token: 'mock-jwt-token-' + Date.now(),
      };
      _isAuthenticated = true;
      _currentUser = user;
      return user;
    }
    throw new Error('Invalid OTP. Use 123456 for testing.');
  },

  async logout(): Promise<void> {
    await delay(300);
    _isAuthenticated = false;
    _currentUser = null;
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(200);
    return _currentUser;
  },

  isAuthenticated(): boolean {
    return _isAuthenticated;
  },

  async updateProfile(updates: Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl'>>): Promise<User> {
    await delay(700);
    if (!_currentUser) throw new Error('Not authenticated');
    _currentUser = { ..._currentUser, ...updates };
    return _currentUser;
  },
};
