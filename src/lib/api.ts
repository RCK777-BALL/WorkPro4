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

  if (withLeadingSlash.endsWith('/api')) {
    return withLeadingSlash;
  }

  return `${withLeadingSlash}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const TOKEN_STORAGE_KEY = 'auth_token';

export interface ApiResult<T> {
  data: T | null;
  error: {
    code: number;
    message: string;
    details?: unknown;
    offline?: boolean;
  } | null;
}

export class ApiRequestError extends Error {
  readonly code: number;
  readonly offline: boolean;
  readonly details?: unknown;

  constructor({ code, message, details, offline }: NonNullable<ApiResult<unknown>['error']>) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.offline = Boolean(offline);
    this.details = details;
  }
}

export class ApiClient {
  private static memoryToken: string | null = null;

  static getActiveToken(): string | null {
    return ApiClient.memoryToken;
  }

  private static getStorage(): Storage | null {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private token: string | null = null;

  constructor() {
    const storage = ApiClient.getStorage();

    if (storage) {
      try {
        this.token = storage.getItem(TOKEN_STORAGE_KEY);
        ApiClient.memoryToken = this.token;
        return;
      } catch {
        // Fall through to in-memory storage when localStorage access fails
      }
    }

    this.token = ApiClient.memoryToken;
  }

  setToken(token: string) {
    this.token = token;
    ApiClient.memoryToken = token;

    const storage = ApiClient.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignore storage write errors to keep client usable in non-browser environments
    }
  }

  clearToken() {
    this.token = null;
    ApiClient.memoryToken = null;

    const storage = ApiClient.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage removal errors in restricted environments
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    const url = ApiClient.resolveUrl(endpoint);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const result = await this.handleResponse<T>(response);

      if (result.error) {
        if (result.error.code === 401 || result.error.code === 403) {
          this.clearToken();
          // Don't redirect automatically, let the auth hook handle it
        }
        return result;
      }

      if (result.data == null) {
        return {
          data: null,
          error: {
            code: response.status || 500,
            message: 'Received empty response from server'
          }
        } satisfies ApiResult<T>;
      }

      return result;
    } catch (error) {
      // If backend is not available, optionally surface mock data for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const shouldBypassMock =
          endpoint.includes('/summary') || endpoint.startsWith('/work-orders');

        if (shouldBypassMock) {
          return {
            data: null,
            error: {
              code: 503,
              message: 'Backend unavailable',
            },
          } satisfies ApiResult<T>;
        }

        console.warn('Backend not available, using mock data');
        const mockData = this.getMockData<T | null>(endpoint);
        if (mockData != null) {
          return {
            data: mockData,
            error: null,
          } satisfies ApiResult<T>;
        }
        return {
          data: null,
          error: {
            code: 0,
            message: 'Network unavailable. Changes will be synced when back online.',
            details: error instanceof Error ? { message: error.message } : undefined,
            offline: true,
          },
        } satisfies ApiResult<T>;
      }

      return {
        data: null,
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private getMockData<T>(endpoint: string): T | null {
    const [path] = endpoint.split('?');

    // Mock data for development when backend is not available
    if (endpoint.startsWith('/work-orders/')) {
      const workOrderId = endpoint.split('/').pop() ?? '';
      return (getMockWorkOrderById(workOrderId) ?? null) as T | null;
    }

    if (endpoint === '/assets/tree') {
      const mockAssets: { sites: MockAssetTreeSite[] } = {
        sites: [
          {
            id: mockAssetBase.site.id,
            name: mockAssetBase.site.name,
            areas: [
              {
                id: mockAssetBase.area.id,
                name: mockAssetBase.area.name,
                lines: [
                  {
                    id: mockAssetBase.line.id,
                    name: mockAssetBase.line.name,
                    stations: [
                      {
                        id: mockAssetBase.station.id,
                        name: mockAssetBase.station.name,
                        assets: [
                          { id: 'asset-1', code: 'PUMP-001', name: 'Main Water Pump' },
                          { id: 'asset-2', code: 'MOTOR-002', name: 'Spare Motor' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      return mockAssets as T;
    }

    if (/^\/assets\/[^/]+(?:\/lifecycle)?$/.test(path)) {
      const assetDetail = {
        id: 'asset-1',
        tenantId: 'tenant-1',
        code: 'PUMP-001',
        name: 'Main Water Pump',
        status: 'operational',
        criticality: 3,
        manufacturer: 'Allied Pumps Inc.',
        modelNumber: 'APX-500',
        serialNumber: 'SN-APX500-001',
        site: mockAssetBase.site,
        area: mockAssetBase.area,
        line: mockAssetBase.line,
        station: mockAssetBase.station,
        purchaseDate: '2023-01-15T00:00:00.000Z',
        commissionedAt: '2023-03-01T00:00:00.000Z',
        warrantyExpiresAt: '2026-03-01T00:00:00.000Z',
        cost: 12500,
        warrantyProvider: 'Allied Service Partners',
        warrantyContact: 'support@alliedservice.com',
        warrantyNotes: 'Annual inspection required.',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        bomLines: [
          {
            id: 'bom-1',
            tenantId: 'tenant-1',
            assetId: 'asset-1',
            position: 0,
            reference: 'KIT-HP-001',
            description: 'Hydraulic pump seal kit',
            quantity: 1,
            unit: 'ea',
            notes: 'Replace annually or on wear indication',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
          {
            id: 'bom-2',
            tenantId: 'tenant-1',
            assetId: 'asset-1',
            position: 1,
            reference: 'FLT-500',
            description: 'Inlet filtration cartridge',
            quantity: 2,
            unit: 'ea',
            notes: 'Change every 6 months',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      return assetDetail as T;
    }

    if (/^\/assets\/[^/]+\/bom$/.test(path)) {
      const lines = [
        {
          id: 'bom-1',
          tenantId: 'tenant-1',
          assetId: 'asset-1',
          position: 0,
          reference: 'KIT-HP-001',
          description: 'Hydraulic pump seal kit',
          quantity: 1,
          unit: 'ea',
          notes: 'Replace annually or on wear indication',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      return { lines } as T;
    }

    if (path === '/users') {
      const users: MockUser[] = [
        { id: '1', name: 'John Smith', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
        { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      ];

      return users as T;
    }

    if (path.startsWith('/auth/me')) {
      const now = new Date().toISOString();
      const user: MockAuthUser = {
        id: '1',
        tenantId: 'tenant-1',
        email: 'john@example.com',
        name: 'John Smith',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      };

      return user as T;
    }

    if (path.startsWith('/purchase-orders')) {
      const now = Date.now();
      const purchaseOrders: MockPurchaseOrder[] = [
        {
          id: '1',
          tenantId: '1',
          vendorId: '1',
          poNumber: 'PO-2024-001',
          status: 'issued',
          subtotal: 1250.0,
          tax: 100.0,
          shipping: 50.0,
          total: 1400.0,
          orderedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            { partId: '1', qty: 10, unitCost: 45.5 },
            { partId: '2', qty: 5, unitCost: 125.0 },
          ],
          linesWithDetails: [
            { partName: 'Pump Seal Kit', partSku: 'PUMP-SEAL-001', quantity: 10, unitCost: 45.5 },
            { partName: 'Bearing Set', partSku: 'BEAR-001', quantity: 5, unitCost: 125.0 },
          ],
          vendor: { id: '1', name: 'Industrial Supply Co.' },
          createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          tenantId: '1',
          vendorId: '2',
          poNumber: 'PO-2024-002',
          status: 'received',
          subtotal: 850.0,
          tax: 68.0,
          shipping: 25.0,
          total: 943.0,
          orderedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
          receivedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            { partId: '3', qty: 25, unitCost: 12.75 },
            { partId: '4', qty: 10, unitCost: 32.5 },
          ],
          linesWithDetails: [
            { partName: 'V-Belt 4L360', partSku: 'BELT-V-002', quantity: 25, unitCost: 12.75 },
            { partName: 'Timing Belt', partSku: 'BELT-T-003', quantity: 10, unitCost: 32.5 },
          ],
          vendor: { id: '2', name: 'Belt & Drive Solutions' },
          createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          tenantId: '1',
          vendorId: '3',
          poNumber: 'PO-2024-003',
          status: 'draft',
          subtotal: 495.0,
          tax: 39.6,
          shipping: 15.0,
          total: 549.6,
          lines: [{ partId: '5', qty: 60, unitCost: 8.25 }],
          linesWithDetails: [
            { partName: 'Hydraulic Oil ISO 46', partSku: 'OIL-HYD-003', quantity: 60, unitCost: 8.25 },
          ],
          vendor: { id: '3', name: 'Lubricant Specialists' },
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        },
      ];

      return purchaseOrders as T;
    }

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
