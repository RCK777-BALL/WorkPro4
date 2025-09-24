import { ArrowRight, BellRing, Building2, ClipboardList, ShieldCheck, Users, Wrench } from 'lucide-react';
import { KPICard } from '../components/premium/KPICard';
import { DataBadge } from '../components/premium/DataBadge';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { EmptyState } from '../components/premium/EmptyState';
import { mockWorkOrders } from '../lib/mockWorkOrders';

const kpiConfig = [
  {
    title: 'Active Work Orders',
    value: '24',
    delta: '+12% vs last week',
    deltaType: 'positive' as const,
    sparkline: [9, 11, 12, 13, 15, 17, 24],
    icon: <ClipboardList className="h-6 w-6" />
  },
  {
    title: 'Response SLA',
    value: '94%',
    delta: '-3% this week',
    deltaType: 'negative' as const,
    sparkline: [98, 97, 95, 93, 94, 92, 94],
    icon: <ShieldCheck className="h-6 w-6" />
  },
  {
    title: 'Technician Utilization',
    value: '82%',
    delta: '+6 pts vs goal',
    deltaType: 'positive' as const,
    sparkline: [61, 64, 70, 74, 78, 80, 82],
    icon: <Users className="h-6 w-6" />
  },
  {
    title: 'Asset Availability',
    value: '97.2%',
    delta: '+1.2% uptime',
    deltaType: 'positive' as const,
    sparkline: [94, 94.5, 95, 96, 96.5, 97, 97.2],
    icon: <Building2 className="h-6 w-6" />
  }
];

const columns: ProTableColumn<(typeof mockWorkOrders)[number]>[] = [
  { key: 'id', header: 'ID' },
  { key: 'title', header: 'Title' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={row.status ?? 'Open'} />
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: (row) => <DataBadge status={row.priority ?? 'Medium'} />
  },
  { key: 'assignee', header: 'Owner' },
  { key: 'dueDate', header: 'Due', accessor: (row) => row.dueDate ?? '—' }
];

const activity = [
  {
    title: 'WO-287 escalated to urgent',
    time: '8 minutes ago',
    description: 'HVAC rooftop unit trending hot. Auto-escalated by rules engine.'
  },
  {
    title: '3 technicians completed certifications',
    time: 'Today, 09:24',
    description: 'Compliance badges renewed for John T., Maya K., and Darius L.'
  },
  {
    title: 'Predictive alert resolved',
    time: 'Yesterday',
    description: 'Vibration anomaly on Pump A acknowledged and cleared by Sarah M.'
  }
];

const alerts = [
  {
    title: 'Critical asset requires attention',
    body: 'Boiler 5 has hit 110% runtime hours. Auto-generate a preventive order.',
    severity: 'High'
  },
  {
    title: 'Vendor compliance expiring',
    body: 'Northside HVAC contract expires in 12 days. Review renewal terms.',
    severity: 'Medium'
  }
];

export default function Dashboard() {
  return (
    <div className="space-y-10">
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
        {kpiConfig.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg">Open work orders</h2>
              <p className="text-sm text-mutedfg">Prioritized by risk, SLA, and technician workload.</p>
            </div>
            <a href="/work-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              View board
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-6">
            <ProTable
              data={mockWorkOrders.slice(0, 8)}
              columns={columns}
              getRowId={(row) => row.id}
              rowActions={(row) => (
                <a href={`/work-orders/${row.id}`} className="text-sm font-semibold text-brand">
                  Inspect
                </a>
              )}
              emptyState={<EmptyState title="No work orders" description="You’re all caught up for now." icon={<ClipboardList className="h-8 w-8" />} />}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg">Recent activity</h3>
            <ul className="mt-4 space-y-5">
              {activity.map((item) => (
                <li key={item.title} className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-muted/70">
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
                <li key={alert.title} className="rounded-2xl border border-danger/20 bg-white/70 p-4 text-sm text-danger shadow-sm dark:bg-muted/70">
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
