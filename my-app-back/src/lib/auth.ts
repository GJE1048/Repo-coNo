import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState, createElement } from 'react';

const AUTH_STORAGE_KEY = 'admin-auth';
export const ADMIN_USERNAME = 'admin123456';
export const ADMIN_PASSWORD = '123456';

type StoredAuth = {
  username: string;
  loggedInAt: string;
};

type AuthState = {
  isAuthenticated: boolean;
  username: string | null;
};

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => { ok: boolean; message?: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredAuth = (): StoredAuth | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed?.username === ADMIN_USERNAME) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const writeStoredAuth = (value: StoredAuth | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (value) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const toBase64 = (value: string) => {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return value;
};

export const isAdminAuthenticated = () => Boolean(readStoredAuth());

export const getAdminAuthHeaders = (): Record<string, string> => {
  if (!isAdminAuthenticated()) {
    return {};
  }
  const token = toBase64(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`);
  return {
    Authorization: `Basic ${token}`,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = readStoredAuth();
    if (stored) {
      return { isAuthenticated: true, username: stored.username };
    }
    return { isAuthenticated: false, username: null };
  });

  const login = useCallback((username: string, password: string) => {
    const normalized = username.trim();
    if (normalized === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const stored = {
        username: ADMIN_USERNAME,
        loggedInAt: new Date().toISOString(),
      };
      setState({ isAuthenticated: true, username: ADMIN_USERNAME });
      writeStoredAuth(stored);
      return { ok: true };
    }
    return { ok: false, message: '账号或密码错误，请重试。' };
  }, []);

  const logout = useCallback(() => {
    setState({ isAuthenticated: false, username: null });
    writeStoredAuth(null);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
