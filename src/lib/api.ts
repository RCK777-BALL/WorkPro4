import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  isAxiosError,
} from 'axios';
import type { ApiError, ApiResponse } from '../../shared/types/http';
import {
  ApiRequestError,
  isApiErrorResponse,
  isApiResponse,
  normalizeApiError,
} from './errors';

export const TOKEN_STORAGE_KEY = 'auth_token';
export const API_UNAUTHORIZED_EVENT = 'auth:unauthorized';

let memoryToken: string | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function getStorage(): Storage | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    return window.localStorage ?? null;
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
    // Ignore storage errors – the in-memory token is the single source of truth.
  }
}

function dispatchUnauthorized() {
  if (!hasWindow()) {
    return;
  }

  const dispatcher = window.dispatchEvent;
  if (typeof dispatcher !== 'function') {
    return;
  }

  const event =
    typeof CustomEvent === 'function'
      ? new CustomEvent(API_UNAUTHORIZED_EVENT)
      : ({ type: API_UNAUTHORIZED_EVENT } as Event);

  dispatcher.call(window, event);
}

export function normalizeApiBaseUrl(value?: string | null): string {
  const trimmed = (value ?? '').trim();

  if (trimmed.length > 0) {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    let normalized = trimmed.replace(/\/+$/, '');

    if (!normalized.endsWith('/api')) {
      normalized = `${normalized}/api`;
    }

    if (!hasProtocol && !normalized.startsWith('/')) {
      normalized = `/${normalized}`;
    }

    return normalized;
  }

  if (hasWindow()) {
    return '/api';
  }

  return 'http://localhost:5010/api';
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env?.VITE_API_URL);

export const httpClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

function applyDefaultAuthorization(token: string | null) {
  if (token) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete httpClient.defaults.headers.common.Authorization;
  }
}

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : AxiosHeaders.from(config.headers ?? {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        clearToken();
        dispatchUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);

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

const existingToken = getToken();
if (existingToken) {
  applyDefaultAuthorization(existingToken);
}

function normalizeAxiosError(error: AxiosError<ApiResponse<unknown>>): ApiRequestError {
  if (error.response) {
    const status = error.response.status ?? 500;
    const payload = error.response.data;

    if (isApiResponse(payload)) {
      const normalized = normalizeApiError(payload.error, status);
      return new ApiRequestError(normalized);
    }

    const normalized = normalizeApiError(
      {
        code: status,
        message: error.message,
        details: payload,
      },
      status,
      error.message || 'Request failed',
    );

    return new ApiRequestError(normalized);
  }

  const offline = error.code === 'ERR_NETWORK' || error.message === 'Network Error';
  const fallbackStatus = offline ? 0 : 500;
  const normalized = normalizeApiError(
    {
      code: fallbackStatus,
      message: offline
        ? 'Network unavailable. Changes will be synced when back online.'
        : error.message ?? 'Request failed',
      details: error.toJSON?.() ?? error.message,
      offline,
    },
    fallbackStatus,
  );

  if (offline) {
    normalized.offline = true;
  }

  return new ApiRequestError(normalized);
}

function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (isApiErrorResponse(error)) {
    return new ApiRequestError(
      normalizeApiError(error.error, error.error?.code ?? 500),
    );
  }

  if (isAxiosError<ApiResponse<unknown>>(error)) {
    return normalizeAxiosError(error);
  }

  const message = error instanceof Error ? error.message : 'Request failed';
  return new ApiRequestError(normalizeApiError({ message }, 500));
}

function extractResponseData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const payload = response.data;

  if (!isApiResponse<T>(payload)) {
    throw new ApiRequestError(
      normalizeApiError(
        { message: 'Invalid API response', details: payload },
        response.status ?? 500,
      ),
    );
  }

  if (payload.error) {
    throw new ApiRequestError(
      normalizeApiError(payload.error, response.status ?? payload.error.code ?? 500),
    );
  }

  return payload.data as T;
}

async function request<T, D = unknown>(config: AxiosRequestConfig<D>): Promise<T> {
  try {
    const response = await httpClient.request<ApiResponse<T>>(config);
    return extractResponseData(response);
  } catch (error) {
    throw toApiRequestError(error);
  }
}

