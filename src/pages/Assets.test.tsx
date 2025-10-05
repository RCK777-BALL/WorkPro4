import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import Assets from './Assets';
import { renderWithProviders, createTestQueryClient } from '../tests/testUtils';
import * as assetsApi from '../lib/assets';
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

vi.mock('../lib/assets', () => ({
  assetStatuses: ['operational', 'maintenance', 'down', 'retired', 'decommissioned'] as const,
  listAssets: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
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

const mockedAssetsApi = assetsApi as unknown as {
  listAssets: ReturnType<typeof vi.fn>;
  createAsset: ReturnType<typeof vi.fn>;
  updateAsset: ReturnType<typeof vi.fn>;
  deleteAsset: ReturnType<typeof vi.fn>;
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
    cleanup();
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
      data: { assets: [asset], meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    renderWithProviders(<Assets />);

    expect(await screen.findByText('Main Pump')).toBeInTheDocument();
    expect(screen.getByText('PUMP-001')).toBeInTheDocument();
    expect(mockedUseQuery).toHaveBeenCalled();
  });

  it('submits the create asset form', async () => {
    mockedUseQuery.mockReturnValue({
      data: { assets: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    mockedAssetsApi.createAsset.mockResolvedValue({
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
    });

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await screen.findByText('Assets');

    await act(async () => {
      fireEvent.click(screen.getByTestId('asset-toolbar-create'));
    });

    const nameInput = await screen.findByTestId('asset-form-name');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Generator' } });
      fireEvent.change(screen.getByTestId('asset-form-code'), { target: { value: 'GEN-200' } });
      fireEvent.change(screen.getByTestId('asset-form-location'), { target: { value: 'Plant 2' } });
      fireEvent.change(screen.getByTestId('asset-form-category'), { target: { value: 'Power' } });
      fireEvent.change(screen.getByTestId('asset-form-cost'), { target: { value: '25000' } });
      fireEvent.change(screen.getByTestId('asset-form-purchaseDate'), { target: { value: '2024-01-15' } });
      fireEvent.click(screen.getByTestId('asset-form-submit'));
    });

    await waitFor(() => {
      expect(mockedAssetsApi.createAsset).toHaveBeenCalledWith({
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
      data: { assets: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
    });

    renderWithProviders(<Assets />);

    const searchInput = await screen.findByTestId('asset-filter-search');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'pump' } });
    });

    await waitFor(() => {
      const lastCall = mockedUseQuery.mock.calls.at(-1)?.[0];
      expect(lastCall?.queryKey?.[1]?.search).toBe('pump');
    });
  });

  it('updates sort parameters when a sortable column header is clicked', async () => {
    const queryKeys: unknown[][] = [];
    const now = new Date('2024-01-01').toISOString();

    mockedUseQuery.mockImplementation((options: any) => {
      queryKeys.push(options.queryKey ?? []);
      return {
        data: {
          ok: true,
          assets: [
            {
              id: 'asset-1',
              code: 'PUMP-001',
              name: 'Main Pump',
              status: 'operational',
              location: 'Plant 1',
              category: 'Utilities',
              purchaseDate: now,
              cost: 1500,
              createdAt: now,
              updatedAt: now,
            },
          ],
          meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
        isLoading: false,
        isFetching: false,
      };
    });

    renderWithProviders(<Assets />);

    const updatedHeaderButton = await screen.findByTestId('pro-table-sort-updatedAt');
    expect(updatedHeaderButton.closest('th')?.getAttribute('aria-sort')).toBe('descending');

    const sortButton = await screen.findByTestId('pro-table-sort-code');

    await act(async () => {
      fireEvent.click(sortButton);
    });

    await waitFor(() => {
      const lastQuery = queryKeys.at(-1);
      expect(lastQuery?.[1]?.sort).toBe('code:asc');
    });

    const tagHeaderAsc = screen.getByTestId('pro-table-sort-code').closest('th');
    expect(tagHeaderAsc?.getAttribute('aria-sort')).toBe('ascending');

    await act(async () => {
      fireEvent.click(sortButton);
    });

    await waitFor(() => {
      const lastQuery = queryKeys.at(-1);
      expect(lastQuery?.[1]?.sort).toBe('code:desc');
    });

    const tagHeaderDesc = screen.getByTestId('pro-table-sort-code').closest('th');
    expect(tagHeaderDesc?.getAttribute('aria-sort')).toBe('descending');
  });

  it('updates page size and resets pagination when the dropdown changes', async () => {
    const queryKeys: unknown[][] = [];
    const totalRecords = 60;
    const now = new Date('2024-01-01').toISOString();

    mockedUseQuery.mockImplementation((options: any) => {
      const filters = options.queryKey?.[1] ?? {};
      const size = filters.pageSize ?? 25;
      const page = filters.page ?? 1;
      const startIndex = (page - 1) * size;
      const remaining = Math.max(totalRecords - startIndex, 0);
      const pageLength = Math.min(size, remaining);
      const assets = Array.from({ length: pageLength }, (_, index) => {
        const idNumber = startIndex + index + 1;
        return {
          id: `asset-${idNumber}`,
          code: `CODE-${idNumber.toString().padStart(3, '0')}`,
          name: `Asset ${idNumber}`,
          status: 'operational',
          location: 'Plant 1',
          category: 'Utilities',
          purchaseDate: now,
          cost: 1500,
          createdAt: now,
          updatedAt: now,
        };
      });

      queryKeys.push(options.queryKey ?? []);

      return {
        data: {
          ok: true,
          assets,
          meta: {
            page,
            pageSize: size,
            total: totalRecords,
            totalPages: Math.max(1, Math.ceil(totalRecords / size)),
          },
        },
        isLoading: false,
        isFetching: false,
      };
    });

    renderWithProviders(<Assets />);

    const pageSizeSelect = await screen.findByTestId('asset-pagination-size');
    expect(pageSizeSelect).toHaveValue('25');
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(pageSizeSelect, { target: { value: '50' } });
    });

    await waitFor(() => {
      const lastQuery = queryKeys.at(-1);
      expect(lastQuery?.[1]?.pageSize).toBe(50);
      expect(lastQuery?.[1]?.page).toBe(1);
    });

    const updatedSelect = await screen.findByTestId('asset-pagination-size');
    expect(updatedSelect).toHaveValue('50');
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
  });
});
