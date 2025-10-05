import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
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
import type { AssetTree } from '../../shared/types/asset';
import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { FilterBar, type FilterDefinition } from '../components/premium/FilterBar';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast';
import { useCan } from '../lib/rbac';
import { api } from '../lib/api';
import {
  assetStatuses,
  type AssetRecord,
  type AssetsResponse,
  type AssetQuery,
  type SaveAssetPayload,
  createAsset as createAssetApi,
  updateAsset as updateAssetApi,
  deleteAsset as deleteAssetApi,
  listAssets,
} from '../lib/assets';
import { cn, formatCurrency } from '../lib/utils';

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

const assetColumns: ProTableColumn<AssetRecord>[] = [
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
  { key: 'category', label: 'Category', type: 'text', placeholder: 'Category', testId: 'asset-filter-category' },
];

type HierarchyAssetPreview = Pick<AssetRecord, 'id' | 'code' | 'name'>;

interface HierarchyStation {
  id: string;
  name: string;
  assets: HierarchyAssetPreview[];
}

interface HierarchyLine {
  id: string;
  name: string;
  stations: HierarchyStation[];
}

interface HierarchyArea {
  id: string;
  name: string;
  lines: HierarchyLine[];
}

interface HierarchySite {
  id: string;
  name: string;
  areas: HierarchyArea[];
}


const countAssetsInStation = (station: HierarchyStation) => station.assets.length;

const countAssetsInLine = (line: HierarchyLine) =>
  line.stations.reduce((total, station) => total + countAssetsInStation(station), 0);

const countAssetsInArea = (area: HierarchyArea) =>
  area.lines.reduce((total, line) => total + countAssetsInLine(line), 0);

const countAssetsInSite = (site: HierarchySite) =>
  site.areas.reduce((total, area) => total + countAssetsInArea(area), 0);

interface LocationPopoverOption {
  id: string;
  name: string;
  count: number;
}

interface LocationLevelSelectorProps {
  label: string;
  placeholder: string;
  options: LocationPopoverOption[];
  onSelect: (option: LocationPopoverOption | null) => void;
  disabled?: boolean;
  selected?: LocationPopoverOption | null;
  testId?: string;
}

function LocationLevelSelector({
  label,
  placeholder,
  options,
  onSelect,
  disabled = false,
  selected = null,
  testId,
}: LocationLevelSelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        popoverRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div className="relative">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mutedfg">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className={cn(
          'flex min-w-[200px] items-center justify-between gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-left text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg',
          disabled ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none' : '',
        )}
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{options.length}</span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 w-[260px] rounded-3xl border border-border bg-surface shadow-2xl"
          role="listbox"
        >
          <div className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wide text-mutedfg">{label} options</div>
          <div className="max-h-64 space-y-1 overflow-auto px-2 pb-3">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm text-mutedfg transition hover:bg-muted/70 hover:text-fg"
            >
              <span>All {label.toLowerCase()}s</span>
            </button>
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition',
                  selected?.id === option.id
                    ? 'bg-brand/10 text-brand'
                    : 'text-fg hover:bg-muted/70 hover:text-fg',
                )}
              >
                <span className="truncate">{option.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{option.count}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-mutedfg">No {label.toLowerCase()}s available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface HierarchyBreadcrumbProps {
  site?: HierarchySite | null;
  area?: HierarchyArea | null;
  line?: HierarchyLine | null;
  onNavigate: (level: 'root' | 'site' | 'area') => void;
}

