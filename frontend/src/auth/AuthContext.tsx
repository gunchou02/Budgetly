'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, AuthResponse, User } from '@/types/api';

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
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isActive = true;

    window.localStorage.removeItem('budgetly_token');

    apiClient
      .get<ApiEnvelope<User>>('/me')
      .then((response) => {
        if (isActive) {
          setUser(response.data.data);
        }
      })
      .catch(() => {
        if (isActive) {
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
    await apiClient.post('/logout').catch(() => undefined);
    setUser(null);
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(user),
    isBootstrapping,
    login,
    logout,
    register,
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
