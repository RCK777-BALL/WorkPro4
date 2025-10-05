/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { Queue } from 'workbox-background-sync';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry> };

const CORE_CACHE = 'workpro-core';
const PAGE_CACHE = 'workpro-pages';
const API_CACHE = 'workpro-api';
const API_PATH_PREFIX = '/api';
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

clientsClaim();
self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const mutationQueue = new Queue('api-mutation-queue', {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }: { queue: Queue }) => {
    await broadcastQueueState('syncing', queue);
    try {
      await queue.replayRequests();
      await broadcastQueueState('synced', queue);
    } catch (error) {
      await broadcastQueueState('error', queue, error instanceof Error ? error.message : 'Unable to replay queued requests');
      throw error;
    }
  },
});

async function broadcastQueueState(
  event: 'queued' | 'syncing' | 'synced' | 'status' | 'error',
  queue: Queue = mutationQueue,
  message?: string,
) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const pending = await queue.size();
  for (const client of clients) {
    client.postMessage({
      type: 'OFFLINE_QUEUE_UPDATE',
      event,
      pending,
      message,
      timestamp: Date.now(),
    });
  }
}

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: PAGE_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

registerRoute(
  ({ request }) => ['style', 'script', 'font'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: CORE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') {
      return false;
    }
    const isSameOrigin = url.origin === self.location.origin;
    return isSameOrigin && url.pathname.startsWith(API_PATH_PREFIX);
  },
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200, 202] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 30 }),
    ],
  }),
);

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!MUTATION_METHODS.includes(request.method)) {
    return;
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith(API_PATH_PREFIX)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request.clone());
        await broadcastQueueState('status');
        return response;
      } catch (error) {
        await mutationQueue.pushRequest({ request: request.clone(), metadata: { queuedAt: Date.now() } });
        await broadcastQueueState('queued');
        throw error;
      }
    })(),
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'REQUEST_QUEUE_STATUS') {
    event.waitUntil(broadcastQueueState('status'));
    return;
  }

  if (event.data.type === 'FLUSH_QUEUE') {
    event.waitUntil(
      (async () => {
        await broadcastQueueState('syncing');
        try {
          await mutationQueue.replayRequests();
          await broadcastQueueState('synced');
        } catch (error) {
          await broadcastQueueState('error', mutationQueue, error instanceof Error ? error.message : undefined);
        }
      })(),
    );
  }
});
