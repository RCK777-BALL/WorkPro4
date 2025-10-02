import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from './useAuth';
import { api } from '../lib/api';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => {
      return store.has(key) ? store.get(key)! : null;
    },
    key: (index: number) => {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
}

let useAuthHook: typeof import('./useAuth').useAuth;
let storage: Storage;

beforeAll(async () => {
  storage = createLocalStorageMock();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
    writable: false,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage } as Window & typeof globalThis,
    writable: false,
  });

  const module = await import('./useAuth');
  useAuthHook = module.useAuth;
});

beforeEach(() => {
  vi.restoreAllMocks();
  storage.clear();
  useAuthHook.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});

describe('useAuth store', () => {
  it('marks the user as authenticated after successful login', async () => {
    const mockUser: User = {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'john@example.com',
      name: 'John Smith',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      token: 'test-token',
      user: mockUser,
    });
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockUser);

    await useAuthHook.getState().login({ email: mockUser.email, password: 'secret' });

    expect(postSpy).toHaveBeenCalledWith('/auth/login', {
      email: mockUser.email,
      password: 'secret',
    });
    expect(getSpy).toHaveBeenCalledWith('/auth/me');

    const state = useAuthHook.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
    });
    expect(state.error).toBeNull();
  });
});
