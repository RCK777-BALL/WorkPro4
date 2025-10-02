import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { api } from '@/lib/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return { ...user, role: user.role ?? 'user' };
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: nextToken, user: nextUser } =
        res?.data?.data ?? res?.data ?? {};

      if (!nextToken) {
        throw new Error('Missing token in login response');
      }

      const normalizedUser = normalizeUser(nextUser);

      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      setToken(nextToken);
      setUser(normalizedUser);

      return { ok: true, user: normalizedUser };
    } catch (err) {
      if (err?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err?.message || 'Login failed.');
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken('');
      setUser(null);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
    setError('');
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      loading,
      error,
    }),
    [token, user, login, logout, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default useAuth;
