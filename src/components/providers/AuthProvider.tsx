'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiGet, apiPost, ensureCsrfToken } from '@/lib/api/client';
import {
  can as checkCan,
  canAccessAdminPortal,
  hasPermission as checkPermission,
} from '@/lib/auth/permissions';
import type { SafeUser } from '@/lib/auth/serialize';

type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'suspended'
  | 'deactivated'
  | 'unverified'
  | 'unavailable';

interface AuthContextValue {
  user: SafeUser | null;
  status: AuthStatus;
  message: string | null;
  refresh: () => Promise<void>;
  login: (input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  can: (key: string) => boolean;
  canAccessAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const applyFailure = (msg: string | null) => {
    const lowered = (msg || '').toLowerCase();
    if (lowered.includes('suspended')) setStatus('suspended');
    else if (lowered.includes('deactivated')) setStatus('deactivated');
    else if (lowered.includes('verify')) setStatus('unverified');
    else setStatus('unauthenticated');
    setUser(null);
    setMessage(msg);
  };

  const refresh = useCallback(async () => {
    try {
      await ensureCsrfToken();
      const result = await apiGet<{ user: SafeUser }>('/auth/me');
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setStatus('authenticated');
        setMessage(null);
        return;
      }
      if (result.message?.includes('Unable to reach')) {
        setStatus('unavailable');
        setUser(null);
        setMessage(result.message);
        return;
      }
      applyFailure(result.message);
    } catch {
      setStatus('unavailable');
      setUser(null);
      setMessage('Unable to reach the server. Please try again.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(
    async (input: { email: string; password: string; rememberMe?: boolean }) => {
      await ensureCsrfToken();
      const result = await apiPost<{ user: SafeUser }>('/auth/login', input);
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setStatus('authenticated');
        setMessage(null);
        return { ok: true, message: result.message || 'Signed in successfully' };
      }
      applyFailure(result.message);
      return { ok: false, message: result.message || 'Unable to sign in.' };
    },
    []
  );

  const logout = useCallback(async () => {
    await apiPost('/auth/logout');
    setUser(null);
    setStatus('unauthenticated');
    setMessage(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      message,
      refresh,
      login,
      logout,
      hasPermission: (resource, action) =>
        user ? checkPermission(user, resource, action) : false,
      can: (key) => checkCan(user, key),
      canAccessAdmin: user ? canAccessAdminPortal(user) : false,
    }),
    [user, status, message, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
