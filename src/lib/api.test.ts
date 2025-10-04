import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import type { ApiResponse } from '../../shared/types/http';

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
  } as unknown as Storage;
}

describe('api client', () => {
  let mock: MockAdapter;
  let apiModule: typeof import('./api');
  let dispatchEventSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const storage = createLocalStorageMock();
    dispatchEventSpy = vi.fn();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage, dispatchEvent: dispatchEventSpy } as Window & typeof globalThis,
    });

    apiModule = await import('./api');
    mock = new MockAdapter(apiModule.httpClient);
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('attaches Authorization headers when a token is set', async () => {
    mock.onGet('/secure').reply((config) => {
      const authorization =
        (config.headers?.Authorization as string | undefined) ??
        (config.headers?.authorization as string | undefined);
      expect(authorization).toBe('Bearer test-token');
      return [200, { data: [], error: null } satisfies ApiResponse<unknown>];
    });

    apiModule.setToken('test-token');
    await expect(apiModule.api.get('/secure')).resolves.toEqual([]);
  });

  it('normalizes API errors into ApiResponse<ApiError>', async () => {
    mock.onGet('/error').reply(503, {
      data: null,
      error: { code: 503, message: 'Service unavailable', details: { reason: 'maintenance' } },
    } satisfies ApiResponse<never>);

    await expect(apiModule.api.get('/error')).rejects.toMatchObject({
      data: null,
      error: {
        code: 503,
        message: 'Service unavailable',
        details: { reason: 'maintenance' },
      },
    });
  });

  it('clears tokens and dispatches an event on unauthorized responses', async () => {
    mock.onGet('/auth-check').reply(401, {
      data: null,
      error: { code: 401, message: 'Unauthorized' },
    } satisfies ApiResponse<never>);

    apiModule.setToken('stale-token');

    await expect(apiModule.api.get('/auth-check')).rejects.toMatchObject({
      data: null,
      error: { code: 401 },
    });

    expect(apiModule.getToken()).toBeNull();
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: apiModule.API_UNAUTHORIZED_EVENT }));
  });
});
