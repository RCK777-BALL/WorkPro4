import axios from 'axios';

const DEFAULT_API_BASE = 'http://localhost:5010/api';
const rawApiBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : DEFAULT_API_BASE;

export const API_BASE = typeof rawApiBase === 'string' && rawApiBase.length > 0
  ? rawApiBase.replace(/\/+$/, '')
  : DEFAULT_API_BASE;

export const TOKEN_STORAGE_KEY = 'wp_token';

export function getToken() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read auth token from storage.', error);
    return null;
  }
}

export function setToken(token) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    if (typeof token === 'string' && token.length > 0) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Unable to persist auth token.', error);
  }
}

export function clearToken() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear auth token.', error);
  }
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers ?? {};

  if (typeof nextConfig.url === 'string' && nextConfig.url.length > 0) {
    const isAbsolute = /^https?:\/\//i.test(nextConfig.url);
    if (!isAbsolute) {
      nextConfig.url = nextConfig.url.startsWith('/') ? nextConfig.url : `/${nextConfig.url}`;
    }
  }

  const token = getToken();
  if (token) {
    if (typeof nextConfig.headers.set === 'function') {
      nextConfig.headers.set('Authorization', `Bearer ${token}`);
    } else {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error || !error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401 || status === 403) {
      clearToken();

      if (typeof window !== 'undefined') {
        try {
          window.location.assign('/login');
        } catch (navigationError) {
          console.warn('Failed to redirect to login after authentication error.', navigationError);
        }
      }
    }

    return Promise.reject(error);
  },
);
