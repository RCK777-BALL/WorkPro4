import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastHandles = [];
const toastMock = vi.fn(() => {
  const handle = { dismiss: vi.fn() };
  toastHandles.push(handle);
  return handle;
});

let queueMutationSpy;

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock, dismiss: vi.fn() }),
}));

vi.mock('@/lib/api', () => {
  const apiMock = {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost/api' },
  };

  return {
    api: apiMock,
    API_BASE: 'http://localhost/api',
    getToken: vi.fn(() => 'test-token'),
  };
});

import { WorkOrders } from '../WorkOrders';
import { api } from '@/lib/api';
import * as backgroundSyncModule from '@/lib/backgroundSync';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWorkOrders(queryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkOrders />
    </QueryClientProvider>,
  );
}

describe('WorkOrders offline behaviour', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    toastHandles.length = 0;
    toastMock.mockClear();
    const storage = (() => {
      let store = new Map();
      return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
          store.set(key, String(value));
        },
        removeItem: (key) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
        key: (index) => Array.from(store.keys())[index] ?? null,
        get length() {
          return store.size;
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });

    localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    if (Object.prototype.hasOwnProperty.call(window.navigator, 'serviceWorker')) {
      delete window.navigator.serviceWorker;
    }
    api.get.mockReset();
    api.post.mockReset();
    queueMutationSpy?.mockRestore();
    queueMutationSpy = undefined;
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    queueMutationSpy?.mockRestore();
    queueMutationSpy = undefined;
  });

  it('hydrates from cache when offline', async () => {
    const queryClient = createQueryClient();
    const workOrders = [
      {
        id: '1',
        title: 'Network Work Order',
        status: 'requested',
        priority: 'medium',
        assigneeNames: [],
        createdAt: new Date().toISOString(),
      },
    ];

    api.get.mockResolvedValueOnce({ data: workOrders });

    const initialRender = renderWorkOrders(queryClient);

    await screen.findByText('Network Work Order', undefined, { timeout: 5000 });

    expect(localStorage.length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledTimes(1);

    initialRender.unmount();

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    api.get.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    const secondClient = createQueryClient();
    renderWorkOrders(secondClient);

    await screen.findByText('Network Work Order', undefined, { timeout: 5000 });
    await screen.findByText(/Offline mode/, undefined, { timeout: 5000 });
  }, 10000);

  it('queues work order mutations when offline and clears toast after sync', async () => {
    const queryClient = createQueryClient();

    const registration = {
      active: { postMessage: vi.fn() },
      sync: { register: vi.fn().mockResolvedValue(undefined) },
    };

    const listeners = [];

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'message') {
            listeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((event, handler) => {
          if (event === 'message') {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
              listeners.splice(index, 1);
            }
          }
        }),
      },
    });

    const { DEFAULT_SYNC_TAG } = backgroundSyncModule;

    queueMutationSpy = vi
      .spyOn(backgroundSyncModule, 'queueMutation')
      .mockImplementation(async ({ endpoint, method = 'POST', body, entity, clientId, tag }) => {
        const effectiveTag = tag ?? DEFAULT_SYNC_TAG;
        registration.active.postMessage({
          type: 'queue-mutation',
          payload: {
            clientId,
            endpoint,
            method,
            body,
            entity,
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
            tag: effectiveTag,
          },
        });

        await registration.sync.register(effectiveTag);
        return { queued: true };
      });

    api.get.mockResolvedValue({ data: [] });
    api.post.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    renderWorkOrders(queryClient);
    await screen.findByText('No work orders found', undefined, { timeout: 5000 });

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    const [newWorkOrderButton] = screen.getAllByRole('button', { name: /New Work Order/i });
    await userEvent.click(newWorkOrderButton);

    await screen.findByRole('heading', { name: 'Create Work Order' }, { timeout: 5000 });

    const titleInput = await screen.findByPlaceholderText('Work order title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Queued order');

    await userEvent.click(screen.getByRole('button', { name: /Create Work Order/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(registration.sync.register).toHaveBeenCalledWith('workpro-mutation-sync');
    expect(toastMock).toHaveBeenCalledWith({
      title: 'Work order queued',
      description: 'It will sync automatically once you are back online.',
    });

    const queuedPayload = registration.active.postMessage.mock.calls[0][0];
    expect(queuedPayload.type).toBe('queue-mutation');
    const clientId = queuedPayload.payload.clientId;
    expect(clientId).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Pending sync')).toBeInTheDocument());

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });

    act(() => {
      listeners.forEach((listener) =>
        listener({ data: { type: 'mutation-synced', payload: { clientId } } }),
      );
    });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));

    const lastToast = toastHandles[toastHandles.length - 1];
    expect(lastToast?.dismiss).toHaveBeenCalled();
    expect(screen.queryByText('Pending sync')).not.toBeInTheDocument();
  }, 15000);
});
