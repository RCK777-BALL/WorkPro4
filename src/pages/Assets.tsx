import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from 'lucide-react';

import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { FilterBar, type FilterDefinition } from '../components/premium/FilterBar';
import { api } from '../lib/api';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import type { AssetLifecycle, AssetStatus, AssetSummary, AssetTree } from '../../shared/types/asset';

interface BomLineDraft {
  id?: string;
  clientId: string;
  reference: string;
  description: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface AssetFormState {
  id: string;
  code: string;
  name: string;
  status: AssetStatus;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  purchaseDate: string;
  commissionedAt: string;
  warrantyExpiresAt: string;
  warrantyProvider: string;
  warrantyContact: string;
  warrantyNotes: string;
  cost: string;
  criticality: string;
  bomLines: BomLineDraft[];
}

interface AssetTableRow {
  id: string;
  code: string;
  name: string;
  status: AssetStatus;
  siteId: string;
  site: string;
  area: string;
  line: string;
  station: string;
  manufacturer: string;
  criticalityBadge: 'low' | 'medium' | 'high';
  warrantyExpires: string;
}

const statusOptions: { value: AssetStatus; label: string }[] = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'down', label: 'Down' },
  { value: 'retired', label: 'Retired' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const criticalityOptions = [
  { value: '1', label: 'Low' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'High' },
];

const emptyDraft: AssetFormState = {
  id: '',
  code: '',
  name: '',
  status: 'operational',
  manufacturer: '',
  modelNumber: '',
  serialNumber: '',
  purchaseDate: '',
  commissionedAt: '',
  warrantyExpiresAt: '',
  warrantyProvider: '',
  warrantyContact: '',
  warrantyNotes: '',
  cost: '',
  criticality: '3',
  bomLines: [],
};

const columns: ProTableColumn<AssetTableRow>[] = [
  { key: 'code', header: 'Tag' },
  { key: 'name', header: 'Asset' },
  { key: 'site', header: 'Site' },
  { key: 'area', header: 'Area' },
  { key: 'line', header: 'Line' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={row.status} />,
  },
  {
    key: 'criticalityBadge',
    header: 'Criticality',
    accessor: (row) => <DataBadge status={row.criticalityBadge} />,
  },
  { key: 'warrantyExpires', header: 'Warranty', accessor: (row) => row.warrantyExpires || '—' },
];

function getCriticalityBadge(value: number | null | undefined): 'low' | 'medium' | 'high' {
  if (value != null && value <= 1) return 'low';
  if (value != null && value >= 3) return 'high';
  return 'medium';
}

function createClientId(): string {
  return `bom-${Math.random().toString(36).slice(2, 10)}`;
}

function toDraft(lifecycle: AssetLifecycle): AssetFormState {
  return {
    id: lifecycle.id,
    code: lifecycle.code,
    name: lifecycle.name,
    status: lifecycle.status,
    manufacturer: lifecycle.manufacturer ?? '',
    modelNumber: lifecycle.modelNumber ?? '',
    serialNumber: lifecycle.serialNumber ?? '',
    purchaseDate: lifecycle.purchaseDate ? lifecycle.purchaseDate.slice(0, 10) : '',
    commissionedAt: lifecycle.commissionedAt ? lifecycle.commissionedAt.slice(0, 10) : '',
    warrantyExpiresAt: lifecycle.warrantyExpiresAt ? lifecycle.warrantyExpiresAt.slice(0, 10) : '',
    warrantyProvider: lifecycle.warrantyProvider ?? '',
    warrantyContact: lifecycle.warrantyContact ?? '',
    warrantyNotes: lifecycle.warrantyNotes ?? '',
    cost: lifecycle.cost != null ? String(lifecycle.cost) : '',
    criticality: String(lifecycle.criticality ?? 3),
    bomLines: lifecycle.bomLines.map((line) => ({
      id: line.id,
      clientId: line.id ?? createClientId(),
      reference: line.reference,
      description: line.description,
      quantity: line.quantity != null ? String(line.quantity) : '',
      unit: line.unit ?? '',
      notes: line.notes ?? '',
    })),
  };
}

function buildTableRows(assets: AssetSummary[]): AssetTableRow[] {
  return assets.map((asset) => ({
    id: asset.id,
    code: asset.code,
    name: asset.name,
    status: asset.status,
    siteId: asset.site?.id ?? 'unassigned',
    site: asset.site?.name ?? 'Unassigned',
    area: asset.area?.name ?? '—',
    line: asset.line?.name ?? '—',
    station: asset.station?.name ?? '—',
    manufacturer: asset.manufacturer ?? '—',
    criticalityBadge: getCriticalityBadge(asset.criticality),
    warrantyExpires: asset.warrantyExpiresAt ? formatDate(asset.warrantyExpiresAt) : '—',
  }));
}

function countAssetsInStation(station: AssetTree['sites'][number]['areas'][number]['lines'][number]['stations'][number]): number {
  return station.assets.length;
}

function countAssetsInLine(line: AssetTree['sites'][number]['areas'][number]['lines'][number]): number {
  return line.stations.reduce((sum, station) => sum + countAssetsInStation(station), 0);
}

function countAssetsInArea(area: AssetTree['sites'][number]['areas'][number]): number {
  return area.lines.reduce((sum, line) => sum + countAssetsInLine(line), 0);
}

function countAssetsInSite(site: AssetTree['sites'][number]): number {
  return site.areas.reduce((sum, area) => sum + countAssetsInArea(area), 0);
}

export default function Assets() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({ search: '' });
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssetFormState>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery<AssetTree>({
    queryKey: ['assetHierarchy'],
    queryFn: () => api.get<AssetTree>('/assets/hierarchy'),
    staleTime: 60_000,
  });

  const { data: assetsResponse, isFetching: assetsFetching } = useQuery<{ assets: AssetSummary[] }>({
    queryKey: ['assets'],
    queryFn: () => api.get<{ assets: AssetSummary[] }>('/assets'),
    staleTime: 30_000,
  });

  const tableRows = useMemo(() => buildTableRows(assetsResponse?.assets ?? []), [assetsResponse]);

  const siteOptions = useMemo(() => {
    const unique = new Map<string, string>();
    tableRows.forEach((row) => {
      if (!unique.has(row.siteId)) {
        unique.set(row.siteId, row.site);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [tableRows]);

  const filters: FilterDefinition[] = useMemo(
    () => [
      { key: 'site', label: 'Site', type: 'select', options: siteOptions },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions.map(({ value, label }) => ({ value, label })) },
      { key: 'criticality', label: 'Criticality', type: 'select', options: criticalityOptions },
    ],
    [siteOptions],
  );

  const filteredRows = useMemo(() => {
    const search = (values.search ?? '').toLowerCase();
    const siteFilter = values.site ?? '';
    const statusFilter = values.status ?? '';
    const criticalityFilter = values.criticality ?? '';

    return tableRows.filter((row) => {
      const matchesSearch = search
        ? [row.name, row.code, row.manufacturer, row.site, row.line, row.station]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(search))
        : true;
      const matchesSite = siteFilter ? row.siteId === siteFilter : true;
      const matchesStatus = statusFilter ? row.status === statusFilter : true;
      const matchesCriticality = criticalityFilter
        ? row.criticalityBadge ===
          (criticalityFilter === '1' ? 'low' : criticalityFilter === '2' ? 'medium' : 'high')
        : true;

      return matchesSearch && matchesSite && matchesStatus && matchesCriticality;
    });
  }, [tableRows, values]);

  const { data: lifecycle, isLoading: lifecycleLoading, isError: lifecycleError } = useQuery<AssetLifecycle>({
    queryKey: ['asset-lifecycle', selectedAssetId],
    enabled: Boolean(selectedAssetId),
    queryFn: async () => {
      if (!selectedAssetId) {
        throw new Error('Asset id required');
      }
      return api.get<AssetLifecycle>(`/assets/${selectedAssetId}/lifecycle`);
    },
  });

  useEffect(() => {
    if (!showDrawer) {
      setSelectedAssetId(null);
      setDraft(emptyDraft);
      setFormError(null);
    }
  }, [showDrawer]);

  useEffect(() => {
    if (!selectedAssetId) {
      setDraft(emptyDraft);
    } else {
      setDraft({ ...emptyDraft, id: selectedAssetId });
    }
  }, [selectedAssetId]);

  useEffect(() => {
    if (lifecycle) {
      setDraft(toDraft(lifecycle));
      setFormError(null);
    }
  }, [lifecycle]);

  const updateAssetMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!selectedAssetId) {
        throw new Error('Select an asset to update its lifecycle.');
      }
      return api.patch<AssetLifecycle>(`/assets/${selectedAssetId}/lifecycle`, payload);
    },
    onSuccess: (updated) => {
      setDraft(toDraft(updated));
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
      void queryClient.invalidateQueries({ queryKey: ['assetHierarchy'] });
      if (selectedAssetId) {
        void queryClient.invalidateQueries({ queryKey: ['asset-lifecycle', selectedAssetId] });
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update asset lifecycle.';
      setFormError(message);
    },
  });

  const handleDrawerClose = useCallback(() => {
    setShowDrawer(false);
  }, []);

  const handleAssetSelect = useCallback((assetId: string) => {
    setFormError(null);
    setSelectedAssetId(assetId);
    setShowDrawer(true);
  }, []);

  const handleDraftChange = useCallback(<K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleBomChange = useCallback((index: number, key: keyof BomLineDraft, value: string) => {
    setDraft((prev) => {
      const next = [...prev.bomLines];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, bomLines: next };
    });
  }, []);

  const handleAddBomLine = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      bomLines: [
        ...prev.bomLines,
        {
          clientId: createClientId(),
          reference: '',
          description: '',
          quantity: '',
          unit: '',
          notes: '',
        },
      ],
    }));
  }, []);

  const handleRemoveBomLine = useCallback((clientId: string) => {
    setDraft((prev) => ({
      ...prev,
      bomLines: prev.bomLines.filter((line) => line.clientId !== clientId),
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedAssetId) {
      setFormError('Select an asset from the table or hierarchy to update lifecycle details.');
      return;
    }

    const normalizedBomLines: Array<{
      id?: string;
      reference: string;
      description: string;
      quantity: number | null;
      unit: string | null;
      notes: string | null;
      position: number;
    }> = [];

    for (let index = 0; index < draft.bomLines.length; index += 1) {
      const line = draft.bomLines[index];
      const reference = line.reference.trim();
      const description = line.description.trim();

      if (!reference || !description) {
        continue;
      }

      const quantity = line.quantity.trim();
      const parsedQuantity = quantity ? Number(quantity) : null;

      if (quantity && Number.isNaN(parsedQuantity)) {
        setFormError(`Invalid quantity on BOM line ${index + 1}.`);
        return;
      }

      normalizedBomLines.push({
        id: line.id,
        reference,
        description,
        quantity: parsedQuantity,
        unit: line.unit.trim() || null,
        notes: line.notes.trim() || null,
        position: index,
      });
    }

    const costValue = draft.cost.trim();
    const parsedCost = costValue ? Number(costValue) : null;

    if (costValue && Number.isNaN(parsedCost)) {
      setFormError('Cost must be a number.');
      return;
    }

    const payload = {
      name: draft.name.trim(),
      code: draft.code.trim(),
      status: draft.status,
      manufacturer: draft.manufacturer.trim() || null,
      modelNumber: draft.modelNumber.trim() || null,
      serialNumber: draft.serialNumber.trim() || null,
      purchaseDate: draft.purchaseDate ? new Date(draft.purchaseDate).toISOString() : null,
      commissionedAt: draft.commissionedAt ? new Date(draft.commissionedAt).toISOString() : null,
      warrantyExpiresAt: draft.warrantyExpiresAt ? new Date(draft.warrantyExpiresAt).toISOString() : null,
      warrantyProvider: draft.warrantyProvider.trim() || null,
      warrantyContact: draft.warrantyContact.trim() || null,
      warrantyNotes: draft.warrantyNotes.trim() || null,
      cost: parsedCost,
      criticality: Number(draft.criticality) || 3,
      bomLines: normalizedBomLines,
    };

    if (!payload.name) {
      setFormError('Asset name is required.');
      return;
    }

    if (!payload.code) {
      setFormError('Asset tag is required.');
      return;
    }

    setFormError(null);
    updateAssetMutation.mutate(payload);
  }, [draft, selectedAssetId, updateAssetMutation]);

  const hierarchy = hierarchyData?.sites ?? [];

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
            value={values.search ?? ''}
            onChange={(event) => setValues((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search assets"
            className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
          />
          {assetsFetching && (
            <Loader2 className="absolute right-4 top-3 h-4 w-4 animate-spin text-mutedfg" />
          )}
        </div>
        <button className="w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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
            <p className="mt-2 text-sm text-mutedfg">Monitor lifecycle state, compliance, and criticality for every asset.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-border bg-white/70 p-1 text-xs font-semibold text-mutedfg shadow-inner">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1 transition',
                  view === 'table' ? 'bg-brand text-white shadow' : '',
                )}
                onClick={() => setView('table')}
              >
                <List className="h-4 w-4" /> Table
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1 transition',
                  view === 'cards' ? 'bg-brand text-white shadow' : '',
                )}
                onClick={() => setView('cards')}
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              type="button"
            >
              <Filter className="h-4 w-4" /> Advanced filters
            </button>
            <button
              onClick={() => {
                setSelectedAssetId(null);
                setDraft(emptyDraft);
                setFormError(null);
                setShowDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              type="button"
            >
              <Plus className="h-4 w-4" /> Quick add asset
            </button>
          </div>
        </header>
        <FilterBar
          filters={filters}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          sticky={false}
        />
        {view === 'table' ? (
          <ProTable
            data={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(row) => handleAssetSelect(row.id)}
            rowActions={(row) => (
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs text-brand"
                onClick={(event) => {
                  event.stopPropagation();
                  handleAssetSelect(row.id);
                }}
              >
                Inspect
              </button>
            )}
            emptyState={<div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-mutedfg">No assets match your filters.</div>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((asset) => (
              <article
                key={asset.id}
                className="rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
              >
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
                    <span>
                      {asset.site} · {asset.line}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Manufacturer: {asset.manufacturer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Criticality: <DataBadge status={asset.criticalityBadge} /></span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-3 text-sm text-mutedfg">
                  <span>Warranty expires</span>
                  <span className="font-semibold text-fg">{asset.warrantyExpires}</span>
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
      </section>
      <SlideOver
        open={showDrawer}
        onClose={handleDrawerClose}
        title={draft.name ? `Edit ${draft.name}` : selectedAssetId ? 'Edit asset' : 'Register asset'}
        description="Update the bill of materials and warranty metadata to keep your asset lifecycle accurate."
      >
        {!selectedAssetId && lifecycleLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-mutedfg">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading asset…
          </div>
        )}
        {selectedAssetId && lifecycleLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-mutedfg">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading asset…
          </div>
        )}
        {lifecycleError && (
          <p className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            Unable to load asset lifecycle data. Please try again.
          </p>
        )}
        {!selectedAssetId && !lifecycleLoading && !lifecycleError && (
          <div className="rounded-2xl border border-border bg-muted/40 p-6 text-sm text-mutedfg">
            Select an asset from the hierarchy or table to edit lifecycle metadata, or use another workflow to register a new asset.
          </div>
        )}
        {selectedAssetId && !lifecycleLoading && !lifecycleError && (
          <form className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Asset name
                <input
                  value={draft.name}
                  onChange={(event) => handleDraftChange('name', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Asset tag
                <input
                  value={draft.code}
                  onChange={(event) => handleDraftChange('code', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Manufacturer
                <input
                  value={draft.manufacturer}
                  onChange={(event) => handleDraftChange('manufacturer', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Model number
                <input
                  value={draft.modelNumber}
                  onChange={(event) => handleDraftChange('modelNumber', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Serial number
                <input
                  value={draft.serialNumber}
                  onChange={(event) => handleDraftChange('serialNumber', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Status
                <select
                  value={draft.status}
                  onChange={(event) => handleDraftChange('status', event.target.value as AssetStatus)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Criticality
                <select
                  value={draft.criticality}
                  onChange={(event) => handleDraftChange('criticality', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {criticalityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Purchase cost
                <input
                  value={draft.cost}
                  onChange={(event) => handleDraftChange('cost', event.target.value)}
                  placeholder={draft.cost && Number.isFinite(Number(draft.cost)) ? formatCurrency(Number(draft.cost)) : '0.00'}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-mutedfg">
                Purchase date
                <input
                  type="date"
                  value={draft.purchaseDate}
                  onChange={(event) => handleDraftChange('purchaseDate', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Commissioned
                <input
                  type="date"
                  value={draft.commissionedAt}
                  onChange={(event) => handleDraftChange('commissionedAt', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Warranty expires
                <input
                  type="date"
                  value={draft.warrantyExpiresAt}
                  onChange={(event) => handleDraftChange('warrantyExpiresAt', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Warranty provider
                <input
                  value={draft.warrantyProvider}
                  onChange={(event) => handleDraftChange('warrantyProvider', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Warranty contact
                <input
                  value={draft.warrantyContact}
                  onChange={(event) => handleDraftChange('warrantyContact', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-mutedfg">
              Warranty notes
              <textarea
                value={draft.warrantyNotes}
                onChange={(event) => handleDraftChange('warrantyNotes', event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-mutedfg">Bill of materials</h3>
                <button
                  type="button"
                  onClick={handleAddBomLine}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand"
                >
                  <Plus className="h-3 w-3" /> Add component
                </button>
              </div>
              {draft.bomLines.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-mutedfg">
                  No BOM lines yet. Add your critical components to keep maintenance ready.
                </p>
              )}
              <div className="space-y-4">
                {draft.bomLines.map((line, index) => (
                  <div key={line.clientId} className="rounded-2xl border border-border p-4 shadow-inner">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-mutedfg">
                            Reference
                            <input
                              value={line.reference}
                              onChange={(event) => handleBomChange(index, 'reference', event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-mutedfg">
                            Quantity
                            <input
                              value={line.quantity}
                              onChange={(event) => handleBomChange(index, 'quantity', event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </label>
                        </div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-mutedfg">
                          Description
                          <input
                            value={line.description}
                            onChange={(event) => handleBomChange(index, 'description', event.target.value)}
                            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block text-xs font-semibold uppercase tracking-wide text-mutedfg">
                            Unit
                            <input
                              value={line.unit}
                              onChange={(event) => handleBomChange(index, 'unit', event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-mutedfg">
                            Notes
                            <input
                              value={line.notes}
                              onChange={(event) => handleBomChange(index, 'notes', event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBomLine(line.clientId)}
                        className="rounded-full border border-border p-2 text-danger transition hover:bg-danger/10"
                        aria-label="Remove BOM line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {formError && (
              <p className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{formError}</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-mutedfg">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" /> Keep BOM and warranty data current for audit readiness.
              </span>
              <span>{draft.bomLines.length} components tracked</span>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleDrawerClose} className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedAssetId || updateAssetMutation.isPending}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition',
                  (!selectedAssetId || updateAssetMutation.isPending) && 'opacity-70',
                )}
              >
                {updateAssetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save asset'}
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}
