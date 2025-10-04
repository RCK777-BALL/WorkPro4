import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, PackageSearch, Plus, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SlideOver } from '../components/premium/SlideOver';
import type {
  CreatePartRequest,
  Part,
  PartsResponse,
  UpdatePartRequest,
} from '../../shared/types/inventory';

interface FormState {
  sku: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  min: string;
  max: string;
  onHand: string;
  cost: string;
  vendorId: string;
}

type DrawerMode = 'create' | 'edit';

type UpdatePayload = { id: string; data: UpdatePartRequest };

type PartsQueryResult = PartsResponse;

const numberFormatter = new Intl.NumberFormat();

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function toFormState(part?: Part): FormState {
  return {
    sku: part?.sku ?? '',
    name: part?.name ?? '',
    description: part?.description ?? '',
    unitOfMeasure: part?.unitOfMeasure ?? '',
    min: part ? String(part.min ?? 0) : '',
    max: part ? String(part.max ?? 0) : '',
    onHand: part ? String(part.onHand ?? 0) : '',
    cost: part?.cost != null ? String(part.cost) : '',
    vendorId: part?.vendorId ?? '',
  };
}

function parseInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePart, setActivePart] = useState<Part | null>(null);
  const [formState, setFormState] = useState<FormState>(() => toFormState());
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<PartsQueryResult>({
    queryKey: ['parts'],
    queryFn: () => api.get<PartsQueryResult>('/parts'),
  });

  const createPart = useMutation({
    mutationFn: (payload: CreatePartRequest) => api.post<Part>('/parts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });

  const updatePart = useMutation({
    mutationFn: (payload: UpdatePayload) => api.put<Part>(`/parts/${payload.id}`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });

  const statsCards = useMemo(() => {
    const stats = data?.stats;
    return [
      { label: 'Total SKUs', value: stats ? numberFormatter.format(stats.totalSkus) : '–', icon: Package },
      { label: 'Low stock', value: stats ? numberFormatter.format(stats.lowStock) : '–', icon: AlertTriangle },
      { label: 'Backordered', value: stats ? numberFormatter.format(stats.backordered) : '–', icon: TrendingDown },
      {
        label: 'Inventory value',
        value: stats ? formatCurrency(stats.inventoryValue) : '–',
        icon: PackageSearch,
      },
    ];
  }, [data?.stats]);

  const parts = data?.parts ?? [];
  const lowStock = data?.lowStock ?? [];

  const saving = createPart.isPending || updatePart.isPending;

  const openDrawer = (mode: DrawerMode, part: Part | null = null) => {
    setDrawerMode(mode);
    setActivePart(part);
    setFormState(toFormState(part ?? undefined));
    setFormError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFormError(null);
  };

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payloadBase: UpdatePartRequest & Partial<CreatePartRequest> = {
      sku: formState.sku.trim(),
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      unitOfMeasure: formState.unitOfMeasure.trim() || undefined,
      min: parseInteger(formState.min),
      max: parseInteger(formState.max),
      cost: parseNumber(formState.cost),
      vendorId: formState.vendorId.trim() || undefined,
    };

    if (!payloadBase.sku || !payloadBase.name) {
      setFormError('SKU and name are required fields.');
      return;
    }

    try {
      if (drawerMode === 'create') {
        const createPayload: CreatePartRequest = {
          ...payloadBase,
          sku: payloadBase.sku,
          name: payloadBase.name,
          min: payloadBase.min,
          max: payloadBase.max,
          cost: payloadBase.cost,
          vendorId: payloadBase.vendorId,
          description: payloadBase.description,
          unitOfMeasure: payloadBase.unitOfMeasure,
          onHand: parseInteger(formState.onHand) ?? 0,
        };

        await createPart.mutateAsync(createPayload);
      } else if (activePart) {
        const updatePayload: UpdatePayload = {
          id: activePart.id,
          data: {
            ...payloadBase,
            sku: payloadBase.sku,
            name: payloadBase.name,
          },
        };

        await updatePart.mutateAsync(updatePayload);
      }

      closeDrawer();
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : 'Failed to save part');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Inventory</h1>
          <p className="mt-2 text-sm text-mutedfg">
            Monitor critical spares, reorder signals, and part availability across sites.
          </p>
        </div>
        <Button onClick={() => openDrawer('create')} className="gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-lg">
          <Plus className="h-4 w-4" /> New part
        </Button>
      </header>

      {isError && (
        <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load inventory data'}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-fg">{stat.value}</p>
                </div>
                <span className="rounded-2xl bg-brand/10 p-3 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">Low stock alerts</h2>
            <p className="text-sm text-mutedfg">Parts that have fallen below par levels.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {lowStock.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-mutedfg">
              All parts are above their minimum thresholds.
            </div>
          )}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}
          {!isLoading &&
            lowStock.map((item) => (
              <div
                key={`${item.partId}-${item.warehouseId ?? 'default'}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-mutedfg"
              >
                <div>
                  <p className="font-semibold text-fg">{item.sku}</p>
                  <p>{parts.find((part) => part.id === item.partId)?.name ?? item.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-mutedfg">
                    {item.warehouseName ?? 'Main warehouse'}
                  </span>
                  <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                    {item.onHand} on hand (min {item.minLevel})
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">Parts catalogue</h2>
            <p className="text-sm text-mutedfg">Current SKUs with on-hand balances and thresholds.</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-mutedfg">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">On hand</th>
                  <th className="px-4 py-3 font-semibold">Min / Max</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Cost</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="h-6 animate-pulse rounded bg-muted" />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && parts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-mutedfg">
                      No parts have been added yet.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  parts.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-fg">{part.sku}</td>
                      <td className="px-4 py-3 text-mutedfg">
                        <div>{part.name}</div>
                        {part.description && <div className="text-xs">{part.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-mutedfg">
                        <div className="font-semibold text-fg">{part.onHand}</div>
                        {part.onOrder > 0 && <div className="text-xs">{part.onOrder} on order</div>}
                      </td>
                      <td className="px-4 py-3 text-mutedfg">
                        {part.min} / {part.max}
                      </td>
                      <td className="px-4 py-3 text-mutedfg">{part.vendor?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-mutedfg">
                        {part.cost != null ? `$${part.cost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDrawer('edit', part)}
                          className="rounded-xl"
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-mutedfg">
        <p className="font-semibold text-fg">Upcoming: predictive inventory</p>
        <p className="mt-2">
          Forecast consumption and automate reorders with lead time insights. Contact your account team to join the beta.
        </p>
      </section>

      <SlideOver
        open={drawerOpen}
        title={drawerMode === 'create' ? 'Add part' : `Edit ${activePart?.name ?? 'part'}`}
        description={drawerMode === 'create' ? 'Capture key details about a new spare part.' : 'Update thresholds and costing.'}
        onClose={closeDrawer}
        width="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-mutedfg">
              SKU
              <Input
                value={formState.sku}
                onChange={(event) => handleFormChange('sku', event.target.value)}
                className="mt-2"
                placeholder="e.g. PUMP-SEAL-001"
              />
            </label>
            <label className="text-sm font-semibold text-mutedfg">
              Name
              <Input
                value={formState.name}
                onChange={(event) => handleFormChange('name', event.target.value)}
                className="mt-2"
                placeholder="Part name"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-mutedfg">
            Description
            <textarea
              value={formState.description}
              onChange={(event) => handleFormChange('description', event.target.value)}
              className="mt-2 h-24 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Optional details to help identify this part"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-mutedfg">
              Min level
              <Input
                value={formState.min}
                onChange={(event) => handleFormChange('min', event.target.value)}
                className="mt-2"
                inputMode="numeric"
                placeholder="0"
              />
            </label>
            <label className="text-sm font-semibold text-mutedfg">
              Max level
              <Input
                value={formState.max}
                onChange={(event) => handleFormChange('max', event.target.value)}
                className="mt-2"
                inputMode="numeric"
                placeholder="0"
              />
            </label>
            <label className="text-sm font-semibold text-mutedfg">
              On hand
              <Input
                value={formState.onHand}
                onChange={(event) => handleFormChange('onHand', event.target.value)}
                className="mt-2"
                inputMode="numeric"
                placeholder="0"
                disabled={drawerMode === 'edit'}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-mutedfg">
              Unit cost
              <Input
                value={formState.cost}
                onChange={(event) => handleFormChange('cost', event.target.value)}
                className="mt-2"
                inputMode="decimal"
                placeholder="0.00"
              />
            </label>
            <label className="text-sm font-semibold text-mutedfg">
              Unit of measure
              <Input
                value={formState.unitOfMeasure}
                onChange={(event) => handleFormChange('unitOfMeasure', event.target.value)}
                className="mt-2"
                placeholder="e.g. ea, box"
              />
            </label>
            <label className="text-sm font-semibold text-mutedfg">
              Vendor ID
              <Input
                value={formState.vendorId}
                onChange={(event) => handleFormChange('vendorId', event.target.value)}
                className="mt-2"
                placeholder="Optional"
              />
            </label>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeDrawer} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-brand text-white" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
