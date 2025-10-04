import axios from 'axios';
import { ApiClient, normalizeApiBaseUrl } from './api';

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = ApiClient.getActiveToken();

  if (!token && typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('auth_token');
      if (stored) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${stored}`;
        return config;
      }
    } catch {
      // ignore storage read errors
    }
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // keep fetch client in sync when axios detects an unauthorized response
      const client = new ApiClient();
      client.clearToken();
    }

    return Promise.reject(error);
  },
);

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: number;
    message: string;
    details?: unknown;
  } | null;
}

export async function unwrapResponse<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;

  if (data.error || data.data == null) {
    const error = data.error ?? { code: 500, message: 'Unknown API error' };
    throw new Error(error.message);
  }

  return data.data;
}

