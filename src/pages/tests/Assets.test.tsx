import type { ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Assets from '../Assets';
import { renderWithProviders, createTestQueryClient } from '../../tests/testUtils';
import { ApiRequestError } from '../../lib/errors';
import type { ApiError } from '../../../shared/types/http';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
}));

const showToastMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    api: apiMock,
  };
});

vi.mock('../../components/ui/toast', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: showToastMock, dismissToast: vi.fn() }),
}));

vi.mock('../../components/premium/SlideOver', () => ({
  SlideOver: ({ children }: { children: ReactNode }) => <div data-testid="asset-drawer">{children}</div>,
}));

const authState = {
  user: {
    id: '1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-02-01').toISOString(),
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuth: vi.fn(),
  error: null,
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (selector?: (state: typeof authState) => unknown) =>
    (selector ? selector(authState) : authState),
}));

interface MockAsset {
  id: string;
  code: string;
  name: string;
  status: 'operational' | 'maintenance' | 'down' | 'retired' | 'decommissioned';
  location: string | null;
  category: string | null;
  purchaseDate: string | null;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
}

type HierarchyPreview = {
  id: string;
  name: string;
  areas: Array<{
    id: string;
    name: string;
    lines: Array<{
      id: string;
      name: string;
      stations: Array<{
        id: string;
        name: string;
        assets: Array<Pick<MockAsset, 'id' | 'code' | 'name'>>;
      }>;
    }>;
  }>;
};

