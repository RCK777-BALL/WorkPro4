import type { DashboardSummaryResponse } from '../../shared/types/dashboard';
import type { TeamsOverviewResponse, ShiftDto, LaborEntryDto, TeamInvitationDto } from '../../shared/types/teams';
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
    // Mock data for development when backend is not available
    if (endpoint.includes('/summary')) {
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

    if (endpoint.startsWith('/work-orders/')) {
      const workOrderId = endpoint.split('/').pop() ?? '';
      return (getMockWorkOrderById(workOrderId) ?? null) as T | null;
    }

    if (endpoint === '/work-orders') {
      return mockWorkOrders as T;
    }

    if (endpoint === '/assets/tree') {
      const mockAssets: { sites: MockAssetTreeSite[] } = {
        sites: [
          {
            id: 'site-1',
            name: 'Main Plant',
            areas: [
              {
                id: 'area-1',
                name: 'Production',
                lines: [
                  {
                    id: 'line-1',
                    name: 'Assembly Line 1',
                    stations: [
                      {
                        id: 'station-1',
                        name: 'Station A',
                        assets: [
                          { id: '1', code: 'PUMP-001', name: 'Main Water Pump' },
                          { id: '2', code: 'CONV-001', name: 'Conveyor Belt #1' },
                          { id: '3', code: 'MOTOR-001', name: 'Drive Motor #1' },
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      return mockAssets as T;
    }

    if (endpoint === '/users') {
      const users: MockUser[] = [
        { id: '1', name: 'John Smith', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
        { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      ];

      return users as T;
    }

    if (endpoint.startsWith('/auth/me')) {
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

    if (endpoint.startsWith('/purchase-orders')) {
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

    if (endpoint === '/teams' || endpoint === '/teams/shifts' || endpoint === '/teams/labor') {
      const now = new Date();
      const toIso = (date: Date) => date.toISOString();
      const buildShift = (
        id: string,
        userId: string,
        startOffsetHours: number,
        durationHours: number,
        type: ShiftDto['type'],
        status: ShiftDto['status'],
        notes: string,
      ): ShiftDto => {
        const start = new Date(now.getTime() + startOffsetHours * 60 * 60 * 1000);
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        return {
          id,
          tenantId: 'tenant-1',
          userId,
          type,
          status,
          startsAt: toIso(start),
          endsAt: toIso(end),
          minutes: durationHours * 60,
          notes,
          createdAt: toIso(now),
          updatedAt: toIso(now),
        };
      };

      const jordanCurrent = buildShift('shift-1', 'user-1', -1, 4, 'regular', 'approved', 'Covering production line A');
      const jordanUpcoming = buildShift('shift-2', 'user-1', 6, 4, 'regular', 'approved', 'Evening planning session');
      const mayaUpcoming = buildShift('shift-3', 'user-2', 2, 6, 'regular', 'pending', 'Reliability audit support');
      const mayaLeave = buildShift('shift-4', 'user-2', 24, 8, 'leave', 'approved', 'Personal PTO');
      const andreUpcoming = buildShift('shift-5', 'user-3', 3, 5, 'regular', 'pending', 'Assist utilities maintenance');

      const laborEntries: LaborEntryDto[] = [
        {
          id: 'labor-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          workOrderId: 'wo-101',
          workOrderTitle: 'Calibrate Fillers',
          startedAt: toIso(new Date(now.getTime() - 3 * 60 * 60 * 1000)),
          endedAt: toIso(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
          minutes: 60,
          notes: 'Coordinated calibration with production',
          createdAt: toIso(now),
          updatedAt: toIso(now),
        },
        {
          id: 'labor-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          workOrderId: 'wo-205',
          workOrderTitle: 'Bearing vibration analysis',
          startedAt: toIso(new Date(now.getTime() - 6 * 60 * 60 * 1000)),
          endedAt: toIso(new Date(now.getTime() - 4 * 60 * 60 * 1000)),
          minutes: 120,
          notes: 'Captured ultrasonic readings',
          createdAt: toIso(now),
          updatedAt: toIso(now),
        },
        {
          id: 'labor-3',
          tenantId: 'tenant-1',
          userId: 'user-3',
          workOrderId: 'wo-310',
          workOrderTitle: 'HVAC damper repair',
          startedAt: toIso(new Date(now.getTime() - 1.5 * 60 * 60 * 1000)),
          endedAt: toIso(new Date(now.getTime() - 0.5 * 60 * 60 * 1000)),
          minutes: 60,
          notes: 'Replaced actuator and tested airflow',
          createdAt: toIso(now),
          updatedAt: toIso(now),
        },
      ];

      const invites: TeamInvitationDto[] = [
        {
          id: 'invite-1',
          tenantId: 'tenant-1',
          email: 'alex.planner@example.com',
          role: 'planner',
          status: 'pending',
          message: 'Join us to help with outage planning',
          invitedById: 'user-admin',
          invitedByName: 'Admin User',
          expiresAt: toIso(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
          createdAt: toIso(now),
          updatedAt: toIso(now),
        },
        {
          id: 'invite-2',
          tenantId: 'tenant-1',
          email: 'casey.viewer@example.com',
          role: 'viewer',
          status: 'accepted',
          message: null,
          invitedById: 'user-admin',
          invitedByName: 'Admin User',
          expiresAt: null,
          createdAt: toIso(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
          updatedAt: toIso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        },
        {
          id: 'invite-3',
          tenantId: 'tenant-1',
          email: 'morgan.contractor@example.com',
          role: 'technician',
          status: 'expired',
          message: 'Contractor coverage for shutdown',
          invitedById: 'user-manager',
          invitedByName: 'Jordan Daniels',
          expiresAt: toIso(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
          createdAt: toIso(new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)),
          updatedAt: toIso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        },
      ];

      const members: TeamsOverviewResponse['members'] = [
        {
          id: 'user-1',
          name: 'Jordan Daniels',
          email: 'jordan@workpro.io',
          role: 'planner',
          joinedAt: toIso(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)),
          phone: '+1 555-123-8899',
          status: 'on-shift',
          tags: ['Scheduling', 'Workflow'],
          upcomingShift: jordanUpcoming,
          currentShift: jordanCurrent,
          hoursThisWeek: 32,
          laborThisWeek: 32 * 60,
          recentLabor: laborEntries.filter((entry) => entry.userId === 'user-1'),
          upcomingShifts: [jordanUpcoming],
        },
        {
          id: 'user-2',
          name: 'Maya Rivera',
          email: 'maya@workpro.io',
          role: 'manager',
          joinedAt: toIso(new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000)),
          phone: '+1 555-678-4433',
          status: 'standby',
          tags: ['Leadership', 'Planning'],
          upcomingShift: mayaUpcoming,
          currentShift: null,
          hoursThisWeek: 18,
          laborThisWeek: 18 * 60,
          recentLabor: laborEntries.filter((entry) => entry.userId === 'user-2'),
          upcomingShifts: [mayaUpcoming, mayaLeave],
        },
        {
          id: 'user-3',
          name: 'Andre Chen',
          email: 'andre@workpro.io',
          role: 'technician',
          joinedAt: toIso(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)),
          phone: '+1 555-789-2233',
          status: 'available',
          tags: ['Field Ops', 'Maintenance'],
          upcomingShift: andreUpcoming,
          currentShift: null,
          hoursThisWeek: 24,
          laborThisWeek: 24 * 60,
          recentLabor: laborEntries.filter((entry) => entry.userId === 'user-3'),
          upcomingShifts: [andreUpcoming],
        },
      ];

      const overview: TeamsOverviewResponse = {
        members,
        invites,
        viewerRole: 'manager',
        canManageInvites: true,
        scheduleWindow: {
          start: toIso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
          end: toIso(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
        },
      };

      if (endpoint === '/teams') {
        return overview as T;
      }

      if (endpoint === '/teams/shifts') {
        const allShifts = members
          .flatMap((member) => [member.currentShift, ...member.upcomingShifts])
          .filter((shift): shift is ShiftDto => Boolean(shift));
        return allShifts as T;
      }

      if (endpoint === '/teams/labor') {
        return laborEntries as T;
      }
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

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: 'DELETE' });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data!;
  }
}

export const api = new ApiClient();