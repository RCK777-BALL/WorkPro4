import type { DashboardSummaryResponse } from '../../shared/types/dashboard';
import { getMockWorkOrderById, mockWorkOrders } from './mockWorkOrders';

interface MockAssetTreeSite {
  id: string;
  name: string;
  areas?: {
    id: string;
    name: string;
    lines?: {
      id: string;
      name: string;
      stations?: {
        id: string;
        name: string;
        assets?: {
          id: string;
          code: string;
          name: string;
        }[];
      }[];
    }[];
  }[];
}

interface MockUser {
  id: string;
  name: string;
  email: string;
}

interface MockAuthUser extends MockUser {
  tenantId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface MockPurchaseOrderLine {
  partName: string;
  partSku: string;
  quantity: number;
  unitCost: number;
}

interface MockPurchaseOrder {
  id: string;
  tenantId: string;
  vendorId: string;
  poNumber: string;
  status: 'draft' | 'issued' | 'received' | 'closed';
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  orderedAt?: string;
  receivedAt?: string;
  lines: { partId: string; qty: number; unitCost: number }[];
  linesWithDetails: MockPurchaseOrderLine[];
  vendor: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export const normalizeApiBaseUrl = (value: string | undefined | null): string => {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      return '/api';
    }

    return 'http://localhost:5010/api';
  }

  const withoutTrailingSlashes = trimmedValue.replace(/\/+$/u, '');

  if (/^https?:\/\//iu.test(withoutTrailingSlashes)) {
    return withoutTrailingSlashes.endsWith('/api')
      ? withoutTrailingSlashes
      : `${withoutTrailingSlashes}/api`;
  }

  const withLeadingSlash = withoutTrailingSlashes.startsWith('/')
    ? withoutTrailingSlashes
    : `/${withoutTrailingSlashes}`;

  if (withLeadingSlash.endsWith('/api')) {
    return withLeadingSlash;
  }

