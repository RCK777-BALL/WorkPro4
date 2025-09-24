import { CalendarCheck, Clock, Plus } from 'lucide-react';

const cadence = [
  { label: 'Weekly routines', value: '42 active' },
  { label: 'Monthly inspections', value: '18 scheduled' },
  { label: 'Annual shutdown tasks', value: '5 planned' }
];

export default function PM() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Preventive maintenance</h1>
          <p className="mt-2 text-sm text-mutedfg">Automate schedules, checklists, and compliance for recurring maintenance routines.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <Plus className="h-4 w-4" /> New PM program
        </button>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {cadence.map((item) => (
          <article key={item.label} className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-fg">{item.value}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6 shadow-xl lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-fg">Upcoming services</h2>
          <ul className="mt-4 space-y-3 text-sm text-mutedfg">
            <li className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span>Generator load test — Plant 2</span>
              <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">Due in 2 days</span>
            </li>
            <li className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span>HVAC filter replacement — HQ</span>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Next week</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-mutedfg">
          <CalendarCheck className="mb-3 h-5 w-5 text-brand" />
          Build advanced PM templates with nested checklists, SLA tracking, and sensor-driven triggers. Contact support to unlock the beta.
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-surface p-6 text-sm text-mutedfg shadow-xl">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-brand" />
          <div>
            <p className="font-semibold text-fg">Optimize your cadence</p>
            <p className="mt-1">Sync PM tasks with runtime meters and technician availability to minimize downtime.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
