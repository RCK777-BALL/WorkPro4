import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api, unwrapApiResult } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'down', label: 'Down' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const TYPE_OPTIONS = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'facility', label: 'Facility' },
  { value: 'tool', label: 'Tooling' },
  { value: 'vehicle', label: 'Vehicle' },
];

const DEFAULT_VALUES = {
  name: '',
  tag: '',
  type: 'equipment',
  status: 'operational',
  location: '',
  purchasedDate: '',
  purchaseCost: '',
  description: '',
};

export function NewAssetModal({ open, onClose, onSuccess }) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  if (!open) {
    return null;
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      tag: values.tag || undefined,
      type: values.type,
      status: values.status,
      location: values.location || undefined,
      purchasedDate: values.purchasedDate || undefined,
      purchaseCost:
        values.purchaseCost && !Number.isNaN(Number(values.purchaseCost))
          ? Number(values.purchaseCost)
          : undefined,
      description: values.description || undefined,
    };

    try {
      let result;
      try {
        result = await api.post('/assets', payload);
      } catch (error) {
        if (error?.status === 404) {
          const fallbackBaseURL =
            typeof api.defaults?.baseURL === 'string'
              ? api.defaults.baseURL.replace(/\/api\/?$/, '')
              : api.defaults?.baseURL;

          if (fallbackBaseURL && fallbackBaseURL !== api.defaults?.baseURL) {
            result = await api.post('/assets', payload, { baseURL: fallbackBaseURL });
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const createdAsset = unwrapApiResult(result);

      toast({
        variant: 'default',
        title: 'Asset created',
        description: `${values.name} has been added to your asset list.`,
      });

      reset(DEFAULT_VALUES);
      onSuccess?.(createdAsset);
      onClose?.();
    } catch (error) {
      const description =
        error?.data?.error?.message || error?.message || 'Unable to create the asset.';

      toast({
        variant: 'destructive',
        title: 'Failed to create asset',
        description,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">New Asset</h2>
            <p className="text-sm text-gray-500">Enter the details below to add a new asset.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onClose?.()}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Asset Name</label>
              <Input
                placeholder="Main Water Pump"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Asset Tag</label>
              <Input placeholder="PUMP-001" {...register('tag')} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                {...register('type', { required: true })}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                {...register('status', { required: true })}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input placeholder="Building A" {...register('location')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-4 md:col-span-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Purchase Date</label>
                <Input type="date" {...register('purchasedDate')} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Purchase Cost</label>
                <Input type="number" step="0.01" min="0" {...register('purchaseCost')} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Provide additional context or specifications."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onClose?.()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
