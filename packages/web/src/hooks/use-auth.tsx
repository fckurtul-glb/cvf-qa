'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stakeholderGroup: string;
  organization: { id: string; name: string };
  department: { id: string; name: string } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setState({ user: null, token: null, loading: false, isAuthenticated: false });
      return;
    }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (res.status === 401) {
          // Try refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            return fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            }).then((refreshRes) => {
              if (!refreshRes.ok) throw new Error('Refresh failed');
              return refreshRes.json().then((refreshJson) => {
                if (refreshJson.success && refreshJson.data) {
                  localStorage.setItem('token', refreshJson.data.accessToken);
                  localStorage.setItem('refreshToken', refreshJson.data.refreshToken);
                  return fetch(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${refreshJson.data.accessToken}` },
                  }).then((r) => r.json());
                }
                throw new Error('Refresh failed');
              });
            });
          }
          throw new Error('No refresh token');
        }
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setState({
            user: json.data,
            token: localStorage.getItem('token'),
            loading: false,
            isAuthenticated: true,
          });
        } else {
          throw new Error('No user data');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setState({ user: null, token: null, loading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Giriş başarısız');
    }

    const newToken = data.data.accessToken;
    const newRefreshToken = data.data.refreshToken;
    localStorage.setItem('token', newToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    const meJson = await meRes.json();

    setState({
      user: meJson.data || null,
      token: newToken,
      loading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setState({ user: null, token: null, loading: false, isAuthenticated: false });
    router.replace('/auth/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRequireAuth() {
  const auth = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [auth.loading, auth.isAuthenticated, router]);

  return auth;
}
