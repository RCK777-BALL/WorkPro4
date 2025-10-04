export const normalizeApiBaseUrl = (value: string | undefined | null): string => {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      return '/api';
    }

    return 'http://localhost:5010/api';
  }

  const withoutTrailingSlashes = trimmedValue.replace(/\/+$/u, '');

  if (/^https?:\/\//iu.test(withoutTrailingSlashes)) {
    return withoutTrailingSlashes.endsWith('/api')
      ? withoutTrailingSlashes
      : `${withoutTrailingSlashes}/api`;
  }

  const withLeadingSlash = withoutTrailingSlashes.startsWith('/')
    ? withoutTrailingSlashes
    : `/${withoutTrailingSlashes}`;

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
      if (
        error instanceof TypeError ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
      ) {
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

  private static resolveUrl(endpoint: string): string {
    if (/^https?:/iu.test(endpoint)) {
      return endpoint;
    }

    const combined = `${API_BASE_URL}${endpoint}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : globalThis.location?.origin;

    if (origin) {
      try {
        return new URL(combined, origin).toString();
      } catch {
        // fall through to returning the combined string when URL construction fails
      }
    }

    return combined;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResult<T>> {
    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      // Swallow JSON parse errors so we can construct a consistent ApiResult below
    }

    const maybeResult = this.normalizePayload<T>(payload, response);

    if (!response.ok && maybeResult.error == null) {
      return {
        data: null,
        error: {
          code: response.status || 500,
          message: response.statusText || 'Request failed',
          details: payload,
        },
      } satisfies ApiResult<T>;
    }

    return maybeResult;
  }

  private normalizePayload<T>(payload: unknown, response: Response): ApiResult<T> {
    if (payload && typeof payload === 'object') {
      const maybeRecord = payload as Record<string, unknown>;
      const hasData = 'data' in maybeRecord;
      const hasError = 'error' in maybeRecord;

      if (hasData || hasError) {
        return {
          data: (maybeRecord['data'] ?? null) as T | null,
          error: (maybeRecord['error'] ?? null) as ApiResult<T>['error'],
        } satisfies ApiResult<T>;
      }
    }

    if (response.ok) {
      return {
        data: (payload as T | null) ?? null,
        error: null,
      } satisfies ApiResult<T>;
    }

    return {
      data: null,
      error: {
        code: response.status || 500,
        message: response.statusText || 'Request failed',
        details: payload,
      },
    } satisfies ApiResult<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'GET' });
    if (result.error || result.data == null) {
      throw result.error ? new ApiRequestError(result.error) : new ApiRequestError({
        code: 500,
        message: 'No data returned from server',
      });
    }
    return result.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new ApiRequestError(result.error);
    }
    return result.data!;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new ApiRequestError(result.error);
    }
    return result.data!;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'DELETE' });
    if (result.error) {
      throw new ApiRequestError(result.error);
    }
    return result.data!;
  }
}

export const api = new ApiClient();