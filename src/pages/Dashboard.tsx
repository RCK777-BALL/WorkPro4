import { useMemo, type ComponentProps } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, BellRing, Building2, ClipboardList, ShieldCheck, Users, Wrench } from 'lucide-react';
import { KPICard } from '../components/premium/KPICard';
import { DataBadge } from '../components/premium/DataBadge';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { EmptyState } from '../components/premium/EmptyState';
import { api, workOrdersApi } from '../lib/api';
import { formatDate, formatWorkOrderPriority, formatWorkOrderStatus } from '../lib/utils';
import { normalizeWorkOrders, type WorkOrderRecord } from '../lib/workOrders';

type PriorityBuckets = Record<'critical' | 'high' | 'medium' | 'low', number>;
type Trend = 'positive' | 'negative' | 'neutral';
type KPICardConfig = Omit<ComponentProps<typeof KPICard>, 'loading'>;

interface DashboardMetrics {
  kpis: {
    openWorkOrders: {
      total: number;
      byPriority: PriorityBuckets;
      delta7d: number;
    };
    mttrHours: {
      value: number;
      delta30d: number;
    };
    uptimePct: {
      value: number;
      delta30d: number;
    };
    stockoutRisk: {
      count: number;
      items: Array<{
        partId: string;
        name: string;
        onHand: number;
        min: number;
      }>;
    };
  };
}

function formatNumber(value: number | undefined, options?: Intl.NumberFormatOptions) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return value.toLocaleString(undefined, options);
}

