import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, setAuthToken } from '../api/client';

const TOKEN_STORAGE_KEY = 'budgetly_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      setUser(null);
      setIsBootstrapping(false);
      return;
    }

    let isActive = true;

    apiClient
      .get('/me')
      .then((response) => {
        if (isActive) {
          setUser(response.data.data);
        }
      })
      .catch(() => {
        if (isActive) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  }, [token]);

  async function register(payload) {
    const response = await apiClient.post('/register', payload);
    const nextToken = response.data.data.token;

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(response.data.data.user);
  }

  async function login(payload) {
    const response = await apiClient.post('/login', payload);
    const nextToken = response.data.data.token;

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(response.data.data.user);
  }

  async function logout() {
    if (token) {
      await apiClient.post('/logout').catch(() => {});
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      isBootstrapping,
      login,
      logout,
      register,
      token,
      user,
    }),
    [isBootstrapping, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