  return `${withLeadingSlash}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const TOKEN_STORAGE_KEY = 'auth_token';

export interface ApiResult<T> {
  data: T | null;
  error: {
    code: number;
    message: string;
    details?: unknown;
  } | null;
}

export class ApiClient {
  private static memoryToken: string | null = null;

  private static getStorage(): Storage | null {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private token: string | null = null;

  constructor() {
    const storage = ApiClient.getStorage();

    if (storage) {
      try {
        this.token = storage.getItem(TOKEN_STORAGE_KEY);
        ApiClient.memoryToken = this.token;
        return;
      } catch {
        // Fall through to in-memory storage when localStorage access fails
      }
    }

    this.token = ApiClient.memoryToken;
  }

  setToken(token: string) {
    this.token = token;
    ApiClient.memoryToken = token;

    const storage = ApiClient.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignore storage write errors to keep client usable in non-browser environments
    }
  }

  clearToken() {
    this.token = null;
    ApiClient.memoryToken = null;

    const storage = ApiClient.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage removal errors in restricted environments
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const result = await this.handleResponse<T>(response);

      if (result.error) {
        if (result.error.code === 401 || result.error.code === 403) {
          this.clearToken();
          // Don't redirect automatically, let the auth hook handle it
        }
        return result;
      }

      if (result.data == null) {
        return {
          data: null,
          error: {
            code: response.status || 500,
            message: 'Received empty response from server'
          }
        } satisfies ApiResult<T>;
      }

      return result;
    } catch (error) {
      // If backend is not available, return mock data for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Backend not available, using mock data');
        const mockData = this.getMockData<T | null>(endpoint);
        if (mockData != null) {
          return {
            data: mockData,
            error: null,
          } satisfies ApiResult<T>;
        }
        return {
          data: null,
          error: {
            code: 503,
            message: 'Backend unavailable and no mock data available',
          },
        } satisfies ApiResult<T>;
      }

      return {
        data: null,
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private getMockData<T>(endpoint: string): T | null {
    const [path] = endpoint.split('?');

    // Mock data for development when backend is not available
    if (path.includes('/summary')) {
      const mockSummary: DashboardSummaryResponse = {
        workOrders: {
          open: 12,
          overdue: 3,
          completedThisMonth: 45,
          completedTrend: 8.5,
        },
        assets: {
          uptime: 94.5,
          total: 234,
          down: 3,
          operational: 231,
        },
        inventory: {
          totalParts: 1250,
          lowStock: 18,
          stockHealth: 87.3,
        },
      };

      return mockSummary as T;
    }

    if (path.startsWith('/work-orders/')) {
      const workOrderId = path.split('/').pop() ?? '';
      return (getMockWorkOrderById(workOrderId) ?? null) as T | null;
    }

    if (path === '/work-orders') {
      return mockWorkOrders as T;
    }

    const mockAssetBase = {
      site: { id: 'site-1', name: 'Main Plant', code: 'main-plant' },
      area: { id: 'area-1', name: 'Production', code: 'production' },
      line: { id: 'line-1', name: 'Assembly Line A', code: 'assembly-a' },
      station: { id: 'station-1', name: 'Press Station', code: 'station-1' },
    } as const;

    if (path === '/assets' || path === '/assets/') {
      const asset = {
        id: 'asset-1',
        tenantId: 'tenant-1',
        code: 'PUMP-001',
        name: 'Main Water Pump',
        status: 'operational' as const,
        criticality: 3,
        manufacturer: 'Allied Pumps Inc.',
        modelNumber: 'APX-500',
        serialNumber: 'SN-APX500-001',
        site: mockAssetBase.site,
        area: mockAssetBase.area,
        line: mockAssetBase.line,
        station: mockAssetBase.station,
        purchaseDate: '2023-01-15T00:00:00.000Z',
        commissionedAt: '2023-03-01T00:00:00.000Z',
        warrantyExpiresAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      } satisfies {
        id: string;
        tenantId: string;
        code: string;
        name: string;
        status: 'operational';
        criticality: number;
        manufacturer: string;
        modelNumber: string;
        serialNumber: string;
        site: typeof mockAssetBase.site;
        area: typeof mockAssetBase.area;
        line: typeof mockAssetBase.line;
        station: typeof mockAssetBase.station;
        purchaseDate: string;
        commissionedAt: string;
        warrantyExpiresAt: string;
        createdAt: string;
        updatedAt: string;
      };

      return { assets: [asset] } as T;
    }

    if (path === '/assets/hierarchy') {
      const mockAssets: { sites: MockAssetTreeSite[] } = {
        sites: [
          {
            id: mockAssetBase.site.id,
            name: mockAssetBase.site.name,
            areas: [
              {
                id: mockAssetBase.area.id,
                name: mockAssetBase.area.name,
                lines: [
                  {
                    id: mockAssetBase.line.id,
                    name: mockAssetBase.line.name,
                    stations: [
                      {
                        id: mockAssetBase.station.id,
                        name: mockAssetBase.station.name,
                        assets: [
                          { id: 'asset-1', code: 'PUMP-001', name: 'Main Water Pump' },
                          { id: 'asset-2', code: 'MOTOR-002', name: 'Spare Motor' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      return mockAssets as T;
    }

    if (/^\/assets\/[^/]+(?:\/lifecycle)?$/.test(path)) {
      const assetDetail = {
        id: 'asset-1',
        tenantId: 'tenant-1',
        code: 'PUMP-001',
        name: 'Main Water Pump',
        status: 'operational',
        criticality: 3,
        manufacturer: 'Allied Pumps Inc.',
        modelNumber: 'APX-500',
        serialNumber: 'SN-APX500-001',
        site: mockAssetBase.site,
        area: mockAssetBase.area,
        line: mockAssetBase.line,
        station: mockAssetBase.station,
        purchaseDate: '2023-01-15T00:00:00.000Z',
        commissionedAt: '2023-03-01T00:00:00.000Z',
        warrantyExpiresAt: '2026-03-01T00:00:00.000Z',
        cost: 12500,
        warrantyProvider: 'Allied Service Partners',
        warrantyContact: 'support@alliedservice.com',
        warrantyNotes: 'Annual inspection required.',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        bomLines: [
          {
            id: 'bom-1',
            tenantId: 'tenant-1',
            assetId: 'asset-1',
            position: 0,
            reference: 'KIT-HP-001',
            description: 'Hydraulic pump seal kit',
            quantity: 1,
            unit: 'ea',
            notes: 'Replace annually or on wear indication',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
          {
            id: 'bom-2',
            tenantId: 'tenant-1',
            assetId: 'asset-1',
            position: 1,
            reference: 'FLT-500',
            description: 'Inlet filtration cartridge',
            quantity: 2,
            unit: 'ea',
            notes: 'Change every 6 months',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      return assetDetail as T;
    }

    if (/^\/assets\/[^/]+\/bom$/.test(path)) {
      const lines = [
        {
          id: 'bom-1',
          tenantId: 'tenant-1',
          assetId: 'asset-1',
          position: 0,
          reference: 'KIT-HP-001',
          description: 'Hydraulic pump seal kit',
          quantity: 1,
          unit: 'ea',
          notes: 'Replace annually or on wear indication',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      return { lines } as T;
    }

    if (path === '/users') {
      const users: MockUser[] = [
        { id: '1', name: 'John Smith', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
        { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      ];

      return users as T;
    }

    if (path.startsWith('/auth/me')) {
      const now = new Date().toISOString();
      const user: MockAuthUser = {
        id: '1',
        tenantId: 'tenant-1',
        email: 'john@example.com',
        name: 'John Smith',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      };

      return user as T;
    }

    if (path.startsWith('/purchase-orders')) {
      const now = Date.now();
      const purchaseOrders: MockPurchaseOrder[] = [
        {
          id: '1',
          tenantId: '1',
          vendorId: '1',
          poNumber: 'PO-2024-001',
          status: 'issued',
          subtotal: 1250.0,
          tax: 100.0,
          shipping: 50.0,
          total: 1400.0,
          orderedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            { partId: '1', qty: 10, unitCost: 45.5 },
            { partId: '2', qty: 5, unitCost: 125.0 },
          ],
          linesWithDetails: [
            { partName: 'Pump Seal Kit', partSku: 'PUMP-SEAL-001', quantity: 10, unitCost: 45.5 },
            { partName: 'Bearing Set', partSku: 'BEAR-001', quantity: 5, unitCost: 125.0 },
          ],
          vendor: { id: '1', name: 'Industrial Supply Co.' },
          createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          tenantId: '1',
          vendorId: '2',
          poNumber: 'PO-2024-002',
          status: 'received',
          subtotal: 850.0,
          tax: 68.0,
          shipping: 25.0,
          total: 943.0,
          orderedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
          receivedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lines: [
            { partId: '3', qty: 25, unitCost: 12.75 },
            { partId: '4', qty: 10, unitCost: 32.5 },
          ],
          linesWithDetails: [
            { partName: 'V-Belt 4L360', partSku: 'BELT-V-002', quantity: 25, unitCost: 12.75 },
            { partName: 'Timing Belt', partSku: 'BELT-T-003', quantity: 10, unitCost: 32.5 },
          ],
          vendor: { id: '2', name: 'Belt & Drive Solutions' },
          createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          tenantId: '1',
          vendorId: '3',
          poNumber: 'PO-2024-003',
          status: 'draft',
          subtotal: 495.0,
          tax: 39.6,
          shipping: 15.0,
          total: 549.6,
          lines: [{ partId: '5', qty: 60, unitCost: 8.25 }],
          linesWithDetails: [
            { partName: 'Hydraulic Oil ISO 46', partSku: 'OIL-HYD-003', quantity: 60, unitCost: 8.25 },
          ],
          vendor: { id: '3', name: 'Lubricant Specialists' },
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        },
      ];

      return purchaseOrders as T;
    }

    return null;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResult<T>> {
    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      // Swallow JSON parse errors so we can construct a consistent ApiResult below
    }

    const maybeResult = this.normalizePayload<T>(payload, response);

    if (!response.ok && maybeResult.error == null) {
      return {
        data: null,
        error: {
          code: response.status || 500,
          message: response.statusText || 'Request failed',
          details: payload,
        },
      } satisfies ApiResult<T>;
    }

    return maybeResult;
  }

  private normalizePayload<T>(payload: unknown, response: Response): ApiResult<T> {
    if (payload && typeof payload === 'object') {
      const maybeRecord = payload as Record<string, unknown>;
      const hasData = 'data' in maybeRecord;
      const hasError = 'error' in maybeRecord;

      if (hasData || hasError) {
        return {
          data: (maybeRecord['data'] ?? null) as T | null,
          error: (maybeRecord['error'] ?? null) as ApiResult<T>['error'],
        } satisfies ApiResult<T>;
      }
    }

    if (response.ok) {
      return {
        data: (payload as T | null) ?? null,
        error: null,
      } satisfies ApiResult<T>;
    }

    return {
      data: null,
      error: {
        code: response.status || 500,
        message: response.statusText || 'Request failed',
        details: payload,
      },
    } satisfies ApiResult<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'GET' });
    if (result.error || result.data == null) {
      throw new Error(result.error?.message ?? 'No data returned from server');
    }
    return result.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const result = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'DELETE' });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }
}

export const api = new ApiClient();