function createMockAsset(overrides: Partial<MockAsset> = {}): MockAsset {
  const now = new Date('2024-03-01').toISOString();
  return {
    id: 'asset-1',
    code: 'PUMP-001',
    name: 'Main Pump',
    status: 'operational',
    location: 'Plant 1',
    category: 'Utilities',
    purchaseDate: new Date('2023-12-01').toISOString(),
    cost: 1500,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function setupAssetsApi(assets: MockAsset[], hierarchy: HierarchyPreview[] = []) {
  const assetsDb = [...assets];

  apiMock.get.mockImplementation(async (url: string) => {
    if (url.startsWith('/assets') && !url.startsWith('/assets/')) {
      return {
        ok: true,
        assets: [...assetsDb],
        meta: {
          page: 1,
          pageSize: 10,
          total: assetsDb.length,
          totalPages: Math.max(1, Math.ceil(Math.max(assetsDb.length, 1) / 10)),
        },
      };
    }

    if (url === '/hierarchy/assets') {
      return {
        sites: hierarchy,
      };
    }

    throw new Error(`Unhandled GET ${url}`);
  });

  apiMock.post.mockImplementation(async (url: string, payload: any) => {
    if (url !== '/assets') {
      throw new Error(`Unhandled POST ${url}`);
    }

    const nextId = `asset-${assetsDb.length + 1}`;
    const now = new Date('2024-04-01').toISOString();
    const created: MockAsset = {
      id: nextId,
      code: payload.code ?? `ASSET-${nextId}`,
      name: payload.name ?? `Asset ${nextId}`,
      status: payload.status ?? 'operational',
      location: payload.location ?? null,
      category: payload.category ?? null,
      purchaseDate: payload.purchaseDate ?? null,
      cost: payload.cost ?? null,
      createdAt: now,
      updatedAt: now,
    };

    assetsDb.unshift(created);
    return { ok: true, asset: created };
  });

  apiMock.put.mockImplementation(async (url: string, payload: any) => {
    const id = url.replace('/assets/', '');
    const index = assetsDb.findIndex((asset) => asset.id === id);
    if (index === -1) {
      throw new Error(`Asset ${id} not found`);
    }

    const now = new Date('2024-04-10').toISOString();
    const updated = {
      ...assetsDb[index],
      ...payload,
      location: payload.location ?? null,
      category: payload.category ?? null,
      purchaseDate: payload.purchaseDate ?? null,
      cost: payload.cost ?? null,
      updatedAt: now,
    } satisfies MockAsset;

    assetsDb[index] = updated;
    return { ok: true, asset: updated };
  });

  apiMock.delete.mockImplementation(async (url: string) => {
    const id = url.replace('/assets/', '');
    const index = assetsDb.findIndex((asset) => asset.id === id);
    if (index === -1) {
      throw new Error(`Asset ${id} not found`);
    }

    const [removed] = assetsDb.splice(index, 1);
    return { ok: true, asset: removed };
  });
}

function createApiError(overrides: Partial<ApiError> & { message: string; code: number }): ApiRequestError {
  return new ApiRequestError({
    message: overrides.message,
    code: overrides.code,
    details: overrides.details,
    offline: overrides.offline,
  });
}

describe('Assets page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the assets table with row actions', async () => {
    const assets = [createMockAsset(), createMockAsset({ id: 'asset-2', code: 'MTR-002', name: 'Motor' })];
    setupAssetsApi(assets, []);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await waitFor(() => {
      expect(screen.getByText('Main Pump')).toBeInTheDocument();
      expect(screen.getByText('Motor')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
    expect(screen.getByTestId('asset-row-edit-asset-1')).toBeInTheDocument();
    expect(screen.getByTestId('asset-row-delete-asset-1')).toBeInTheDocument();
  });

  it('shows the empty state CTA when no assets are returned', async () => {
    setupAssetsApi([]);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await waitFor(() => {
      expect(screen.getByText('No assets match your filters.')).toBeInTheDocument();
    });

    expect(screen.getByTestId('asset-toolbar-create')).toBeInTheDocument();
  });

  it('opens the drawer and validates required fields before submission', async () => {
    setupAssetsApi([]);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('asset-toolbar-create'));

    await user.click(screen.getByTestId('asset-form-submit'));

    await waitFor(() => {
      expect(screen.getByText('Asset name is required')).toBeInTheDocument();
      expect(screen.getByText('Asset tag is required')).toBeInTheDocument();
    });

    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('edits and deletes an asset through the drawer flow', async () => {
    const asset = createMockAsset();
    setupAssetsApi([asset]);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await screen.findByText('Main Pump');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('asset-row-edit-asset-1'));

    const locationInput = await screen.findByTestId('asset-form-location');
    await user.clear(locationInput);
    await user.type(locationInput, 'Plant 5');
    await user.click(screen.getByTestId('asset-form-submit'));

    await waitFor(() => {
      expect(apiMock.put).toHaveBeenCalledWith(
        '/assets/asset-1',
        expect.objectContaining({ location: 'Plant 5' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Plant 5')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('asset-row-delete-asset-1'));

    await waitFor(() => {
      expect(apiMock.delete).toHaveBeenCalledWith('/assets/asset-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Main Pump')).not.toBeInTheDocument();
    });
  });

  it('requests filtered data when search criteria change', async () => {
    const asset = createMockAsset();
    setupAssetsApi([asset]);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await screen.findByText('Main Pump');

    const user = userEvent.setup();
    const searchInput = screen.getByTestId('asset-filter-search');
    await user.type(searchInput, 'pump');

    await waitFor(() => {
      expect(apiMock.get.mock.calls.some(([url]) => typeof url === 'string' && url.includes('search=pump'))).toBe(true);
    });
  });

  it('renders the import preview hierarchy for quick review', async () => {
    const asset = createMockAsset();
    const hierarchy: HierarchyPreview[] = [
      {
        id: 'site-1',
        name: 'Central Plant',
        areas: [
          {
            id: 'area-1',
            name: 'Assembly',
            lines: [
              {
                id: 'line-1',
                name: 'Line A',
                stations: [
                  {
                    id: 'station-1',
                    name: 'Station 1',
                    assets: [{ id: asset.id, code: asset.code, name: asset.name }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    setupAssetsApi([asset], hierarchy);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    await waitFor(() => {
      expect(screen.getByText('Central Plant')).toBeInTheDocument();
      expect(screen.getByText('Line A')).toBeInTheDocument();
      expect(screen.getByText(`${asset.code} · ${asset.name}`)).toBeInTheDocument();
    });
  });

  it('surfaces API validation errors when creation fails', async () => {
    setupAssetsApi([]);

    const validationError = createApiError({ code: 422, message: 'Asset code already exists' });
    apiMock.post.mockRejectedValueOnce(validationError);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('asset-toolbar-create'));
    await user.type(screen.getByTestId('asset-form-name'), 'Generator');
    await user.type(screen.getByTestId('asset-form-code'), 'GEN-100');
    await user.click(screen.getByTestId('asset-form-submit'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to create asset',
          description: 'Asset code already exists',
          variant: 'error',
        }),
      );
    });
  });

  it('shows offline feedback when create requests fail', async () => {
    const asset = createMockAsset();
    setupAssetsApi([asset]);

    const offlineError = createApiError({ code: 503, message: 'Network offline', offline: true });
    apiMock.post.mockRejectedValueOnce(offlineError);

    renderWithProviders(<Assets />, { queryClient: createTestQueryClient() });

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('asset-toolbar-create'));
    await user.type(screen.getByTestId('asset-form-name'), 'Booster Pump');
    await user.type(screen.getByTestId('asset-form-code'), 'BST-300');
    await user.click(screen.getByTestId('asset-form-submit'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to create asset',
          description: 'Network offline',
          variant: 'error',
        }),
      );
    });
  });
});
