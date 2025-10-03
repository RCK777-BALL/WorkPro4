import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:5010/api';
const TOKEN_STORAGE_KEY = 'wp_token';

const rawBaseUrl = import.meta?.env?.VITE_API_URL || DEFAULT_BASE_URL;
const baseURL = typeof rawBaseUrl === 'string' ? rawBaseUrl.replace(/\/+$/, '') : DEFAULT_BASE_URL;
const TOKEN_STORAGE_KEY = 'token';

let inMemoryToken = null;

function readToken() {
  if (inMemoryToken) {
    return inMemoryToken;
  }


  if (typeof window === 'undefined') {
    return null;
  }

  try {
    inMemoryToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    return inMemoryToken;

  } catch (error) {
    console.warn('Unable to access localStorage for auth token.', error);
    return null;
  }
}

export function setToken(token) {
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear auth token.', error);
  }
}

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

const existingToken = readToken();
if (existingToken) {
  applyTokenToClient(existingToken);
}

api.interceptors.request.use((config) => {
  const nextConfig = config;
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
