import { Activity, BarChart3, PieChart } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-fg">Analytics</h1>
        <p className="mt-2 text-sm text-mutedfg">Performance dashboards coming soon. Export insights and automate exec-ready reports.</p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        {[{ label: 'Work order throughput', value: '92% on-time' }, { label: 'Average response', value: '1.4h' }, { label: 'MTBF', value: '26 days' }].map((metric) => (
          <article key={metric.label} className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-fg">{metric.value}</p>
          </article>
        ))}
      </section>
      <section className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-sm text-mutedfg">
        <div className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-brand" />
          <div>
            <p className="font-semibold text-fg">Realtime analytics beta</p>
            <p className="mt-1">Connect WorkPro data to BI tools and stream live metrics. Request access from your account team.</p>
          </div>
        </div>
      </section>
      <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6 shadow-xl md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white/70 p-6 text-sm text-mutedfg shadow-inner dark:bg-muted/70">
          <Activity className="mb-3 h-5 w-5 text-brand" />
          Uptime trends for critical assets, ready for predictive modeling.
        </div>
        <div className="rounded-2xl border border-border bg-white/70 p-6 text-sm text-mutedfg shadow-inner dark:bg-muted/70">
          <PieChart className="mb-3 h-5 w-5 text-brand" />
          Workload segmentation by technician, asset class, and cost center.
        </div>
      </section>
    </div>
  );
}
