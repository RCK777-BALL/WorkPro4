import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const deleteGlobal = (key: 'localStorage' | 'window') => {
  if (key in globalThis) {
    // @ts-expect-error - cleaning up test globals
    delete globalThis[key];
  }
};

const createLocalStorageMock = (initialValue: string | null = null) => {
  let storedValue = initialValue;

  return {
    getItem: vi.fn(() => storedValue),
    setItem: vi.fn((_key: string, value: string) => {
      storedValue = value;
    }),
    removeItem: vi.fn(() => {
      storedValue = null;
    }),
  } satisfies Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

describe('ApiClient environment handling', () => {
  beforeEach(() => {
    vi.resetModules();
    deleteGlobal('localStorage');
    deleteGlobal('window');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deleteGlobal('localStorage');
    deleteGlobal('window');
  });

  it('imports the client without localStorage access', async () => {
    await expect(import('./api')).resolves.toHaveProperty('api');
  });

  it('persists tokens in memory when localStorage is unavailable', async () => {
    const { ApiClient } = await import('./api');

    const client = new ApiClient();
    client.setToken('memory-token');

    const secondClient = new ApiClient();
    expect((secondClient as unknown as { token: string | null }).token).toBe('memory-token');
  });

  it('uses mocked localStorage when available', async () => {
    const storageMock = createLocalStorageMock('stored-token');
    const windowMock = { localStorage: storageMock } as unknown as Window & typeof globalThis;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      enumerable: true,
      value: windowMock,
      writable: true,
    });

    const { api, ApiClient } = await import('./api');

    expect(storageMock.getItem).toHaveBeenCalledWith('auth_token');
    expect((api as unknown as { token: string | null }).token).toBe('stored-token');

    api.setToken('new-token');
    expect(storageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-token');

    const anotherClient = new ApiClient();
    expect((anotherClient as unknown as { token: string | null }).token).toBe('new-token');

    api.clearToken();
    expect(storageMock.removeItem).toHaveBeenCalledWith('auth_token');
  });
});
