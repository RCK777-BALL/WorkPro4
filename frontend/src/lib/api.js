const BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:5010/api';

function readToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem('token');
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = readToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const errorPayload = data?.error ?? {};
    const rawData = data && typeof data === 'object' ? data : {};
    const normalizedError = {
      code: errorPayload.code ?? `HTTP_${res.status}`,
      message:
        errorPayload.message || data?.message || data?.error?.message || `HTTP ${res.status}`,
      fields: errorPayload.fields ?? data?.fields ?? null,
    };

    const error = new Error(normalizedError.message);
    error.status = res.status;
    error.code = normalizedError.code;
    error.fields = normalizedError.fields;
    error.data = { ...rawData, error: normalizedError };

    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default api;
