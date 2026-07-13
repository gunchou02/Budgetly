'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, setAuthToken } from '@/api/client';
import type { ApiEnvelope, AuthResponse, User } from '@/types/api';

const TOKEN_STORAGE_KEY = 'budgetly_token';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  name: string;
  password_confirmation: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  token: string | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isActive = true;
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsBootstrapping(false);
      return () => {
        isActive = false;
      };
    }

    setAuthToken(storedToken);
    setToken(storedToken);

    apiClient
      .get<ApiEnvelope<User>>('/me')
      .then((response) => {
        if (isActive) {
          setUser(response.data.data);
        }
      })
      .catch(() => {
        if (isActive) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  function persistSession(response: ApiEnvelope<AuthResponse>) {
    const nextToken = response.data.token;

    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(response.data.user);
  }

  async function register(payload: RegisterPayload) {
    const response = await apiClient.post<ApiEnvelope<AuthResponse>>('/register', payload);
    persistSession(response.data);
  }

  async function login(payload: LoginPayload) {
    const response = await apiClient.post<ApiEnvelope<AuthResponse>>('/login', payload);
    persistSession(response.data);
  }

  async function logout() {
    if (token) {
      await apiClient.post('/logout').catch(() => undefined);
    }

    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(token),
    isBootstrapping,
    login,
    logout,
    register,
    token,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
