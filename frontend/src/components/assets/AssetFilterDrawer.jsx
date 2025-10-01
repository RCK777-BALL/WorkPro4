import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

export function AssetFilterDrawer({ open, onClose, values, onApply, onReset }) {
  const [localValues, setLocalValues] = useState({ status: '', type: '', location: '' });

  useEffect(() => {
    if (open) {
      setLocalValues({
        status: values?.status || '',
        type: values?.type || '',
        location: values?.location?.trim?.() || '',
      });
    }
  }, [open, values]);

  const handleToggle = (key, value) => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value,
    }));
  };

  const disableApply = useMemo(() => {
    const normalizedLocation = values?.location?.trim?.() || '';
    return (
      localValues.status === (values?.status || '') &&
      localValues.type === (values?.type || '') &&
      (localValues.location || '') === normalizedLocation
    );
  }, [localValues.location, localValues.status, localValues.type, values]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={() => {
          onClose?.();
        }}
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l bg-white shadow-xl">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Asset Filters</h2>
            <p className="text-sm text-gray-500">Refine the asset list using the filters below.</p>
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

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Status</h3>
              <p className="text-xs text-gray-500">Show assets by their current availability.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle('status', option.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    localValues.status === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Asset Type</h3>
              <p className="text-xs text-gray-500">Limit results to a specific category.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle('type', option.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    localValues.type === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Location</h3>
              <p className="text-xs text-gray-500">Filter by the primary building or area.</p>
            </div>
            <Input
              placeholder="e.g. Building A"
              value={localValues.location}
              onChange={(event) =>
                setLocalValues((prev) => ({ ...prev, location: event.target.value }))
              }
            />
          </section>
        </div>

        <footer className="flex items-center justify-between border-t px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setLocalValues({ status: '', type: '', location: '' });
              onReset?.();
            }}
          >
            Clear filters
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onClose?.()}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onApply?.(localValues);
                onClose?.();
              }}
              disabled={disableApply}
            >
              Apply filters
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
