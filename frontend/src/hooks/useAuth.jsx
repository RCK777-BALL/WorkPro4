import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.setToken(token || null);
  }, [token]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.post('/auth/login', credentials);

      if (result?.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      const authToken =
        result?.data?.token ?? result?.token ?? (typeof result?.data === 'string' ? result.data : null);

      if (!authToken) {
        const fallbackError = {
          code: 'INVALID_RESPONSE',
          message: 'Authentication response did not include a token.',
        };
        setError(fallbackError);
        return { success: false, error: fallbackError };
      }

      api.setToken(authToken);
      setToken(authToken);
      return { success: true, token: authToken };
    } catch (err) {
      const fallbackError = {
        code: 'NETWORK_ERROR',
        message: err.message || 'Unable to complete login request.',
      };
      setError(fallbackError);
      return { success: false, error: fallbackError };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    api.setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      authError: error,
      isLoggingIn: isLoading,
    }),
    [token, login, logout, error, isLoading],
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