function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'GET', url });
}

function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>({ ...config, method: 'POST', url, data });
}

function put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>({ ...config, method: 'PUT', url, data });
}

function patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request<T, D>({ ...config, method: 'PATCH', url, data });
}

function destroy<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>({ ...config, method: 'DELETE', url });
}

export async function unwrapResponse<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<T> {
  try {
    const response = await promise;
    return extractResponseData(response);
  } catch (error) {
    throw toApiRequestError(error);
  }
}

export type WorkOrderStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrderListItem {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  assetId: string | null;
  asset: { id: string; code: string; name: string } | null;
  category: string | null;
  dueDate: string | null;
  attachments: string[];
  createdBy: string;
  createdByUser: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PaginatedWorkOrders {
  items: WorkOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  assignee?: string;
  status?: WorkOrderStatus | '';
  priority?: WorkOrderPriority | '';
  assigneeId?: string;
  dueBefore?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortDir?: 'asc' | 'desc';
}

export interface SaveWorkOrderPayload {
  title: string;
  description?: string | null;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  assetId?: string | null;
  assigneeId?: string | null;
  category?: string | null;
  dueDate?: string | null;
}

export const workOrdersApi = {
  list: (query: WorkOrderQuery) =>
    unwrapResponse<PaginatedWorkOrders>(
      httpClient.get<ApiResponse<PaginatedWorkOrders>>('/work-orders', {
        params: {
          ...query,
          assignee: query.assignee || undefined,
          status: query.status || undefined,
          priority: query.priority || undefined,
        },
      }),
    ),
  get: (id: string) =>
    unwrapResponse<WorkOrderListItem>(
      httpClient.get<ApiResponse<WorkOrderListItem>>(`/work-orders/${id}`),
    ),
  create: (payload: SaveWorkOrderPayload) =>
    unwrapResponse<WorkOrderListItem>(
      httpClient.post<ApiResponse<WorkOrderListItem>>('/work-orders', payload),
    ),
  update: (id: string, payload: SaveWorkOrderPayload) =>
    unwrapResponse<WorkOrderListItem>(
      httpClient.patch<ApiResponse<WorkOrderListItem>>(`/work-orders/${id}`, payload),
    ),
  bulkComplete: (ids: string[]) =>
    unwrapResponse<WorkOrderListItem[]>(
      httpClient.post<ApiResponse<WorkOrderListItem[]>>('/work-orders/bulk/complete', { ids }),
    ),
  bulkArchive: (ids: string[]) =>
    unwrapResponse<WorkOrderListItem[]>(
      httpClient.post<ApiResponse<WorkOrderListItem[]>>('/work-orders/bulk/archive', { ids }),
    ),
  bulkDelete: (ids: string[]) =>
    unwrapResponse<{ count: number; ids: string[] }>(
      httpClient.post<ApiResponse<{ count: number; ids: string[] }>>('/work-orders/bulk/delete', { ids }),
    ),
  bulkDuplicate: (ids: string[]) =>
    unwrapResponse<WorkOrderListItem[]>(
      httpClient.post<ApiResponse<WorkOrderListItem[]>>('/work-orders/bulk/duplicate', { ids }),
    ),
  export: (query: WorkOrderQuery) =>
    unwrapResponse<{ items: WorkOrderListItem[] }>(
      httpClient.get<ApiResponse<{ items: WorkOrderListItem[] }>>('/work-orders/export', {
        params: {
          ...query,
          assignee: query.assignee || undefined,
          status: query.status || undefined,
          priority: query.priority || undefined,
        },
      }),
    ),
  import: (items: SaveWorkOrderPayload[]) =>
    unwrapResponse<WorkOrderListItem[]>(
      httpClient.post<ApiResponse<WorkOrderListItem[]>>('/work-orders/import', { items }),
    ),
};

export const api = {
  get,
  post,
  put,
  patch,
  delete: destroy,
  setToken,
  clearToken,
  getToken,
  client: httpClient,
  isApiErrorResponse,
};

export {
  ApiRequestError,
  isApiErrorResponse,
  isApiResponse,
  normalizeApiError,
} from './errors';
export type { ApiError, ApiResponse } from '../../shared/types/http';
