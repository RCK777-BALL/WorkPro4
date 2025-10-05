const DB_NAME = 'workpro-sync';
const STORE_NAME = 'queued-mutations';
const DEFAULT_SYNC_TAG = 'workpro-mutation-sync';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientId' });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

function putMutation(entry) {
  return withStore('readwrite', (store) => store.put(entry));
}

function deleteMutation(clientId) {
  return withStore('readwrite', (store) => store.delete(clientId));
}

async function getAllMutations() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function notifyClients(type, payload) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage({ type, payload });
  });
}

async function processQueue(tag) {
  const mutations = await getAllMutations();

  for (const mutation of mutations) {
    if (mutation.tag && mutation.tag !== tag) {
      continue;
    }

    try {
      const response = await fetch(mutation.endpoint, {
        method: mutation.method || 'POST',
        headers: mutation.headers || {},
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to sync mutation: ${response.status}`);
      }

      await deleteMutation(mutation.clientId);

      let responseBody = null;
      try {
        responseBody = await response.clone().json();
      } catch (error) {
        responseBody = null;
      }

      await notifyClients('mutation-synced', {
        clientId: mutation.clientId,
        entity: mutation.entity,
        response: responseBody,
      });
    } catch (error) {
      console.error('Background sync failed', error);
      throw error;
    }
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(openDatabase());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || data.type !== 'queue-mutation') {
    return;
  }

  const entry = {
    clientId: data.payload.clientId,
    endpoint: data.payload.endpoint,
    method: data.payload.method,
    headers: data.payload.headers,
    body: data.payload.body,
    entity: data.payload.entity,
    tag: data.payload.tag || DEFAULT_SYNC_TAG,
  };

  event.waitUntil(
    (async () => {
      await putMutation(entry);
      if (self.registration.sync && typeof self.registration.sync.register === 'function') {
        try {
          await self.registration.sync.register(entry.tag);
        } catch (error) {
          console.warn('Unable to register background sync', error);
        }
      }
    })(),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === DEFAULT_SYNC_TAG) {
    event.waitUntil(processQueue(DEFAULT_SYNC_TAG));
    return;
  }

  event.waitUntil(processQueue(event.tag));
});
