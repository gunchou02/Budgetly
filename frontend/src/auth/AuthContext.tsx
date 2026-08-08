'use client';

import { isAxiosError } from 'axios';
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
  loginAsGuest: () => Promise<void>;
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
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (isActive && isAxiosError(error) && error.response?.status === 401) {
          setUser(null);
        }

        return Promise.reject(error);
      },
    );

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
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    if (!user?.is_guest || !user.guest_expires_at) {
      return;
    }

    const expiresAt = new Date(user.guest_expires_at).getTime();

    function expireGuestSession() {
      if (Date.now() >= expiresAt) {
        setUser(null);
      }
    }

    const timeoutId = window.setTimeout(
      expireGuestSession,
      Math.max(0, expiresAt - Date.now()),
    );
    document.addEventListener('visibilitychange', expireGuestSession);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', expireGuestSession);
    };
  }, [user]);

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

  async function loginAsGuest() {
    const response = await apiClient.post<ApiEnvelope<AuthResponse>>('/guest', {});
    persistSession(response.data);
  }

  async function logout() {
    await apiClient.post('/logout', {});
    setUser(null);
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(user),
    isBootstrapping,
    login,
    loginAsGuest,
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
