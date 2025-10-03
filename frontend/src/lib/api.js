import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:5010/api';
const rawBaseUrl = import.meta?.env?.VITE_API_URL || DEFAULT_BASE_URL;
const baseURL = typeof rawBaseUrl === 'string' ? rawBaseUrl.replace(/\/+$/, '') : DEFAULT_BASE_URL;

function readToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem('token');
  } catch (error) {
    console.warn('Unable to access localStorage for auth token.', error);
    return null;
  }
}

function setHeader(headers, key, value, options = {}) {
  if (!headers || value == null) {
    return;
  }

  const { override = true } = options;

  if (typeof headers.set === 'function') {
    if (override || !headers.has || !headers.has(key)) {
      headers.set(key, value);
    }
    return;
  }

  const existingKey =
    typeof headers === 'object' && headers !== null
      ? Object.keys(headers).find((headerKey) => headerKey.toLowerCase() === key.toLowerCase())
      : undefined;

  if (override || typeof existingKey === 'undefined') {
    const targetKey = typeof existingKey === 'string' ? existingKey : key;
    headers[targetKey] = value;
  }
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const nextConfig = config;
  nextConfig.headers = nextConfig.headers ?? {};

  setHeader(nextConfig.headers, 'Content-Type', 'application/json', { override: false });

  const token = readToken();
  if (token) {
    setHeader(nextConfig.headers, 'Authorization', `Bearer ${token}`);
  }

  if (typeof nextConfig.url === 'string' && nextConfig.url.length > 0) {
    const isAbsolute = /^https?:\/\//i.test(nextConfig.url);
    if (!isAbsolute) {
      nextConfig.url = nextConfig.url.startsWith('/') ? nextConfig.url : `/${nextConfig.url}`;
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

    const { status, data } = error.response;
    const errorPayload = data?.error ?? {};

    const normalizedError = new Error(
      errorPayload.message || data?.message || error.message || `HTTP ${status}`,
    );

    normalizedError.status = status;
    normalizedError.code = errorPayload.code ?? `HTTP_${status}`;
    normalizedError.fields = errorPayload.fields ?? data?.fields ?? null;
    normalizedError.data = data;

    return Promise.reject(normalizedError);
  },
);

