import { api, unwrapApiResult } from './api';

function getErrorStatus(error) {
  return error?.status ?? error?.response?.status ?? error?.response?.data?.status;
}

function normalizeImportedAssets(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.assets)) {
      return payload.assets;
    }

    if (Array.isArray(payload.imported)) {
      return payload.imported;
    }

    if (payload.asset && typeof payload.asset === 'object') {
      return [payload.asset];
    }
  }

  return [];
}

function resolveFallbackBaseURL() {
  const baseURL = api.defaults?.baseURL;
  if (typeof baseURL !== 'string') {
    return undefined;
  }

  const trimmed = baseURL.replace(/\/+$/, '');
  if (!trimmed) {
    return undefined;
  }

  const fallback = trimmed.replace(/\/api\/?$/, '');
  return fallback && fallback !== trimmed ? fallback : undefined;
}

export async function importAssets(assets, config = {}) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('importAssets requires a non-empty array of assets.');
  }

  let response;

  try {
    response = await api.post('/assets/import', { assets }, config);
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      const fallbackBaseURL = resolveFallbackBaseURL();
      if (fallbackBaseURL) {
        response = await api.post('/assets/import', { assets }, { ...config, baseURL: fallbackBaseURL });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const payload = unwrapApiResult(response);
  const importedAssets = normalizeImportedAssets(payload);

  return {
    payload,
    assets: importedAssets,
  };
}

export async function exportAssets(params = {}, config = {}) {
  let response;
  const requestConfig = {
    ...config,
    params,
    responseType: 'blob',
  };

  try {
    response = await api.get('/assets/export', requestConfig);
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      const fallbackBaseURL = resolveFallbackBaseURL();
      if (fallbackBaseURL) {
        response = await api.get('/assets/export', {
          ...requestConfig,
          baseURL: fallbackBaseURL,
        });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (!response) {
    throw new Error('Unable to export assets.');
  }

  const data = response.data;

  if (data instanceof Blob) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Blob([data]);
  }

  if (data && typeof data === 'object' && data.data instanceof ArrayBuffer) {
    return new Blob([data.data]);
  }

  return new Blob([data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  });
}
