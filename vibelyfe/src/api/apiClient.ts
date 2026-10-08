// Vibely — API Client
// Centralised HTTP layer — real backend, no mock data

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Config ────────────────────────────────────────────────────────────────
const LAN_BACKEND_IP = '192.168.1.39';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host.includes('exp.direct')) {
    return `http://${LAN_BACKEND_IP}:8000/api/v1`;
  }
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000/api/v1`;
  }
  // Android emulator loopback alias
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  // iOS simulator or Web
  return 'http://localhost:8000/api/v1';
};

export const API_BASE = getBaseUrl();

const TOKEN_KEY = 'vibely_auth_token';

// ─── Token helpers ─────────────────────────────────────────────────────────
export const tokenStore = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

// ─── Core fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<T> {
  const token = await tokenStore.get();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!options.isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.detail ?? detail;
    } catch {}
    throw new ApiError(response.status, detail);
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
export const apiClient = {
  get<T>(path: string) {
    return apiFetch<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body?: unknown) {
    return apiFetch<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string) {
    return apiFetch<T>(path, { method: 'DELETE' });
  },

  /** POST with form-data (for file uploads via XMLHttpRequest to support native { uri, name, type }) */
  async postForm<T>(path: string, form: FormData): Promise<T> {
    const token = await tokenStore.get();
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${path}`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (xhr.status === 204) {
            resolve(undefined as unknown as T);
            return;
          }
          try {
            resolve(JSON.parse(xhr.responseText) as T);
          } catch {
            resolve(xhr.responseText as unknown as T);
          }
        } else {
          let detail = `HTTP ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText);
            detail = body?.detail ?? detail;
          } catch {}
          reject(new ApiError(xhr.status, detail));
        }
      };
      xhr.onerror = () => {
        reject(new ApiError(xhr.status || 0, 'Network request failed'));
      };
      xhr.ontimeout = () => {
        reject(new ApiError(408, 'Request timeout'));
      };
      xhr.send(form);
    });
  },

  /** POST with application/x-www-form-urlencoded (login uses OAuth2PasswordRequestForm) */
  postUrlEncoded<T>(path: string, params: Record<string, string>) {
    const body = new URLSearchParams(params).toString();
    return apiFetch<T>(path, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      isFormData: true, // skip default JSON content-type
    });
  },
};
