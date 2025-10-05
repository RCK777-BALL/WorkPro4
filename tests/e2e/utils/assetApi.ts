import { type Page } from '@playwright/test';

export type AssetStatus = 'operational' | 'maintenance' | 'down' | 'retired' | 'decommissioned';

export interface AssetRecord {
  id: string;
  code: string;
  name: string;
  status: AssetStatus;
  location: string | null;
  category: string | null;
  purchaseDate: string | null;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetImportPayload {
  code: string;
  name: string;
  status?: AssetStatus;
  location?: string | null;
  category?: string | null;
  purchaseDate?: string | null;
  cost?: number | null;
}

type MutationType = 'create' | 'update' | 'delete';

interface QueuedMutation {
  type: MutationType;
  apply: () => AssetRecord | AssetRecord[] | null;
}

interface ExportCounts {
  csv: number;
  xlsx: number;
}

function jsonResponse<T>(data: T, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({ data, error: null }),
  } as const;
}

function errorResponse(message: string, status = 500) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({ data: null, error: { code: status, message } }),
  } as const;
}

function applyFilters(assets: AssetRecord[], params: URLSearchParams): AssetRecord[] {
  const search = (params.get('search') ?? '').toLowerCase().trim();
  const status = params.get('status')?.toLowerCase();
  const location = (params.get('location') ?? '').toLowerCase().trim();
  const category = (params.get('category') ?? '').toLowerCase().trim();

  return assets.filter((asset) => {
    if (search) {
      const haystack = `${asset.name} ${asset.code} ${asset.location ?? ''} ${asset.category ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (status && asset.status !== status) {
      return false;
    }

    if (location && !(asset.location ?? '').toLowerCase().includes(location)) {
      return false;
    }

    if (category && !(asset.category ?? '').toLowerCase().includes(category)) {
      return false;
    }

    return true;
  });
}

function buildHierarchy(assets: AssetRecord[]) {
  const now = new Date().toISOString();
  const makeSummary = (asset: AssetRecord) => ({
    id: asset.id,
    tenantId: 'tenant-1',
    code: asset.code,
    name: asset.name,
    status: asset.status,
    criticality: 3,
    manufacturer: null,
    modelNumber: null,
    serialNumber: null,
    site: null,
    area: null,
    line: null,
    station: null,
    purchaseDate: asset.purchaseDate,
    commissionedAt: null,
    warrantyExpiresAt: null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  });

  const firstStationAssets = assets.slice(0, 4).map(makeSummary);
  const secondStationAssets = assets.slice(4, 8).map(makeSummary);

  return {
    sites: [
      {
        id: 'site-1',
        tenantId: 'tenant-1',
        code: 'PLANT-1',
        name: 'North Plant',
        description: 'Primary production facility',
        areas: [
          {
            id: 'area-1',
            tenantId: 'tenant-1',
            siteId: 'site-1',
            code: 'PACK',
            name: 'Packaging',
            description: 'Final packaging lines',
            lines: [
              {
                id: 'line-1',
                tenantId: 'tenant-1',
                areaId: 'area-1',
                code: 'LINE-A',
                name: 'Line A',
                description: 'Primary packaging line',
                stations: [
                  {
                    id: 'station-1',
                    tenantId: 'tenant-1',
                    lineId: 'line-1',
                    code: 'STA-A',
                    name: 'Station A',
                    description: 'Filling station',
                    position: 1,
                    assets: firstStationAssets,
                    createdAt: now,
                    updatedAt: now,
                  },
                  {
                    id: 'station-2',
                    tenantId: 'tenant-1',
                    lineId: 'line-1',
                    code: 'STA-B',
                    name: 'Station B',
                    description: 'Labeling station',
                    position: 2,
                    assets: secondStationAssets,
                    createdAt: now,
                    updatedAt: now,
                  },
                ],
                createdAt: now,
                updatedAt: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

interface SetupOptions {
  initialAssets?: AssetRecord[];
}

export interface AssetsApiController {
  exportCounts: ExportCounts;
  readonly templateDownloads: number;
  readonly importCount: number;
  getAssetIdByCode(code: string): string | undefined;
  goOfflineNext(type: MutationType): void;
  flushQueuedMutations(): AssetRecord[];
  requestExport(page: Page, format: keyof ExportCounts): Promise<void>;
  downloadTemplate(page: Page): Promise<string>;
  importAssets(page: Page, assets: AssetImportPayload[]): Promise<AssetRecord[]>;
}

export async function setupAssetsApi(page: Page, options: SetupOptions = {}): Promise<AssetsApiController> {
  const now = new Date();
  const iso = () => new Date().toISOString();

  const defaultAssets: AssetRecord[] = [
    {
      id: 'asset-1',
      code: 'PUMP-001',
      name: 'Main Pump',
      status: 'operational',
      location: 'North Plant · Line 1',
      category: 'Pumping',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 400).toISOString(),
      cost: 15000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-2',
      code: 'CMP-200',
      name: 'Line Compressor',
      status: 'maintenance',
      location: 'North Plant · Line 2',
      category: 'Compressed Air',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 300).toISOString(),
      cost: 24000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-3',
      code: 'RBT-045',
      name: 'Packaging Robot',
      status: 'maintenance',
      location: 'North Plant · Line 1',
      category: 'Robotics',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 260).toISOString(),
      cost: 95000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-4',
      code: 'CHLR-330',
      name: 'Chiller Unit',
      status: 'down',
      location: 'Utilities · Cooling Tower',
      category: 'HVAC',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 520).toISOString(),
      cost: 67000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-5',
      code: 'GEN-500',
      name: 'Backup Generator',
      status: 'operational',
      location: 'South Annex',
      category: 'Power',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 620).toISOString(),
      cost: 48000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-6',
      code: 'VAL-210',
      name: 'Steam Isolation Valve',
      status: 'operational',
      location: 'North Plant · Boiler Room',
      category: 'Steam',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 720).toISOString(),
      cost: 3200,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-7',
      code: 'SNS-812',
      name: 'Line Sensor',
      status: 'operational',
      location: 'North Plant · Line 3',
      category: 'Instrumentation',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      cost: 1100,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-8',
      code: 'FLT-150',
      name: 'Forklift',
      status: 'operational',
      location: 'Warehouse',
      category: 'Material Handling',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 850).toISOString(),
      cost: 34000,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-9',
      code: 'INS-009',
      name: 'Inspection Camera',
      status: 'operational',
      location: 'Quality Lab',
      category: 'Inspection',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120).toISOString(),
      cost: 8900,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-10',
      code: 'CVD-445',
      name: 'Conveyor Drive',
      status: 'maintenance',
      location: 'North Plant · Line 1',
      category: 'Conveyance',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 210).toISOString(),
      cost: 12500,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-11',
      code: 'CT-901',
      name: 'Cooling Tower',
      status: 'operational',
      location: 'Utilities · Cooling Tower',
      category: 'HVAC',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 960).toISOString(),
      cost: 78500,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-12',
      code: 'DRY-120',
      name: 'Air Dryer',
      status: 'operational',
      location: 'North Plant · Line 2',
      category: 'Compressed Air',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 410).toISOString(),
      cost: 5900,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-13',
      code: 'LGT-800',
      name: 'High Bay Lighting',
      status: 'retired',
      location: 'Warehouse',
      category: 'Electrical',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1450).toISOString(),
      cost: 2200,
      createdAt: iso(),
      updatedAt: iso(),
    },
    {
      id: 'asset-14',
      code: 'PRT-330',
      name: 'Print & Apply',
      status: 'operational',
      location: 'North Plant · Line 3',
      category: 'Packaging',
      purchaseDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 610).toISOString(),
      cost: 18500,
      createdAt: iso(),
      updatedAt: iso(),
    },
  ];

  const assets: AssetRecord[] = options.initialAssets ? [...options.initialAssets] : [...defaultAssets];
  let idCounter = assets.length;
  const exportCounts: ExportCounts = { csv: 0, xlsx: 0 };
  let templateDownloads = 0;
  let importCount = 0;
  const offlineOnce = new Set<MutationType>();
  const queuedMutations: QueuedMutation[] = [];

  await page.addInitScript((state) => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { user: state.user, isAuthenticated: true }, version: 0 }),
    );
    window.localStorage.setItem('auth_token', 'test-token');
  }, {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      createdAt: iso(),
      updatedAt: iso(),
    },
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill(jsonResponse({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
      createdAt: iso(),
      updatedAt: iso(),
    }));
  });

  await page.route('**/api/hierarchy/assets', async (route) => {
    await route.fulfill(jsonResponse(buildHierarchy(assets)));
  });

  await page.route('**/api/assets*', async (route, request) => {
    const url = new URL(request.url());
    const method = request.method();

    const pathname = url.pathname;

    if (pathname.endsWith('/assets/export')) {
      const format = url.searchParams.get('format') ?? 'csv';
      if (format === 'xlsx') {
        exportCounts.xlsx += 1;
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          body: 'mock-xlsx-bytes',
        });
      } else {
        exportCounts.csv += 1;
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
          body: 'id,code,name\n1,PUMP-001,Main Pump',
        });
      }
      return;
    }

    if (pathname.endsWith('/assets/template')) {
      templateDownloads += 1;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        body: 'Asset name,Asset code,Status,Location,Category',
      });
      return;
    }

    if (pathname.endsWith('/assets/import')) {
      importCount += 1;
      let payload: AssetImportPayload[] = [];
      try {
        payload = (request.postDataJSON() as AssetImportPayload[]) ?? [];
      } catch (error) {
        // ignore malformed payloads, treat as empty import
      }

      const imported: AssetRecord[] = payload.map((item) => {
        const id = `asset-${++idCounter}`;
        const timestamp = iso();
        const record: AssetRecord = {
          id,
          code: item.code,
          name: item.name,
          status: item.status ?? 'operational',
          location: item.location ?? null,
          category: item.category ?? null,
          purchaseDate: item.purchaseDate ?? null,
          cost: item.cost ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        assets.unshift(record);
        return record;
      });

      await route.fulfill(jsonResponse({ ok: true, imported }));
      return;
    }

    if (pathname.endsWith('/assets') && method === 'GET') {
      const filtered = applyFilters(assets, url.searchParams);
      const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1;
      const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '10', 10) || 10;
      const start = (pageParam - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));

      await route.fulfill(jsonResponse({
        ok: true,
        assets: slice,
        meta: {
          page: pageParam,
          pageSize,
          total,
          totalPages,
        },
      }));
      return;
    }

    if (pathname.endsWith('/assets') && method === 'POST') {
      let payload: AssetImportPayload = { code: '', name: '' };
      try {
        payload = request.postDataJSON() as AssetImportPayload;
      } catch (error) {
        await route.fulfill(errorResponse('Invalid payload', 400));
        return;
      }

      const timestamp = iso();
      const record: AssetRecord = {
        id: `asset-${++idCounter}`,
        code: payload.code,
        name: payload.name,
        status: payload.status ?? 'operational',
        location: payload.location ?? null,
        category: payload.category ?? null,
        purchaseDate: payload.purchaseDate ?? null,
        cost: payload.cost ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      if (offlineOnce.has('create')) {
        offlineOnce.delete('create');
        queuedMutations.push({
          type: 'create',
          apply: () => {
            assets.unshift(record);
            return record;
          },
        });
        await route.abort('failed');
        return;
      }

      assets.unshift(record);
      await route.fulfill(jsonResponse({ ok: true, asset: record }, 201));
      return;
    }

    const assetIdMatch = pathname.match(/\/assets\/(.+)$/);
    if (assetIdMatch) {
      const id = assetIdMatch[1];
      const index = assets.findIndex((asset) => asset.id === id);

      if (index === -1) {
        await route.fulfill(errorResponse('Not found', 404));
        return;
      }

      if (method === 'PUT') {
        let payload: AssetImportPayload = { code: assets[index].code, name: assets[index].name };
        try {
          payload = request.postDataJSON() as AssetImportPayload;
        } catch (error) {
          await route.fulfill(errorResponse('Invalid payload', 400));
          return;
        }

        const updated: AssetRecord = {
          ...assets[index],
          code: payload.code ?? assets[index].code,
          name: payload.name ?? assets[index].name,
          status: payload.status ?? assets[index].status,
          location: payload.location ?? assets[index].location,
          category: payload.category ?? assets[index].category,
          purchaseDate: payload.purchaseDate ?? assets[index].purchaseDate,
          cost: payload.cost ?? assets[index].cost,
          updatedAt: iso(),
        };

        if (offlineOnce.has('update')) {
          offlineOnce.delete('update');
          queuedMutations.push({
            type: 'update',
            apply: () => {
              assets[index] = updated;
              return updated;
            },
          });
          await route.abort('failed');
          return;
        }

        assets[index] = updated;
        await route.fulfill(jsonResponse({ ok: true, asset: updated }));
        return;
      }

      if (method === 'DELETE') {
        const [removed] = assets.splice(index, 1);
        if (offlineOnce.has('delete')) {
          offlineOnce.delete('delete');
          queuedMutations.push({
            type: 'delete',
            apply: () => {
              const stillExists = assets.some((asset) => asset.id === removed.id);
              if (!stillExists) {
                return removed;
              }
              return null;
            },
          });
          await route.abort('failed');
          return;
        }

        await route.fulfill(jsonResponse({ ok: true, asset: removed }));
        return;
      }
    }

    await route.fallback();
  });

  return {
    exportCounts,
    get templateDownloads() {
      return templateDownloads;
    },
    get importCount() {
      return importCount;
    },
    getAssetIdByCode: (code: string) => assets.find((asset) => asset.code === code)?.id,
    goOfflineNext: (type: MutationType) => {
      offlineOnce.add(type);
    },
    flushQueuedMutations: () => {
      const results: AssetRecord[] = [];
      while (queuedMutations.length > 0) {
        const mutation = queuedMutations.shift();
        if (!mutation) {
          break;
        }
        const outcome = mutation.apply();
        if (Array.isArray(outcome)) {
          results.push(...outcome.filter(Boolean) as AssetRecord[]);
        } else if (outcome) {
          results.push(outcome);
        }
      }
      return results;
    },
    requestExport: async (pageInstance: Page, format: keyof ExportCounts) => {
      await pageInstance.evaluate(async (fmt) => {
        const response = await fetch(`/api/assets/export?format=${fmt}`);
        if (!response.ok) {
          throw new Error(`Export failed for format ${fmt}`);
        }
      }, format);
    },
    downloadTemplate: async (pageInstance: Page) => {
      return pageInstance.evaluate(async () => {
        const response = await fetch('/api/assets/template');
        return response.text();
      });
    },
    importAssets: async (pageInstance: Page, payload: AssetImportPayload[]) => {
      await pageInstance.evaluate(async (records) => {
        const response = await fetch('/api/assets/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(records),
        });
        if (!response.ok) {
          throw new Error('Import failed');
        }
      }, payload);
      return payload.map((item) => assets.find((asset) => asset.code === item.code)!).filter(Boolean);
    },
  };
}
