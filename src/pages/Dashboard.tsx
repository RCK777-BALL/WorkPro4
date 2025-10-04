import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  ClipboardList,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { KPICard } from '../components/premium/KPICard';
import { DataBadge } from '../components/premium/DataBadge';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { EmptyState } from '../components/premium/EmptyState';
import { api } from '../lib/api';

interface DashboardMetrics {
  kpis: {
    openWorkOrders: {
      total: number;
      byPriority: Record<'critical' | 'high' | 'medium' | 'low', number>;
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
  charts: {
    workOrdersByStatusPriority: Array<{
      status: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };
}

interface StatusPriorityRow {
  status: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

const statusBadgeMap: Record<string, { status: string; label: string }> = {
  requested: { status: 'open', label: 'Requested' },
  approved: { status: 'assigned', label: 'Approved' },
  assigned: { status: 'assigned', label: 'Assigned' },
  in_progress: { status: 'in progress', label: 'In Progress' },
  'in progress': { status: 'in progress', label: 'In Progress' },
  completed: { status: 'completed', label: 'Completed' },
  cancelled: { status: 'cancelled', label: 'Cancelled' },
};

const columns: ProTableColumn<StatusPriorityRow>[] = [
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => {
      const badge = statusBadgeMap[row.status.toLowerCase()] ?? {
        status: 'scheduled',
        label: row.status,
      };
      return <DataBadge status={badge.status} label={badge.label} />;
    },
  },
  { key: 'critical', header: 'Critical', align: 'right' },
  { key: 'high', header: 'High', align: 'right' },
  { key: 'medium', header: 'Medium', align: 'right' },
  { key: 'low', header: 'Low', align: 'right' },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
  },
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
    data,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.get<DashboardMetrics>('/dashboard/metrics'),
    retry: 0,
  });

  const priorityRows = useMemo<StatusPriorityRow[]>(() => {
    if (!data?.charts.workOrdersByStatusPriority) {
      return [];
    }

    return data.charts.workOrdersByStatusPriority.map((entry) => ({
      status: entry.status,
      critical: entry.critical,
      high: entry.high,
      medium: entry.medium,
      low: entry.low,
      total: entry.critical + entry.high + entry.medium + entry.low,
    }));
  }, [data]);

  const kpiCards = useMemo(() => {
    const open = data?.kpis.openWorkOrders;
    const mttr = data?.kpis.mttrHours;
    const uptime = data?.kpis.uptimePct;
    const stockout = data?.kpis.stockoutRisk;

    const formatDelta = (value: number | undefined, label: string) => {
      if (value == null || Number.isNaN(value)) {
        return `Δ 0${label}`;
      }
      const formatted = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
      return `Δ ${formatted}${label}`;
    };

    const getDeltaType = (value: number | undefined) =>
      value && value !== 0 ? (value > 0 ? 'positive' : 'negative') : 'neutral';

    return [
      {
        key: 'open-work-orders',
        title: 'Open Work Orders',
        value: open ? open.total.toLocaleString() : '—',
        delta: formatDelta(open?.delta7d, '% vs prior 7d'),
        deltaType: getDeltaType(open?.delta7d),
        description: open
          ? `Priority mix: ${open.byPriority.high} high / ${open.byPriority.critical} critical`
          : undefined,
        icon: <ClipboardList className="h-6 w-6" />,
      },
      {
        key: 'mttr',
        title: 'MTTR (hours)',
        value: mttr ? mttr.value.toFixed(2) : '—',
        delta: formatDelta(mttr?.delta30d, '% vs prior 30d'),
        deltaType: getDeltaType(mttr?.delta30d),
        description: 'Mean time to repair across completed work orders.',
        icon: <Wrench className="h-6 w-6" />,
      },
      {
        key: 'uptime',
        title: 'Asset Uptime',
        value: uptime ? `${uptime.value.toFixed(1)}%` : '—',
        delta: formatDelta(uptime?.delta30d, ' pts vs prior 30d'),
        deltaType: getDeltaType(uptime?.delta30d),
        description: 'Rolling uptime percentage across monitored assets.',
        icon: <Building2 className="h-6 w-6" />,
      },
      {
        key: 'stockout',
        title: 'Stockout Risk',
        value: stockout ? stockout.count.toLocaleString() : '—',
        delta: stockout
          ? `${stockout.items.length} parts at or below minimum`
          : 'Inventory checks pending',
        deltaType: stockout && stockout.count > 0 ? 'negative' : 'positive',
        description: 'Parts flagged below minimum stocking thresholds.',
        icon: <ShieldCheck className="h-6 w-6" />,
      },
    ];
  }, [data]);

  const errorMessage = error instanceof Error ? error.message : 'Backend unavailable';

  return (
    <div className="space-y-10">
      {isError && (
        <div className="flex items-start gap-3 rounded-3xl border border-danger/40 bg-danger/5 p-5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-base font-semibold">Unable to load dashboard metrics</p>
            <p className="mt-1 text-danger/80">{errorMessage}</p>
          </div>
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mutedfg">Today</p>
          <h1 className="text-3xl font-semibold text-fg">Operational Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-mutedfg">
            Monitor your asset health, respond to high-impact alerts, and keep work moving without disruption.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <Wrench className="h-4 w-4" />
          Create Work Order
        </button>
      </header>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ key, ...card }) => (
          <KPICard key={key} {...card} loading={isLoading && !data} />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg">Open work orders</h2>
              <p className="text-sm text-mutedfg">Status and priority mix for the selected reporting window.</p>
            </div>
            <a href="/work-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              View board
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-6">
            <ProTable
              data={priorityRows}
              columns={columns}
              loading={isLoading && !priorityRows.length}
              getRowId={(row) => row.status}
              emptyState={
                <EmptyState
                  title="No work order activity"
                  description="Metrics will appear once data is available for this period."
                  icon={<ClipboardList className="h-8 w-8" />}
                />
              }
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
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
          <div className="rounded-3xl border border-border bg-danger/5 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-danger">
              <BellRing className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Alerts feed</h3>
            </div>
            <ul className="mt-4 space-y-4">
              {alerts.map((alert) => (
                <li
                  key={alert.title}
                  className="rounded-2xl border border-danger/20 bg-white/70 p-4 text-sm text-danger shadow-sm dark:bg-muted/70"
                >
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
