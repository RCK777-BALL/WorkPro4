import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<LoginResponse>('/auth/login', credentials);
          api.setToken(response.token);

          const user = await api.get<User>('/auth/me');

          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (error) {
          api.clearToken();
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ user: null, isAuthenticated: false, isLoading: false, error: message });
          throw error instanceof Error ? error : new Error(message);
        }
      },

      logout: () => {
        api.clearToken();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        void api.post('/auth/logout').catch(() => undefined);
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const token = localStorage.getItem('auth_token');

          if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false, error: null });
            return;
          }

          const user = await api.get<User>('/auth/me');
          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch (error) {
          api.clearToken();
          const message = error instanceof Error ? error.message : 'Authentication failed';
          set({ user: null, isAuthenticated: false, isLoading: false, error: message });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);
