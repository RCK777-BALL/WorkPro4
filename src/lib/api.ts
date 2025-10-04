import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  isAxiosError,
} from 'axios';
import type { ApiError, ApiResponse } from '../../shared/types/http';

export const TOKEN_STORAGE_KEY = 'auth_token';
export const API_UNAUTHORIZED_EVENT = 'auth:unauthorized';

let memoryToken: string | null = null;

const baseURL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined') {
    return '/api';
  }

  return 'http://localhost:5010/api';
})();

export const httpClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readTokenFromStorage(): string | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    if (token) {
      storage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      storage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function applyDefaultAuthorization(token: string | null) {
  if (token) {
    httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return;
  }

  delete httpClient.defaults.headers.common['Authorization'];
}

const existingToken = readTokenFromStorage();
if (existingToken) {
  memoryToken = existingToken;
  applyDefaultAuthorization(existingToken);
}

function ensureAuthHeader(config: AxiosRequestConfig, token: string) {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  config.headers = {
    ...(config.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
}

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    ensureAuthHeader(config, token);
  }

  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;

    if (isApiResponse(payload) && payload.error) {
      const normalized: ApiResponse<ApiError> = {
        data: null,
        error: normalizeApiError(payload.error, response.status),
      };
      return Promise.reject(normalized);
    }

    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    const normalized = normalizeAxiosError(error);
    return Promise.reject(normalized);
  }
);

function notifyUnauthorized(status: number) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT, { detail: { status } }));
}

function normalizeApiError(error: Partial<ApiError> | null, fallbackStatus: number): ApiError {
  const code = typeof error?.code === 'number' ? error.code : fallbackStatus || 500;
  const message = typeof error?.message === 'string' && error.message.trim().length > 0
    ? error.message
    : 'Request failed';

  return {
    code,
    message,
    details: error?.details,
  } satisfies ApiError;
}

function normalizeAxiosError(error: AxiosError<ApiResponse<unknown>>): ApiResponse<ApiError> {
  const status = error.response?.status ?? error.status ?? 500;

  if (status === 401 || status === 403) {
    clearToken();
    notifyUnauthorized(status);
  }

  const payload = error.response?.data;
  const payloadError = isApiResponse(payload) ? payload.error : null;

  return {
    data: null,
    error: {
      code: payloadError?.code ?? status,
      message: payloadError?.message ?? error.message ?? 'Request failed',
      details: payloadError?.details ?? payload ?? error.toJSON?.() ?? null,
    },
  } satisfies ApiResponse<ApiError>;
}

function extractResponseData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const payload = response.data;

  if (isApiResponse<T>(payload)) {
    if (payload.error) {
      throw {
        data: null,
        error: normalizeApiError(payload.error, response.status),
      } satisfies ApiResponse<ApiError>;
    }

    return payload.data as T;
  }

  return payload as unknown as T;
}

function normalizeUnknownError(error: unknown): ApiResponse<ApiError> {
  if (isApiErrorResponse(error)) {
    return error;
  }

  if (isAxiosError<ApiResponse<unknown>>(error)) {
    return normalizeAxiosError(error);
  }

  const message = error instanceof Error ? error.message : 'Request failed';

  return {
    data: null,
    error: {
      code: 500,
      message,
      details: error,
    },
  } satisfies ApiResponse<ApiError>;
}

async function request<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<T> {
  try {
    const response = await httpClient.request<ApiResponse<T>>(config);
    return extractResponseData(response);
  } catch (error) {
    throw normalizeUnknownError(error);
  }
}

export function getToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }

  const stored = readTokenFromStorage();
  memoryToken = stored;
  return stored;
}

export function setToken(token: string) {
  memoryToken = token;
  persistToken(token);
  applyDefaultAuthorization(token);
}

export function clearToken() {
  memoryToken = null;
  persistToken(null);
  applyDefaultAuthorization(null);
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'data' in value && 'error' in value;
}

export function isApiErrorResponse(value: unknown): value is ApiResponse<ApiError> {
  return isApiResponse(value) && value.error != null;
}

function createRequestConfig<D>(
  method: AxiosRequestConfig['method'],
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D>
): AxiosRequestConfig<D> {
  return {
    ...config,
    method,
    url,
    data,
  };
}

function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(createRequestConfig('GET', url, undefined, config));
}

function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>(createRequestConfig('POST', url, data, config));
}

function put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>(createRequestConfig('PUT', url, data, config));
}

function patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>(createRequestConfig('PATCH', url, data, config));
}

function destroy<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(createRequestConfig('DELETE', url, undefined, config));
}

export const api = {
  get,
  post,
  put,
  patch,
  delete: destroy,
  setToken,
  clearToken,
  getToken,
  isApiErrorResponse,
  client: httpClient,
};

export type { ApiError, ApiResponse } from '../../shared/types/http';