function formatDelta(value: number | undefined, suffix: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  const rounded = Number(value.toFixed(1));
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}${suffix}`;
}

function deltaType(value: number | undefined): Trend {
  if (typeof value !== 'number' || value === 0) {
    return 'neutral';
  }

  return value > 0 ? 'positive' : 'negative';
}

function mttrDeltaType(value: number | undefined): Trend {
  if (typeof value !== 'number' || value === 0) {
    return 'neutral';
  }

  return value < 0 ? 'positive' : 'negative';
}

function prioritySparkline(buckets: PriorityBuckets | undefined) {
  if (!buckets) {
    return [];
  }

  return Object.values(buckets);
}

const columns: ProTableColumn<WorkOrderRecord>[] = [
  { key: 'id', header: 'ID' },
  { key: 'title', header: 'Title' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={formatWorkOrderStatus(row.status ?? '')} />
  },
  { key: 'critical', header: 'Critical', align: 'right' },
  { key: 'high', header: 'High', align: 'right' },
  { key: 'medium', header: 'Medium', align: 'right' },
  { key: 'low', header: 'Low', align: 'right' },
  {
    key: 'priority',
    header: 'Priority',
    accessor: (row) => <DataBadge status={formatWorkOrderPriority(row.priority ?? '')} />
  },
  {
    key: 'assignee',
    header: 'Owner',
    accessor: (row) => row.assignee ?? 'Unassigned'
  },
  { key: 'dueDate', header: 'Due', accessor: (row) => (row.dueDate ? formatDate(row.dueDate) : '—') }
];

const activity = [
  {
    title: 'WO-287 escalated to urgent',
    time: '8 minutes ago',
    description: 'HVAC rooftop unit trending hot. Auto-escalated by rules engine.',
  },
  {
    title: '3 technicians completed certifications',
    time: 'Today, 09:24',
    description: 'Compliance badges renewed for John T., Maya K., and Darius L.',
  },
  {
    title: 'Predictive alert resolved',
    time: 'Yesterday',
    description: 'Vibration anomaly on Pump A acknowledged and cleared by Sarah M.',
  },
];

const alerts = [
  {
    title: 'Critical asset requires attention',
    body: 'Boiler 5 has hit 110% runtime hours. Auto-generate a preventive order.',
    severity: 'High',
  },
  {
    title: 'Vendor compliance expiring',
    body: 'Northside HVAC contract expires in 12 days. Review renewal terms.',
    severity: 'Medium',
  },
];

export default function Dashboard() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorDetails,
    refetch: refetchMetrics,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.get<DashboardMetrics>('/dashboard/metrics'),
    staleTime: 30_000,
    retry: false,
  });

  const {
    data: previewOrders,
    isLoading: previewLoading,
    isError: previewError,
  } = useQuery<WorkOrderRecord[]>({
    queryKey: ['dashboard', 'work-orders-preview'],
    queryFn: async () => {
      const response = await workOrdersApi.list({ limit: 8 });
      return normalizeWorkOrders(response.items ?? []);
    },
    staleTime: 60_000,
    retry: false,
  });

  const workOrders = previewOrders ?? [];

  const kpiCards = useMemo<KPICardConfig[]>(
    () => [
      {
        title: 'Active Work Orders',
        value: metrics ? formatNumber(metrics.kpis.openWorkOrders.total) : '—',
        delta: metrics ? formatDelta(metrics.kpis.openWorkOrders.delta7d, '% vs last 7d') : undefined,
        deltaType: metrics ? deltaType(metrics.kpis.openWorkOrders.delta7d) : 'neutral',
        description: metrics
          ? `${metrics.kpis.openWorkOrders.byPriority.critical} critical · ${metrics.kpis.openWorkOrders.byPriority.high} high`
          : undefined,
        sparkline: metrics ? prioritySparkline(metrics.kpis.openWorkOrders.byPriority) : [],
        icon: <ClipboardList className="w-6 h-6" />,
      },
      {
        title: 'Asset Uptime',
        value: metrics ? `${formatNumber(metrics.kpis.uptimePct.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : '—',
        delta: metrics ? formatDelta(metrics.kpis.uptimePct.delta30d, '% vs prev 30d') : undefined,
        deltaType: metrics ? deltaType(metrics.kpis.uptimePct.delta30d) : 'neutral',
        sparkline: metrics ? Array(7).fill(metrics.kpis.uptimePct.value) : [],
        icon: <ShieldCheck className="w-6 h-6" />,
      },
      {
        title: 'Mean Time to Repair',
        value: metrics
          ? formatNumber(metrics.kpis.mttrHours.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '—',
        delta: metrics ? formatDelta(metrics.kpis.mttrHours.delta30d, ' hrs vs prev 30d') : undefined,
        deltaType: metrics ? mttrDeltaType(metrics.kpis.mttrHours.delta30d) : 'neutral',
        sparkline: metrics ? Array(7).fill(metrics.kpis.mttrHours.value) : [],
        icon: <Users className="w-6 h-6" />,
      },
      {
        title: 'Stockout Risk',
        value: metrics ? formatNumber(metrics.kpis.stockoutRisk.count) : '—',
        delta: undefined,
        deltaType: 'neutral',
        description:
          metrics && metrics.kpis.stockoutRisk.items.length > 0
            ? `Watch ${metrics.kpis.stockoutRisk.items.slice(0, 2).map((item) => item.name).join(', ')}`
            : undefined,
        sparkline: metrics ? Array(7).fill(metrics.kpis.stockoutRisk.count) : [],
        icon: <Building2 className="w-6 h-6" />,
      },
    ],
    [metrics]
  );

  const metricsErrorMessage = metricsErrorDetails instanceof Error ? metricsErrorDetails.message : 'Unable to load metrics';

  return (
    <div className="space-y-10">
      {metricsError && (
        <div className="flex items-start gap-3 p-5 text-sm border rounded-3xl border-danger/40 bg-danger/5 text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-base font-semibold">Unable to load dashboard metrics</p>
            <p className="mt-1 text-danger/80">{metricsErrorMessage}</p>
          </div>
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-mutedfg">Today</p>
          <h1 className="text-3xl font-semibold text-fg">Operational Command Center</h1>
          <p className="max-w-2xl mt-2 text-sm text-mutedfg">
            Monitor your asset health, respond to high-impact alerts, and keep work moving without disruption.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <Wrench className="w-4 h-4" />
          Create Work Order
        </button>
      </header>
      {metricsError && (
        <div className="px-4 py-4 text-sm border rounded-3xl border-danger/30 bg-danger/10 text-danger">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">We couldn’t refresh the dashboard metrics.</p>
            <button
              type="button"
              onClick={() => refetchMetrics()}
              className="px-3 py-1 text-xs font-semibold transition border rounded-full border-danger/30 text-danger hover:bg-danger/10"
            >
              Retry
            </button>
          </div>
          <p className="mt-2 text-xs text-danger/80">{metricsErrorMessage}</p>
        </div>
      )}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} loading={metricsLoading} />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="p-6 border shadow-xl rounded-3xl border-border bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg">Open work orders</h2>
              <p className="text-sm text-mutedfg">Status and priority mix for the selected reporting window.</p>
            </div>
            <a href="/work-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              View board
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-6">
            {previewError && (
              <div className="px-4 py-3 mb-4 text-sm border rounded-2xl border-danger/20 bg-danger/10 text-danger">
                Unable to load work order preview. Visit the work orders board for the latest details.
              </div>
            )}
            <ProTable
              data={workOrders}
              columns={columns}
              loading={previewLoading}
              getRowId={(row) => row.id}
              rowActions={(row) => (
                <a href={`/work-orders/${row.id}`} className="text-sm font-semibold text-brand">
                  Inspect
                </a>
              )}
              emptyState={<EmptyState title="No work orders" description="You’re all caught up for now." icon={<ClipboardList className="w-8 h-8" />} />}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 border shadow-xl rounded-3xl border-border bg-surface">
            <h3 className="text-lg font-semibold text-fg">Recent activity</h3>
            <ul className="mt-4 space-y-5">
              {activity.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-muted/70"
                >
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  <p className="text-xs text-mutedfg">{item.time}</p>
                  <p className="mt-2 text-sm text-mutedfg">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 border shadow-xl rounded-3xl border-border bg-danger/5">
            <div className="flex items-center gap-3 text-danger">
              <BellRing className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Alerts feed</h3>
            </div>
            <ul className="mt-4 space-y-4">
              {alerts.map((alert) => (
                <li key={alert.title} className="p-4 text-sm border shadow-sm rounded-2xl border-danger/20 bg-white/70 text-danger dark:bg-muted/70">
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1 text-xs text-danger/80">Severity: {alert.severity}</p>
                  <p className="mt-2 text-danger/90">{alert.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
