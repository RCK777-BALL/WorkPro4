import { API_BASE, getToken } from './api';

const DEFAULT_SYNC_TAG = 'workpro-mutation-sync';

function hasServiceWorker() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

function resolveUrl(endpoint) {
  if (!endpoint) {
    return API_BASE;
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalizedEndpoint}`;
}

export async function queueMutation({
  endpoint,
  method = 'POST',
  body,
  entity,
  clientId,
  tag = DEFAULT_SYNC_TAG,
}) {
  if (!hasServiceWorker()) {
    return { queued: false, reason: 'service-worker-unavailable' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!registration) {
      return { queued: false, reason: 'registration-unavailable' };
    }

    const sync = registration.sync;
    if (!sync || typeof sync.register !== 'function') {
      return { queued: false, reason: 'background-sync-unsupported' };
    }

    const worker = registration.active || registration.waiting || registration.installing;
    if (!worker) {
      return { queued: false, reason: 'worker-unavailable' };
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload = {
      clientId,
      endpoint: resolveUrl(endpoint),
      method,
      body,
      headers,
      entity,
      tag,
    };

    worker.postMessage({
      type: 'queue-mutation',
      payload,
    });

    await sync.register(tag);

    return { queued: true };
  } catch (error) {
    console.warn('Failed to queue mutation for background sync.', error);
    return { queued: false, error };
  }
}

export { DEFAULT_SYNC_TAG };
