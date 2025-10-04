import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Assets from './Assets';
import { renderWithProviders, createTestQueryClient } from '../tests/testUtils';
import { api } from '../lib/api';
import type { ReactNode } from 'react';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('../components/ui/toast', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: vi.fn(), dismissToast: vi.fn() }),
}));

vi.mock('../components/premium/SlideOver', () => ({
  SlideOver: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const mockedUseQuery = vi.hoisted(() => vi.fn());
const mockedUseMutation = vi.hoisted(() => vi.fn());
const mockedUseQueryClient = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockedUseQuery,
    useMutation: mockedUseMutation,
    useQueryClient: mockedUseQueryClient,
    QueryClientProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const queryClientMocks = {
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
  cancelQueries: vi.fn(),
};

const mockState = {
  user: {
    id: '1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuth: vi.fn(),
  error: null,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: (selector?: (state: typeof mockState) => unknown) => (selector ? selector(mockState) : mockState),
}));

describe('Assets page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseQueryClient.mockReturnValue(queryClientMocks);
    mockedUseMutation.mockImplementation((options: any) => ({
      mutate: async (variables: any) => {
        try {
          const result = await options?.mutationFn?.(variables);
          if (options?.onSuccess) {
            await act(async () => {
              await options.onSuccess?.(result, variables, undefined);
            });
          }
          return result;
        } catch (error) {
          if (options?.onError) {
            await act(async () => {
              await options.onError?.(error, variables, undefined);
            });
          }
          throw error;
        }
      },
      mutateAsync: async (variables: any) => {
        const result = await options?.mutationFn?.(variables);
        if (options?.onSuccess) {
          await act(async () => {
            await options.onSuccess?.(result, variables, undefined);
          });
        }
        return result;
      },
      isLoading: false,
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders assets from the API', async () => {
    const asset = {
      id: 'asset-1',
      code: 'PUMP-001',
      name: 'Main Pump',
      status: 'operational',
      location: 'Plant 1',
      category: 'Utilities',
      purchaseDate: new Date('2023-04-01').toISOString(),
      cost: 1500,
      createdAt: new Date('2023-04-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    };

    mockedUseQuery.mockReturnValue({
      data: { ok: true, assets: [asset], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    renderWithProviders(<Assets />);

    expect(await screen.findByText('Main Pump')).toBeInTheDocument();
    expect(screen.getByText('PUMP-001')).toBeInTheDocument();
    expect(mockedUseQuery).toHaveBeenCalled();
  });

  it('submits the create asset form', async () => {
    const user = userEvent.setup();

    mockedUseQuery.mockReturnValue({
      data: { ok: true, assets: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    mockedApi.post.mockResolvedValue({
      ok: true,
      asset: {
        id: 'asset-2',
        code: 'GEN-200',
        name: 'Generator',
        status: 'operational',
        location: 'Plant 2',
        category: 'Power',
        purchaseDate: new Date('2024-01-15').toISOString(),
        cost: 25000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await screen.findByText('Assets');

    await act(async () => {
      await user.click(screen.getByTestId('asset-toolbar-create'));
    });

    const nameInput = await screen.findByTestId('asset-form-name');

    await act(async () => {
      await user.type(nameInput, 'Generator');
      await user.type(screen.getByTestId('asset-form-code'), 'GEN-200');
      await user.type(screen.getByTestId('asset-form-location'), 'Plant 2');
      await user.type(screen.getByTestId('asset-form-category'), 'Power');
      await user.clear(screen.getByTestId('asset-form-cost'));
      await user.type(screen.getByTestId('asset-form-cost'), '25000');
      await user.type(screen.getByTestId('asset-form-purchaseDate'), '2024-01-15');
      await user.click(screen.getByTestId('asset-form-submit'));
    });

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/assets', {
        name: 'Generator',
        code: 'GEN-200',
        status: 'operational',
        location: 'Plant 2',
        category: 'Power',
        purchaseDate: new Date('2024-01-15').toISOString(),
        cost: 25000,
      });
    });
  });

  it('updates the URL when filters change', async () => {
    mockedUseQuery.mockReturnValue({
      data: { ok: true, assets: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    renderWithProviders(<Assets />);

    const searchInput = await screen.findByTestId('asset-filter-search');
    await act(async () => {
      await userEvent.type(searchInput, 'pump');
    });

    await waitFor(() => {
      const lastCall = mockedUseQuery.mock.calls.at(-1)?.[0];
      expect(lastCall?.queryKey?.[1]?.search).toBe('pump');
    });
  });
});
