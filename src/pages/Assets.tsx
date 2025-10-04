import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from 'lucide-react';
import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { FilterBar, type FilterDefinition } from '../components/premium/FilterBar';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';
import { useCan } from '../lib/rbac';
import { api } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';

const assetStatuses = ['operational', 'maintenance', 'down', 'retired', 'decommissioned'] as const;

type AssetStatus = (typeof assetStatuses)[number];

interface AssetFormState {
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

interface AssetsResponse {
  ok: boolean;
  assets: AssetRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const assetFormSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  code: z.string().min(1, 'Asset tag is required'),
  status: z.enum(assetStatuses, {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  location: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .pipe(z.string().max(120, 'Location is too long')),
  category: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .pipe(z.string().max(120, 'Category is too long')),
  purchaseDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Enter a valid date'),
  cost: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), 'Cost must be a number'),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

type DrawerState =
  | { mode: 'create' }
  | { mode: 'edit'; asset: AssetRecord }
  | { mode: 'view'; asset: AssetRecord }
  | null;

const columns: ProTableColumn<AssetRecord>[] = [
  { key: 'code', header: 'Tag' },
  { key: 'name', header: 'Asset' },
  { key: 'location', header: 'Location' },
  { key: 'category', header: 'Category' },
  {
    key: 'cost',
    header: 'Cost',
    accessor: (row) => (row.cost != null ? formatCurrency(row.cost) : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={row.status} />, 
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    accessor: (row) => new Date(row.updatedAt).toLocaleDateString(),
  },
];

const baseFilters: FilterDefinition[] = [
  { key: 'search', label: 'Search', type: 'search', placeholder: 'Search assets', testId: 'asset-filter-search' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: assetStatuses.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    testId: 'asset-filter-status',
  },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Plant or area', testId: 'asset-filter-location' },
  { key: 'category', label: 'Category', type: 'text', placeholder: 'Category', testId: 'asset-filter-category' },
];

const columns: ProTableColumn<AssetTableRow>[] = [
  { key: 'code', header: 'Tag' },
  { key: 'name', header: 'Asset' },
  { key: 'site', header: 'Site' },
  { key: 'area', header: 'Area' },
  { key: 'line', header: 'Line' },
  {
    label: 'Plant 1',
    count: 124,
    children: [
      { label: 'Production', count: 68 },
      { label: 'Utilities', count: 32 },
      { label: 'Packaging', count: 24 },
    ],
  },
  {
    label: 'Plant 2',
    count: 72,
    children: [
      { label: 'Production', count: 40 },
      { label: 'Utilities', count: 20 },
      { label: 'Warehouse', count: 12 },
    ],
  },
  {
    label: 'Corporate HQ',
    count: 38,
    children: [
      { label: 'Facilities', count: 18 },
      { label: 'Security', count: 6 },
      { label: 'IT Infrastructure', count: 14 },
    ],
  },
];

function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function useAssetFilters(searchParams: URLSearchParams) {
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const parsedPageSize = Number.parseInt(searchParams.get('pageSize') ?? '10', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawPageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 10;
  const pageSize = Math.min(Math.max(rawPageSize, 5), 100);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const location = searchParams.get('location') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'createdAt:desc';

  const filters = useMemo(
    () => ({ page, pageSize, search, status, location, category, sort }),
    [page, pageSize, search, status, location, category, sort],
  );

  return { filters, page, pageSize, search, status, location, category, sort };
}

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, page, pageSize, search, status, location, category, sort } = useAssetFilters(searchParams);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const view = (searchParams.get('view') as 'table' | 'cards') ?? 'table';
  const canManageAssets = useCan('manage', 'asset');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      code: '',
      status: 'operational',
      location: '',
      category: '',
      purchaseDate: '',
      cost: '',
    },
  });

  const assetsQueryKey = useMemo(() => ['assets', filters] as const, [filters]);

  const { data, isLoading, isFetching } = useQuery<AssetsResponse>({
    queryKey: assetsQueryKey,
    queryFn: async () => api.get<AssetsResponse>(`/assets${buildQueryString(filters)}`),
    keepPreviousData: true,
  });

  const assets = data?.assets ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 };

  useEffect(() => {
    setSelectedIds([]);
  }, [assets]);

  useEffect(() => {
    if (!drawerState) {
      return;
    }

    if (drawerState.mode === 'create') {
      form.reset({ name: '', code: '', status: 'operational', location: '', category: '', purchaseDate: '', cost: '' });
      return;
    }

    const asset = drawerState.asset;
    form.reset({
      name: asset.name,
      code: asset.code,
      status: asset.status,
      location: asset.location ?? '',
      category: asset.category ?? '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : '',
      cost: asset.cost != null ? String(asset.cost) : '',
    });
  }, [drawerState, form]);

  const updateSearchParam = useCallback(
    (key: string, value: string | number | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === '' || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }

        if (!['page', 'pageSize', 'view', 'sort'].includes(key)) {
          next.delete('page');
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const handleResetFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ['search', 'status', 'location', 'category', 'page'].forEach((param) => next.delete(param));
      return next;
    });
  };

  const buildPayload = (values: AssetFormValues) => ({
    name: values.name.trim(),
    code: values.code.trim(),
    status: values.status,
    location: values.location?.trim() || undefined,
    category: values.category?.trim() || undefined,
    purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : undefined,
    cost: values.cost ? Number(values.cost) : undefined,
  });

  const createAssetMutation = useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const payload = buildPayload(values);
      return api.post<{ ok: boolean; asset: AssetRecord }>('/assets', payload);
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      const optimisticAsset: AssetRecord = {
        id: `temp-${Date.now()}`,
        code: values.code,
        name: values.name,
        status: values.status,
        location: values.location || null,
        category: values.category || null,
        purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : null,
        cost: values.cost ? Number(values.cost) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return {
            ok: true,
            assets: [optimisticAsset],
            meta: { page: 1, pageSize: pageSize, total: 1, totalPages: 1 },
          };
        }

        const nextTotal = current.meta.total + 1;
        return {
          ...current,
          assets: page === 1 ? [optimisticAsset, ...current.assets].slice(0, current.meta.pageSize) : current.assets,
          meta: {
            ...current.meta,
            total: nextTotal,
            totalPages: Math.max(1, Math.ceil(nextTotal / current.meta.pageSize)),
          },
        };
      });

      return { previous, optimisticId: optimisticAsset.id };
    },
    onError: (error, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(assetsQueryKey, context.previous);
      }
      showToast({
        title: 'Unable to create asset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    },
    onSuccess: (result, _values, context) => {
      const created = result.asset;
      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return {
            ok: true,
            assets: [created],
            meta: {
              page: 1,
              pageSize: filters.pageSize,
              total: 1,
              totalPages: 1,
            },
          };
        }
        const assetsWithReplacement = current.assets.map((asset) =>
          asset.id === context?.optimisticId ? created : asset,
        );
        const alreadyExists = assetsWithReplacement.some((asset) => asset.id === created.id);
        return {
          ...current,
          assets: alreadyExists ? assetsWithReplacement : [created, ...assetsWithReplacement],
        };
      });
      showToast({
        title: 'Asset created',
        description: `${created.name} is now tracked`,
        variant: 'success',
      });
      setDrawerState(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AssetFormValues }) => {
      const payload = buildPayload(values);
      return api.put<{ ok: boolean; asset: AssetRecord }>(`/assets/${id}`, payload);
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        const updatedAssets = current.assets.map((asset) =>
          asset.id === id
            ? {
                ...asset,
                name: values.name,
                code: values.code,
                status: values.status,
                location: values.location || null,
                category: values.category || null,
                purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : null,
                cost: values.cost ? Number(values.cost) : null,
                updatedAt: new Date().toISOString(),
              }
            : asset,
        );
        return { ...current, assets: updatedAssets };
      });
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(assetsQueryKey, context.previous);
      }
      showToast({
        title: 'Unable to update asset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    },
    onSuccess: (result) => {
      const updated = result.asset;
      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          assets: current.assets.map((asset) => (asset.id === updated.id ? updated : asset)),
        };
      });
      showToast({
        title: 'Asset updated',
        description: `${updated.name} saved successfully`,
        variant: 'success',
      });
      setDrawerState(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const undoDelete = async (asset: AssetRecord) => {
    try {
      await api.post<{ ok: boolean; asset: AssetRecord }>('/assets', {
        name: asset.name,
        code: asset.code,
        status: asset.status,
        location: asset.location ?? undefined,
        category: asset.category ?? undefined,
        purchaseDate: asset.purchaseDate ?? undefined,
        cost: asset.cost ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      showToast({ title: 'Asset restored', description: `${asset.name} was restored`, variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Unable to restore asset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  };

  const deleteAssetMutation = useMutation({
    mutationFn: async (asset: AssetRecord) => {
      await api.delete<{ ok: boolean; asset: AssetRecord }>(`/assets/${asset.id}`);
      return asset;
    },
    onMutate: async (asset) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        const filteredAssets = current.assets.filter((item) => item.id !== asset.id);
        const nextTotal = Math.max(0, current.meta.total - 1);
        return {
          ...current,
          assets: filteredAssets,
          meta: {
            ...current.meta,
            total: nextTotal,
            totalPages: Math.max(1, Math.ceil(Math.max(nextTotal, 1) / current.meta.pageSize)),
          },
        };
      });
      setSelectedIds((current) => current.filter((id) => id !== asset.id));
      return { previous };
    },
    onError: (error, _asset, context) => {
      if (context?.previous) {
        queryClient.setQueryData(assetsQueryKey, context.previous);
      }
      showToast({
        title: 'Unable to delete asset',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    },
    onSuccess: (asset) => {
      showToast({
        title: 'Asset deleted',
        description: `${asset.name} was deleted`,
        variant: 'default',
        action: {
          label: 'Undo',
          onClick: () => void undoDelete(asset),
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (assetsToDelete: AssetRecord[]) => {
      await Promise.all(assetsToDelete.map((asset) => api.delete<{ ok: boolean; asset: AssetRecord }>(`/assets/${asset.id}`)));
      return assetsToDelete;
    },
    onMutate: async (assetsToDelete) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse>(assetsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        const ids = new Set(assetsToDelete.map((asset) => asset.id));
        const filteredAssets = current.assets.filter((asset) => !ids.has(asset.id));
        const nextTotal = Math.max(0, current.meta.total - assetsToDelete.length);
        return {
          ...current,
          assets: filteredAssets,
          meta: {
            ...current.meta,
            total: nextTotal,
            totalPages: Math.max(1, Math.ceil(Math.max(nextTotal, 1) / current.meta.pageSize)),
          },
        };
      });
      setSelectedIds([]);
      return { previous };
    },
    onError: (error, _assets, context) => {
      if (context?.previous) {
        queryClient.setQueryData(assetsQueryKey, context.previous);
      }
      showToast({
        title: 'Bulk delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    },
    onSuccess: (deletedAssets) => {
      showToast({
        title: 'Assets deleted',
        description: `${deletedAssets.length} assets removed`,
        variant: 'default',
        action: {
          label: 'Undo',
          onClick: () => {
            deletedAssets.forEach((asset) => {
              void undoDelete(asset);
            });
          },
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const onSubmit = (values: AssetFormValues) => {
    if (drawerState?.mode === 'edit' && drawerState.asset) {
      updateAssetMutation.mutate({ id: drawerState.asset.id, values });
      return;
    }

    createAssetMutation.mutate(values);
  };

  const openCreateDrawer = () => {
    setDrawerState({ mode: 'create' });
  };

  const openEditDrawer = (asset: AssetRecord) => {
    setDrawerState({ mode: 'edit', asset });
  };

  const openViewDrawer = (asset: AssetRecord) => {
    setDrawerState({ mode: 'view', asset });
  };

  const closeDrawer = () => {
    setDrawerState(null);
  };

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds],
  );

  const disableBulkDelete = selectedIds.length === 0 || !canManageAssets || bulkDeleteMutation.isLoading;
  const disableCreateOrEdit = createAssetMutation.isLoading || updateAssetMutation.isLoading;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-brand" />
          <div>
            <h2 className="text-lg font-semibold text-fg">Asset catalog</h2>
            <p className="text-sm text-mutedfg">Explore locations, tags, and hierarchies.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-mutedfg" />
          <input
            value={search}
            onChange={(event) => updateSearchParam('search', event.target.value)}
            placeholder="Search assets"
            className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
            data-testid="asset-search-input"
          />
          {assetsFetching && (
            <Loader2 className="absolute right-4 top-3 h-4 w-4 animate-spin text-mutedfg" />
          )}
        </div>
        <button
          className="w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          type="button"
          data-testid="asset-toolbar-saved-views"
        >
          <SlidersHorizontal className="mr-2 inline h-4 w-4" /> Saved views
        </button>
        <div className="space-y-4">
          {hierarchyLoading && (
            <div className="flex items-center gap-2 text-sm text-mutedfg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading hierarchy…
            </div>
          )}
          {!hierarchyLoading && hierarchy.length === 0 && (
            <p className="text-sm text-mutedfg">No hierarchy data available yet.</p>
          )}
          {hierarchy.map((site) => {
            const siteAssetCount = countAssetsInSite(site);
            return (
              <div key={site.id} className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-fg">
                  <span>{site.name}</span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-mutedfg">{siteAssetCount}</span>
                </div>
                <div className="space-y-2 pl-3 text-sm text-mutedfg">
                  {site.areas.map((area) => {
                    const areaCount = countAssetsInArea(area);
                    return (
                      <div key={area.id} className="space-y-2">
                        <div className="flex items-center justify-between font-medium text-fg">
                          <span>{area.name}</span>
                          <span>{areaCount}</span>
                        </div>
                        <div className="space-y-2 pl-3">
                          {area.lines.map((line) => {
                            const lineCount = countAssetsInLine(line);
                            return (
                              <div key={line.id} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-mutedfg">
                                  <span>{line.name}</span>
                                  <span>{lineCount}</span>
                                </div>
                                <ul className="space-y-1 pl-2">
                                  {line.stations.map((station) => (
                                    <li key={station.id} className="space-y-1">
                                      <div className="text-xs font-medium text-mutedfg">
                                        {station.name} ({station.assets.length})
                                      </div>
                                      <ul className="space-y-1 pl-3">
                                        {station.assets.map((asset) => (
                                          <li key={asset.id}>
                                            <button
                                              type="button"
                                              onClick={() => handleAssetSelect(asset.id)}
                                              className={cn(
                                                'w-full rounded-xl px-2 py-1 text-left text-xs transition',
                                                selectedAssetId === asset.id
                                                  ? 'bg-brand/10 text-brand'
                                                  : 'text-mutedfg hover:bg-muted/70 hover:text-fg',
                                              )}
                                            >
                                              {asset.code} · {asset.name}
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Assets</h1>
            <p className="mt-2 text-sm text-mutedfg">Monitor lifecycle state, compliance, and investments for every asset.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-border bg-white/70 p-1 text-xs font-semibold text-mutedfg shadow-inner">
              <button
                type="button"
                className={cn('flex items-center gap-2 rounded-full px-4 py-1', view === 'table' ? 'bg-brand text-white shadow' : '')}
                onClick={() => updateSearchParam('view', 'table')}
                data-testid="asset-view-table"
              >
                <List className="h-4 w-4" /> Table
              </button>
              <button
                type="button"
                className={cn('flex items-center gap-2 rounded-full px-4 py-1', view === 'cards' ? 'bg-brand text-white shadow' : '')}
                onClick={() => updateSearchParam('view', 'cards')}
                data-testid="asset-view-cards"
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              type="button"
              data-testid="asset-toolbar-advanced-filters"
            >
              <Filter className="h-4 w-4" /> Advanced filters
            </button>
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed"
              type="button"
              disabled={!canManageAssets}
              title={canManageAssets ? undefined : 'You need asset manager permissions'}
              data-testid="asset-toolbar-create"
            >
              <Plus className="h-4 w-4" /> Add asset
            </button>
          </div>
        </header>
        <FilterBar
          filters={baseFilters}
          values={{ search, status, location, category }}
          onChange={(key, value) => updateSearchParam(key, value)}
          onReset={handleResetFilters}
          sticky={false}
          actions={
            <Button
              variant="destructive"
              size="sm"
              disabled={disableBulkDelete}
              onClick={() => bulkDeleteMutation.mutate(selectedAssets)}
              title={canManageAssets ? undefined : 'You need asset manager permissions'}
              data-testid="asset-toolbar-bulk-delete"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete selected
            </Button>
          }
        />
        {view === 'table' ? (
          <ProTable
            data={assets}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading || isFetching}
            onRowClick={openViewDrawer}
            onSelectionChange={(ids) => setSelectedIds(ids)}
            rowActions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-xs text-mutedfg hover:text-brand"
                  onClick={(event) => {
                    event.stopPropagation();
                    openViewDrawer(row);
                  }}
                  data-testid={`asset-row-view-${row.id}`}
                >
                  <Eye className="mr-1 inline h-3 w-3" /> View
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-xs text-mutedfg hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditDrawer(row);
                  }}
                  disabled={!canManageAssets}
                  title={canManageAssets ? undefined : 'You need asset manager permissions'}
                  data-testid={`asset-row-edit-${row.id}`}
                >
                  <Pencil className="mr-1 inline h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-xs text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteAssetMutation.mutate(row);
                  }}
                  disabled={!canManageAssets}
                  title={canManageAssets ? undefined : 'You need asset manager permissions'}
                  data-testid={`asset-row-delete-${row.id}`}
                >
                  <Trash2 className="mr-1 inline h-3 w-3" /> Delete
                </button>
              </div>
            )}
            emptyState={<div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-mutedfg">No assets match your filters.</div>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <DataBadge status={asset.status} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{asset.name}</h3>
                <p className="text-sm text-mutedfg">{asset.code}</p>
                <div className="mt-4 space-y-2 text-sm text-mutedfg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{asset.location ?? 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{asset.category ?? 'Uncategorized'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>{asset.cost != null ? formatCurrency(asset.cost) : 'No cost'}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-mutedfg">
                  <span>Updated</span>
                  <span className="font-semibold text-fg">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openViewDrawer(asset)} data-testid={`asset-card-view-${asset.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDrawer(asset)}
                    disabled={!canManageAssets}
                    title={canManageAssets ? undefined : 'You need asset manager permissions'}
                    data-testid={`asset-card-edit-${asset.id}`}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteAssetMutation.mutate(asset)}
                    disabled={!canManageAssets}
                    title={canManageAssets ? undefined : 'You need asset manager permissions'}
                    data-testid={`asset-card-delete-${asset.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => handleAssetSelect(asset.id)}
                  className="mt-4 w-full rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-brand transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Inspect lifecycle
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-surface px-5 py-4 text-sm text-mutedfg">
          <div>
            Showing {(page - 1) * meta.pageSize + Math.min(1, assets.length)}-
            {(page - 1) * meta.pageSize + assets.length} of {meta.total} assets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateSearchParam('page', Math.max(page - 1, 1))}
              data-testid="asset-pagination-prev"
            >
              Previous
            </Button>
            <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">
              Page {page} of {Math.max(meta.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => updateSearchParam('page', Math.min(page + 1, meta.totalPages))}
              data-testid="asset-pagination-next"
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      <SlideOver
        open={drawerState !== null}
        onClose={closeDrawer}
        title={drawerState?.mode === 'edit' ? `Edit ${drawerState.asset.name}` : drawerState?.mode === 'view' ? drawerState.asset.name : 'Register asset'}
        description={drawerState?.mode === 'view' ? 'Asset profile details' : 'Capture essential metadata to keep your asset registry synchronized.'}
      >
        {drawerState?.mode === 'view' && drawerState.asset ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-mutedfg">Asset name</h3>
              <p className="mt-1 text-base text-fg">{drawerState.asset.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-mutedfg">Asset tag</h3>
              <p className="mt-1 text-base text-fg">{drawerState.asset.code}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Location</h3>
                <p className="mt-1 text-base text-fg">{drawerState.asset.location ?? 'Unassigned'}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Category</h3>
                <p className="mt-1 text-base text-fg">{drawerState.asset.category ?? 'Uncategorized'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Status</h3>
                <DataBadge status={drawerState.asset.status} className="mt-2" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Cost</h3>
                <p className="mt-1 text-base text-fg">
                  {drawerState.asset.cost != null ? formatCurrency(drawerState.asset.cost) : 'No cost recorded'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Purchase date</h3>
                <p className="mt-1 text-base text-fg">
                  {drawerState.asset.purchaseDate ? new Date(drawerState.asset.purchaseDate).toLocaleDateString() : 'Not captured'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-mutedfg">Updated</h3>
                <p className="mt-1 text-base text-fg">{new Date(drawerState.asset.updatedAt).toLocaleString()}</p>
              </div>
            </div>
            {canManageAssets && (
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerState({ mode: 'edit', asset: drawerState.asset })}
                  data-testid="asset-view-edit"
                >
                  Edit asset
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAssetMutation.mutate(drawerState.asset)}
                  data-testid="asset-view-delete"
                >
                  Delete asset
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <label className="block text-sm font-semibold text-mutedfg">
              Asset name
              <input
                {...form.register('name')}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-name"
              />
              {form.formState.errors.name && <span className="mt-1 block text-xs text-danger">{form.formState.errors.name.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Asset tag
              <input
                {...form.register('code')}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-code"
              />
              {form.formState.errors.code && <span className="mt-1 block text-xs text-danger">{form.formState.errors.code.message}</span>}
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Location
                <input
                  {...form.register('location')}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-location"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Category
                <input
                  {...form.register('category')}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-category"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Status
                <select
                  {...form.register('status')}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-status"
                >
                  {assetStatuses.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Cost
                <input
                  {...form.register('cost')}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-cost"
                />
                {form.formState.errors.cost && <span className="mt-1 block text-xs text-danger">{form.formState.errors.cost.message}</span>}
              </label>
            </div>
            <label className="block text-sm font-semibold text-mutedfg">
              Purchase date
              <input
                type="date"
                {...form.register('purchaseDate')}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-purchaseDate"
              />
              {form.formState.errors.purchaseDate && (
                <span className="mt-1 block text-xs text-danger">{form.formState.errors.purchaseDate.message}</span>
              )}
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDrawer} data-testid="asset-form-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                className="shadow-lg"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-submit"
              >
                {drawerState?.mode === 'edit' ? 'Save changes' : 'Save asset'}
              </Button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}
