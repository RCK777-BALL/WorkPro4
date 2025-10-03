import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useColorMode } from '@/hooks/useColorMode';
import { useToast } from '@/hooks/use-toast';
import { Filters } from '@/components/dashboard/Filters';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { StackedBar } from '@/components/dashboard/StackedBar';
import { TopDowntime } from '@/components/dashboard/TopDowntime';
import { UpcomingPm } from '@/components/dashboard/UpcomingPm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function parseFilters(searchParams) {
  const preset = searchParams.get('preset') ?? '30d';
  return {
    tenantId: searchParams.get('tenantId') ?? undefined,
    siteId: searchParams.get('siteId') ?? undefined,
    lineId: searchParams.get('lineId') ?? undefined,
    assetId: searchParams.get('assetId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    rolePreset: searchParams.get('rolePreset') ?? 'admin',
    preset,
  };
}

function deriveSparkline(source) {
  if (!source) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
  const values = Object.values(source);
  if (!values.length) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
  const base = values.reduce((acc, value) => acc + Number(value || 0), 0) || 1;
  return Array.from({ length: 7 }, (_, index) => Math.round((base / 7) * (0.6 + index * 0.05)));
}

function buildFilterOptions(metrics, fallbackTenant) {
  const downtimeAssets = metrics?.charts?.topDowntimeAssets ?? [];
  const tenantId = metrics?.context?.tenantId ?? fallbackTenant ?? 'tenant';

  return {
    tenants: [{ label: 'WorkPro4 Tenant', value: tenantId }],
    sites: [],
    lines: [],
    assets: downtimeAssets.map((asset) => ({ label: asset.name, value: asset.assetId })),
  };
}

function SkeletonCard() {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <CardContent className="space-y-4 p-6">
        <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { mode, toggle } = useColorMode();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { data: metrics, isLoading, isFetching, isError, error, refetch } = useDashboardMetrics(filters);

  useEffect(() => {
    const timeout = setTimeout(() => setShowSkeleton(false), 1000);
    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    if (isError) {
      const message = error?.response?.data?.error?.message ?? error?.message ?? 'Unable to load dashboard metrics';
      toast({
        title: 'Dashboard data unavailable',
        description: message,
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  const updateSearchParams = (next) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();

    Object.entries(merged).forEach(([key, value]) => {
      if (!value || value === 'all') {
        return;
      }
      params.set(key, value);
    });

    setSearchParams(params, { replace: true });
  };

  const handleFiltersChange = (nextFilters) => {
    updateSearchParams(nextFilters);
  };

  const handleRoleChange = (rolePreset) => {
    updateSearchParams({ rolePreset });
  };

  const handleRangeChange = ({ from, to, preset }) => {
    updateSearchParams({ from, to, preset });
  };

  const options = useMemo(() => buildFilterOptions(metrics, filters.tenantId), [metrics, filters.tenantId]);

  const kpis = metrics?.kpis;
  const openWorkOrders = kpis?.openWorkOrders;
  const mttr = kpis?.mttrHours;
  const uptime = kpis?.uptimePct;
  const stockout = kpis?.stockoutRisk;

  const stackedData = metrics?.charts?.workOrdersByStatusPriority ?? [];
  const downtimeData = metrics?.charts?.topDowntimeAssets ?? [];
  const pmData = metrics?.charts?.upcomingPm ?? [];

  return (
    <div className="space-y-6">
      <Filters
        filters={filters}
        options={options}
        onChange={handleFiltersChange}
        onRoleChange={handleRoleChange}
        onRangeChange={handleRangeChange}
        mode={mode}
        onModeToggle={toggle}
      />

      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-600 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <p>We couldn’t refresh the dashboard. Check your filters and try again.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-4">
        {(isLoading || (isFetching && showSkeleton)) && !metrics
          ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={`kpi-skeleton-${index}`} />)
          : (
            <>
              <KpiCard
                title="Open Work Orders"
                value={openWorkOrders?.total ?? 0}
                delta={openWorkOrders?.delta7d}
                timeframe={filters.preset?.toUpperCase?.() ?? '30D'}
                breakdown={openWorkOrders?.byPriority}
                series={deriveSparkline(openWorkOrders?.byPriority)}
                accent="indigo"
              />
              <KpiCard
                title="MTTR (hrs)"
                value={mttr?.value ?? 0}
                delta={mttr?.delta30d}
                timeframe="30d"
                series={deriveSparkline(mttr ? { value: mttr.value } : null)}
                accent="emerald"
              />
              <KpiCard
                title="Asset Uptime (%)"
                value={uptime?.value ?? 0}
                delta={uptime?.delta30d}
                timeframe="30d"
                series={deriveSparkline(uptime ? { value: uptime.value } : null)}
                accent="emerald"
              />
              <KpiCard
                title="Stockout Risk"
                value={stockout?.count ?? 0}
                delta={0}
                timeframe="Now"
                breakdown={
                  stockout?.items && stockout.items.length > 0
                    ? stockout.items.slice(0, 4).reduce((acc, item) => {
                        acc[item.name] = item.onHand;
                        return acc;
                      }, {})
                    : undefined
                }
                series={deriveSparkline(stockout ? { value: stockout.count } : null)}
                accent="amber"
              />
            </>
          )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="col-span-1 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
          <CardContent className="h-[360px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Work Orders by Status & Priority</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Stacked priorities across the selected window.</p>
              </div>
            </div>
            <StackedBar data={stackedData} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="h-[360px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Asset Downtime (Top 10)</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Hover to drill into the asset performance trend.</p>
              </div>
            </div>
            <TopDowntime data={downtimeData} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="col-span-1 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
          <CardContent className="h-[360px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upcoming PM Schedule</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Next 14 days of preventive tasks by due date.</p>
              </div>
              <Button type="button" size="sm" className="rounded-full">
                Add PM Plan
              </Button>
            </div>
            <UpcomingPm data={pmData} />
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 shadow-lg">
          <CardContent className="flex h-[360px] flex-col justify-between p-6">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Planner Focus</h3>
              <p className="text-sm text-slate-300">
                Use the planner preset to surface backlogs, overdue work, and at-risk parts for your assigned lines.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full rounded-full bg-white text-slate-900 hover:bg-slate-200"
              onClick={() => handleRoleChange('planner')}
            >
              Switch to Planner view
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
