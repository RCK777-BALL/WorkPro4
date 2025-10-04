import { useCallback, useEffect, useMemo, useState } from 'react';

type QueueEvent = 'queued' | 'syncing' | 'synced' | 'status' | 'error';

interface QueueUpdateMessage {
  type: 'OFFLINE_QUEUE_UPDATE';
  event: QueueEvent;
  pending: number;
  message?: string;
  timestamp?: number;
}

interface OfflineQueueState {
  pendingMutations: number;
  status: QueueEvent;
  lastUpdated: number | null;
  message?: string;
  isOnline: boolean;
  requestStatus: () => void;
  flushQueue: () => void;
}

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export function useOfflineQueue(): OfflineQueueState {
  const [pendingMutations, setPendingMutations] = useState(0);
  const [status, setStatus] = useState<QueueEvent>('status');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(isBrowser ? navigator.onLine : true);

  const requestStatus = useCallback(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'REQUEST_QUEUE_STATUS' });
    });
  }, []);

  const flushQueue = useCallback(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'FLUSH_QUEUE' });
    });
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent<QueueUpdateMessage>) => {
      if (!event.data || event.data.type !== 'OFFLINE_QUEUE_UPDATE') {
        return;
      }

      setPendingMutations(event.data.pending ?? 0);
      setStatus(event.data.event ?? 'status');
      setLastUpdated(event.data.timestamp ?? Date.now());
      setMessage(event.data.message);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({ type: 'REQUEST_QUEUE_STATUS' });
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const onlineListener = () => setIsOnline(true);
    const offlineListener = () => setIsOnline(false);

    window.addEventListener('online', onlineListener);
    window.addEventListener('offline', offlineListener);

    return () => {
      window.removeEventListener('online', onlineListener);
      window.removeEventListener('offline', offlineListener);
    };
  }, []);

  return useMemo(
    () => ({
      pendingMutations,
      status,
      lastUpdated,
      message,
      isOnline,
      requestStatus,
      flushQueue,
    }),
    [flushQueue, isOnline, lastUpdated, message, pendingMutations, requestStatus, status],
  );
}
