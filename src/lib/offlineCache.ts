/*
 * Utilities for reading cached API responses written by the service worker.
 */

import { API_BASE_URL } from './api';

const API_CACHE_NAME = 'workpro-api';

function resolveAbsoluteUrl(endpoint: string): string {
  const baseUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  try {
    return new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : undefined).toString();
  } catch {
    return baseUrl;
  }
}

export async function getCachedApiResponse<T>(endpoint: string): Promise<T | null> {
  if (typeof caches === 'undefined') {
    return null;
  }

  const cache = await caches.open(API_CACHE_NAME);
  const absoluteUrl = resolveAbsoluteUrl(endpoint);
  const response = await cache.match(absoluteUrl);

  if (!response) {
    return null;
  }

  try {
    const data = await response.clone().json();
    return data as T;
  } catch {
    return null;
  }
}

export async function warmApiCache(endpoint: string, payload: unknown): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }

  const cache = await caches.open(API_CACHE_NAME);
  const absoluteUrl = resolveAbsoluteUrl(endpoint);
  const body = JSON.stringify(payload);

  await cache.put(
    absoluteUrl,
    new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}
