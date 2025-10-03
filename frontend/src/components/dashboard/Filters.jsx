import { useMemo } from 'react';
import { formatISO, startOfQuarter, startOfYear, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DATE_PRESETS = {
  '7d': () => ({ from: formatISO(subDays(new Date(), 7)), to: formatISO(new Date()) }),
  '30d': () => ({ from: formatISO(subDays(new Date(), 30)), to: formatISO(new Date()) }),
  qtd: () => {
    const now = new Date();
    return { from: formatISO(startOfQuarter(now)), to: formatISO(now) };
  },
  ytd: () => {
    const now = new Date();
    return { from: formatISO(startOfYear(now)), to: formatISO(now) };
  },
};

const ROLE_PRESETS = [
  { id: 'admin', label: 'Admin / Manager' },
  { id: 'planner', label: 'Planner' },
  { id: 'technician', label: 'Technician' },
];

export function Filters({ filters, options, onChange, onRoleChange, onRangeChange, mode, onModeToggle }) {
  const resolvedOptions = useMemo(
    () => ({
      tenants: options?.tenants ?? [],
      sites: options?.sites ?? [],
      lines: options?.lines ?? [],
      assets: options?.assets ?? [],
    }),
    [options],
  );

  const handleSelectChange = (key) => (value) => {
    onChange({ ...filters, [key]: value === 'all' ? undefined : value });
  };

  const applyPreset = (presetKey) => {
    const preset = DATE_PRESETS[presetKey];
    if (!preset) {
      return;
    }
    onRangeChange({ ...preset(), preset: presetKey });
  };

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range presets">
          {Object.entries(DATE_PRESETS).map(([key]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filters.preset === key ? 'default' : 'outline'}
              className="rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              onClick={() => applyPreset(key)}
            >
              {key.toUpperCase()}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => onRangeChange({ from: filters.from, to: filters.to, preset: 'custom' })}
          >
            Custom
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
          onClick={onModeToggle}
          aria-label={`Toggle ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tenant-select">Tenant</Label>
          <Select value={filters.tenantId ?? 'all'} onValueChange={handleSelectChange('tenantId')}>
            <SelectTrigger id="tenant-select" aria-label="Tenant filter">
              <SelectValue placeholder="All tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {resolvedOptions.tenants.map((tenant) => (
                <SelectItem key={tenant.value} value={tenant.value}>
                  {tenant.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="site-select">Site</Label>
          <Select value={filters.siteId ?? 'all'} onValueChange={handleSelectChange('siteId')}>
            <SelectTrigger id="site-select" aria-label="Site filter">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {resolvedOptions.sites.map((site) => (
                <SelectItem key={site.value} value={site.value}>
                  {site.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="line-select">Line</Label>
          <Select value={filters.lineId ?? 'all'} onValueChange={handleSelectChange('lineId')}>
            <SelectTrigger id="line-select" aria-label="Line filter">
              <SelectValue placeholder="All lines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lines</SelectItem>
              {resolvedOptions.lines.map((line) => (
                <SelectItem key={line.value} value={line.value}>
                  {line.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="asset-select">Asset</Label>
          <Select value={filters.assetId ?? 'all'} onValueChange={handleSelectChange('assetId')}>
            <SelectTrigger id="asset-select" aria-label="Asset filter">
              <SelectValue placeholder="All assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              {resolvedOptions.assets.map((asset) => (
                <SelectItem key={asset.value} value={asset.value}>
                  {asset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Role presets">
        {ROLE_PRESETS.map((role) => (
          <Button
            key={role.id}
            type="button"
            variant={filters.rolePreset === role.id ? 'default' : 'outline'}
            size="sm"
            className="rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
            onClick={() => onRoleChange(role.id)}
            aria-pressed={filters.rolePreset === role.id}
          >
            {role.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
