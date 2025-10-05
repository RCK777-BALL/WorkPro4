const CACHE_PREFIX = 'work-order-cache:';

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (error) {
    return false;
  }
}

function normalizeFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  return Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      const value = filters[key];
      acc[key] = value ?? '';
      return acc;
    }, {});
}

function encodeHash(value) {
  const json = JSON.stringify(value);

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(json);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  return json;
}

export function getFilterHash(filters) {
  const normalized = normalizeFilters(filters);
  return encodeHash(normalized);
}

function getCacheKey(hash) {
  return `${CACHE_PREFIX}${hash}`;
}

export function saveListCache(filters, payload) {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    const hash = getFilterHash(filters);
    const key = getCacheKey(hash);
    const record = {
      data: payload,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.warn('Unable to persist work order cache entry.', error);
  }
}

export function readListCache(filters) {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const hash = getFilterHash(filters);
    const key = getCacheKey(hash);
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.warn('Unable to read work order cache entry.', error);
    return null;
  }
}
