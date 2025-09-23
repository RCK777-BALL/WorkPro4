const API_PATH = '/api';
const DEFAULT_API_BASE = 'http://localhost:5010/api';

const buildApiBaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_API_BASE;
  }

  const trimmedUrl = rawUrl.trim().replace(/\/+$/, '');

  if (!trimmedUrl) {
    return DEFAULT_API_BASE;
  }

  if (trimmedUrl.endsWith(API_PATH)) {
    return trimmedUrl;
  }

  return `${trimmedUrl}${API_PATH}`;
};

const API_BASE_URL = buildApiBaseUrl(import.meta.env.VITE_API_URL) || DEFAULT_API_BASE;

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const { headers: headersInit, body, json, ...restOptions } = options;
    const headers = new Headers(headersInit);

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const shouldTreatAsJson = (value) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value !== 'object') {
        return false;
      }

      const isSpecialType =
        (typeof FormData !== 'undefined' && value instanceof FormData) ||
        (typeof Blob !== 'undefined' && value instanceof Blob) ||
        (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
        (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams);

      if (isSpecialType) {
        return false;
      }

      return true;
    };

    let requestBody = body;

    if (json !== undefined) {
      headers.set('Content-Type', 'application/json');
      requestBody = json === undefined ? undefined : JSON.stringify(json);
    } else if (shouldTreatAsJson(body)) {
      headers.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, { ...restOptions, headers, body: requestBody });
      const result = await response.json();

      if (!response.ok) {
        return result;
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network request failed',
        },
      };
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    const hasData = data !== undefined;
    return this.request(endpoint, {
      method: 'POST',
      ...(hasData ? { json: data } : {}),
    });
  }

  put(endpoint, data) {
    const hasData = data !== undefined;
    return this.request(endpoint, {
      method: 'PUT',
      ...(hasData ? { json: data } : {}),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const api = new ApiClient(API_BASE_URL);

export { ApiClient, api };
