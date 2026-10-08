// Vibely — AuthContext
// Provides authenticated user state, login/logout/register actions

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { tokenStore } from '../api/apiClient';
import { BackendUser } from '../api/types';

interface AuthState {
  user: BackendUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Bootstrap: check token on app start ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.get();
        if (token) {
          const me = await authApi.me();
          setUser(me);
        }
      } catch {
        // Token expired or invalid — clear it
        await tokenStore.clear();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    setError(null);
    const { user: me } = await authApi.login(username, password);
    setUser(me);
  };

  const register = async (username: string, email: string, password: string) => {
    setError(null);
    await authApi.register(username, email, password);
    // Auto-login after registration
    await login(username, password);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await authApi.me();
    setUser(me);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