function HierarchyBreadcrumb({ site, area, line, onNavigate }: HierarchyBreadcrumbProps) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wide text-mutedfg">
      <button
        type="button"
        onClick={() => onNavigate('root')}
        className="rounded-full px-3 py-1 transition hover:bg-muted/70 hover:text-fg"
      >
        All locations
      </button>
      {site && (
        <>
          <span>/</span>
          <button
            type="button"
            onClick={() => onNavigate('site')}
            className="rounded-full px-3 py-1 transition hover:bg-muted/70 hover:text-fg"
          >
            {site.name}
          </button>
        </>
      )}
      {area && (
        <>
          <span>/</span>
          <button
            type="button"
            onClick={() => onNavigate('area')}
            className="rounded-full px-3 py-1 transition hover:bg-muted/70 hover:text-fg"
          >
            {area.name}
          </button>
        </>
      )}
      {line && (
        <>
          <span>/</span>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{line.name}</span>
        </>
      )}
    </nav>
  );
}

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
  const siteId = searchParams.get('siteId') ?? '';
  const areaId = searchParams.get('areaId') ?? '';
  const lineId = searchParams.get('lineId') ?? '';

  const filters = useMemo<AssetQuery>(
    () => ({ page, pageSize, search, status, location, category, sort }),
    [page, pageSize, search, status, location, category, sort],
  );

  return { filters, page, pageSize, search, status, location, category, sort, siteId, areaId, lineId };
}

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, page, pageSize, search, status, location, category, siteId, areaId, lineId } =
    useAssetFilters(searchParams);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
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
    queryFn: () => listAssets(filters),
    keepPreviousData: true,
  });

  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery<AssetTree>({
    queryKey: ['asset-hierarchy'],
    queryFn: () => api.get<AssetTree>('/hierarchy/assets'),
  });

  const hierarchy = hierarchyData?.sites ?? [];

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
      ['search', 'status', 'location', 'category', 'siteId', 'areaId', 'lineId', 'page'].forEach((param) =>
        next.delete(param),
      );
      return next;
    });
  };

  const setHierarchySelection = useCallback(
    (nextSiteId: string | null, nextAreaId: string | null, nextLineId: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        const selectedSite = nextSiteId
          ? hierarchy.find((site) => site.id === nextSiteId) ?? null
          : null;
        const selectedArea =
          selectedSite && nextAreaId
            ? selectedSite.areas.find((area) => area.id === nextAreaId) ?? null
            : null;
        const selectedLine =
          selectedArea && nextLineId
            ? selectedArea.lines.find((line) => line.id === nextLineId) ?? null
            : null;

        const apply = (key: string, value: string | null) => {
          if (!value) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        };

        apply('siteId', selectedSite ? selectedSite.id : null);
        apply('areaId', selectedArea ? selectedArea.id : null);
        apply('lineId', selectedLine ? selectedLine.id : null);

        const locationLabel = selectedLine?.name ?? selectedArea?.name ?? selectedSite?.name ?? null;
        apply('location', locationLabel);

        next.delete('page');
        return next;
      });
    },
    [hierarchy, setSearchParams],
  );

  const selectedSite = useMemo(
    () => hierarchy.find((site) => site.id === siteId) ?? null,
    [hierarchy, siteId],
  );

  const selectedArea = useMemo(() => {
    if (!selectedSite) {
      return null;
    }

    return selectedSite.areas.find((area) => area.id === areaId) ?? null;
  }, [areaId, selectedSite]);

  const selectedLine = useMemo(() => {
    if (!selectedArea) {
      return null;
    }

    return selectedArea.lines.find((line) => line.id === lineId) ?? null;
  }, [lineId, selectedArea]);

  const siteOptions = useMemo<LocationPopoverOption[]>(
    () =>
      hierarchy.map((site) => ({
        id: site.id,
        name: site.name,
        count: countAssetsInSite(site),
      })),
    [hierarchy],
  );

  const areaOptions = useMemo<LocationPopoverOption[]>(() => {
    if (!selectedSite) {
      return [];
    }

    return selectedSite.areas.map((area) => ({
      id: area.id,
      name: area.name,
      count: countAssetsInArea(area),
    }));
  }, [selectedSite]);

  const lineOptions = useMemo<LocationPopoverOption[]>(() => {
    if (!selectedArea) {
      return [];
    }

    return selectedArea.lines.map((line) => ({
      id: line.id,
      name: line.name,
      count: countAssetsInLine(line),
    }));
  }, [selectedArea]);

  const selectedSiteOption = useMemo<LocationPopoverOption | null>(() => {
    if (!selectedSite) {
      return null;
    }

    return {
      id: selectedSite.id,
      name: selectedSite.name,
      count: countAssetsInSite(selectedSite),
    };
  }, [selectedSite]);

  const selectedAreaOption = useMemo<LocationPopoverOption | null>(() => {
    if (!selectedArea) {
      return null;
    }

    return {
      id: selectedArea.id,
      name: selectedArea.name,
      count: countAssetsInArea(selectedArea),
    };
  }, [selectedArea]);

  const selectedLineOption = useMemo<LocationPopoverOption | null>(() => {
    if (!selectedLine) {
      return null;
    }

    return {
      id: selectedLine.id,
      name: selectedLine.name,
      count: countAssetsInLine(selectedLine),
    };
  }, [selectedLine]);

  useEffect(() => {
    const expectedLocation = selectedLine?.name ?? selectedArea?.name ?? selectedSite?.name ?? '';
    if (!expectedLocation) {
      return;
    }

    if (location === expectedLocation) {
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('location', expectedLocation);
      next.delete('page');
      return next;
    });
  }, [location, selectedArea, selectedLine, selectedSite, setSearchParams]);

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
      return createAssetApi(payload);
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

      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
        if (!current) {
          return {
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
    onSuccess: (created, _values, context) => {
      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
        if (!current) {
          return {
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
      return updateAssetApi(id, payload);
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
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
    onSuccess: (updated) => {
      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
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
      const payload: SaveAssetPayload = {
        name: asset.name,
        code: asset.code,
        status: asset.status,
        location: asset.location ?? undefined,
        category: asset.category ?? undefined,
        purchaseDate: asset.purchaseDate ?? undefined,
        cost: asset.cost ?? undefined,
      };
      await createAssetApi(payload);
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
    mutationFn: async (asset: AssetRecord) => deleteAssetApi(asset.id),
    onMutate: async (asset) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
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
    mutationFn: async (assetsToDelete: AssetRecord[]) =>
      Promise.all(assetsToDelete.map((asset) => deleteAssetApi(asset.id))),
    onMutate: async (assetsToDelete) => {
      await queryClient.cancelQueries({ queryKey: assetsQueryKey });
      const previous = queryClient.getQueryData<AssetsResponse>(assetsQueryKey);
      queryClient.setQueryData<AssetsResponse | undefined>(assetsQueryKey, (current) => {
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

  const handleAssetSelect = useCallback((id: string) => {
    setSelectedAssetId(id);
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="p-6 space-y-6 border shadow-xl rounded-3xl border-border bg-surface">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-brand" />
          <div>
            <h2 className="text-lg font-semibold text-fg">Asset catalog</h2>
            <p className="text-sm text-mutedfg">Explore locations, tags, and hierarchies.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute w-4 h-4 pointer-events-none left-4 top-3 text-mutedfg" />
          <input
            value={search}
            onChange={(event) => updateSearchParam('search', event.target.value)}
            placeholder="Search assets"
            className="w-full px-10 py-3 text-sm transition bg-white border shadow-inner outline-none rounded-2xl border-border text-fg focus:ring-2 focus:ring-brand"
            data-testid="asset-search-input"
          />
          {isFetching && (
            <Loader2 className="absolute w-4 h-4 right-4 top-3 animate-spin text-mutedfg" />
          )}
        </div>
        <button
          className="w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          type="button"
          data-testid="asset-toolbar-saved-views"
        >
          <SlidersHorizontal className="inline w-4 h-4 mr-2" /> Saved views
        </button>
        <div className="space-y-4">
          {hierarchyLoading && (
            <div className="flex items-center gap-2 text-sm text-mutedfg">
              <Loader2 className="w-4 h-4 animate-spin" />
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
                  <span className="px-3 py-1 text-xs rounded-full bg-muted text-mutedfg">{siteAssetCount}</span>
                </div>
                <div className="pl-3 space-y-2 text-sm text-mutedfg">
                  {site.areas.map((area) => {
                    const areaCount = countAssetsInArea(area);
                    return (
                      <div key={area.id} className="space-y-2">
                        <div className="flex items-center justify-between font-medium text-fg">
                          <span>{area.name}</span>
                          <span>{areaCount}</span>
                        </div>
                        <div className="pl-3 space-y-2">
                          {area.lines.map((line) => {
                            const lineCount = countAssetsInLine(line);
                            return (
                              <div key={line.id} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold tracking-wide uppercase text-mutedfg">
                                  <span>{line.name}</span>
                                  <span>{lineCount}</span>
                                </div>
                                <ul className="pl-2 space-y-1">
                                  {line.stations.map((station) => (
                                    <li key={station.id} className="space-y-1">
                                      <div className="text-xs font-medium text-mutedfg">
                                        {station.name} ({station.assets?.length ?? 0})
                                      </div>
                                      <ul className="pl-3 space-y-1">
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
            <div className="flex p-1 text-xs font-semibold border rounded-full shadow-inner border-border bg-white/70 text-mutedfg">
              <button
                type="button"
                className={cn('flex items-center gap-2 rounded-full px-4 py-1', view === 'table' ? 'bg-brand text-white shadow' : '')}
                onClick={() => updateSearchParam('view', 'table')}
                data-testid="asset-view-table"
              >
                <List className="w-4 h-4" /> Table
              </button>
              <button
                type="button"
                className={cn('flex items-center gap-2 rounded-full px-4 py-1', view === 'cards' ? 'bg-brand text-white shadow' : '')}
                onClick={() => updateSearchParam('view', 'cards')}
                data-testid="asset-view-cards"
              >
                <LayoutGrid className="w-4 h-4" /> Cards
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              type="button"
              data-testid="asset-toolbar-advanced-filters"
            >
              <Filter className="w-4 h-4" /> Advanced filters
            </button>
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed"
              type="button"
              disabled={!canManageAssets}
              title={canManageAssets ? undefined : 'You need asset manager permissions'}
              data-testid="asset-toolbar-create"
            >
              <Plus className="w-4 h-4" /> Add asset
            </button>
          </div>
        </header>
        <div className="rounded-3xl border border-border bg-surface px-5 py-4 shadow-sm">
          <div className="flex flex-wrap gap-6">
            <LocationLevelSelector
              label="Site"
              placeholder="All sites"
              options={siteOptions}
              selected={selectedSiteOption}
              onSelect={(option) => setHierarchySelection(option?.id ?? null, null, null)}
              testId="asset-filter-site"
            />
            <LocationLevelSelector
              label="Area"
              placeholder={selectedSite ? 'All areas' : 'Select a site first'}
              options={areaOptions}
              selected={selectedAreaOption}
              onSelect={(option) =>
                setHierarchySelection(selectedSite ? selectedSite.id : null, option?.id ?? null, null)
              }
              disabled={!selectedSite}
              testId="asset-filter-area"
            />
            <LocationLevelSelector
              label="Line"
              placeholder={selectedArea ? 'All lines' : 'Select an area first'}
              options={lineOptions}
              selected={selectedLineOption}
              onSelect={(option) =>
                setHierarchySelection(
                  selectedSite ? selectedSite.id : null,
                  selectedArea ? selectedArea.id : null,
                  option?.id ?? null,
                )
              }
              disabled={!selectedArea}
              testId="asset-filter-line"
            />
          </div>
          <div className="mt-4">
            <HierarchyBreadcrumb
              site={selectedSite}
              area={selectedArea}
              line={selectedLine}
              onNavigate={(level) => {
                if (level === 'root') {
                  setHierarchySelection(null, null, null);
                } else if (level === 'site' && selectedSite) {
                  setHierarchySelection(selectedSite.id, null, null);
                } else if (level === 'area' && selectedSite && selectedArea) {
                  setHierarchySelection(selectedSite.id, selectedArea.id, null);
                }
              }}
            />
          </div>
        </div>
        <FilterBar
          filters={baseFilters}
          values={{ search, status, category }}
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
              <Trash2 className="w-4 h-4 mr-2" /> Delete selected
            </Button>
          }
        />
        {view === 'table' ? (
          <ProTable
            data={assets}
            columns={assetColumns}
            getRowId={(row) => row.id}
            loading={isLoading || isFetching}
            onRowClick={openViewDrawer}
            onSelectionChange={(ids) => setSelectedIds(ids)}
            rowActions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs border rounded-full border-border text-mutedfg hover:text-brand"
                  onClick={(event) => {
                    event.stopPropagation();
                    openViewDrawer(row);
                  }}
                  data-testid={`asset-row-view-${row.id}`}
                >
                  <Eye className="inline w-3 h-3 mr-1" /> View
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs border rounded-full border-border text-mutedfg hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditDrawer(row);
                  }}
                  disabled={!canManageAssets}
                  title={canManageAssets ? undefined : 'You need asset manager permissions'}
                  data-testid={`asset-row-edit-${row.id}`}
                >
                  <Pencil className="inline w-3 h-3 mr-1" /> Edit
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs border rounded-full border-border text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteAssetMutation.mutate(row);
                  }}
                  disabled={!canManageAssets}
                  title={canManageAssets ? undefined : 'You need asset manager permissions'}
                  data-testid={`asset-row-delete-${row.id}`}
                >
                  <Trash2 className="inline w-3 h-3 mr-1" /> Delete
                </button>
              </div>
            )}
            emptyState={<div className="p-10 text-sm text-center border rounded-3xl border-border bg-surface text-mutedfg">No assets match your filters.</div>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="p-6 transition border shadow-xl rounded-3xl border-border bg-surface hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-brand/10 text-brand">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <DataBadge status={asset.status} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{asset.name}</h3>
                <p className="text-sm text-mutedfg">{asset.code}</p>
                <div className="mt-4 space-y-2 text-sm text-mutedfg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{asset.location ?? 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{asset.category ?? 'Uncategorized'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    <span>{asset.cost != null ? formatCurrency(asset.cost) : 'No cost'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs tracking-wide uppercase text-mutedfg">
                  <span>Updated</span>
                  <span className="font-semibold text-fg">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <Button size="sm" variant="secondary" onClick={() => openViewDrawer(asset)} data-testid={`asset-card-view-${asset.id}`}>
                    <Eye className="w-4 h-4 mr-2" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDrawer(asset)}
                    disabled={!canManageAssets}
                    title={canManageAssets ? undefined : 'You need asset manager permissions'}
                    data-testid={`asset-card-edit-${asset.id}`}
                  >
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteAssetMutation.mutate(asset)}
                    disabled={!canManageAssets}
                    title={canManageAssets ? undefined : 'You need asset manager permissions'}
                    data-testid={`asset-card-delete-${asset.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
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
        <div className="flex items-center justify-between px-5 py-4 text-sm border rounded-3xl border-border bg-surface text-mutedfg">
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
            <span className="text-xs font-semibold tracking-wide uppercase text-mutedfg">
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
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-name"
              />
              {form.formState.errors.name && <span className="block mt-1 text-xs text-danger">{form.formState.errors.name.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Asset tag
              <input
                {...form.register('code')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-code"
              />
              {form.formState.errors.code && <span className="block mt-1 text-xs text-danger">{form.formState.errors.code.message}</span>}
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Location
                <input
                  {...form.register('location')}
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-location"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Category
                <input
                  {...form.register('category')}
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
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
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
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
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                  disabled={disableCreateOrEdit}
                  data-testid="asset-form-cost"
                />
                {form.formState.errors.cost && <span className="block mt-1 text-xs text-danger">{form.formState.errors.cost.message}</span>}
              </label>
            </div>
            <label className="block text-sm font-semibold text-mutedfg">
              Purchase date
              <input
                type="date"
                {...form.register('purchaseDate')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                disabled={disableCreateOrEdit}
                data-testid="asset-form-purchaseDate"
              />
              {form.formState.errors.purchaseDate && (
                <span className="block mt-1 text-xs text-danger">{form.formState.errors.purchaseDate.message}</span>
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
