import { AlertTriangle, Package, PackageSearch, Plus, TrendingDown } from 'lucide-react';

const stats = [
  { label: 'Total SKUs', value: '1,250', icon: Package },
  { label: 'Low stock', value: '23', icon: AlertTriangle },
  { label: 'Backordered', value: '8', icon: TrendingDown },
  { label: 'Inventory value', value: '$125K', icon: PackageSearch }
];

const lowStock = [
  { sku: 'PUMP-SEAL-001', description: 'Pump seal kit', site: 'Plant 1', onHand: 3 },
  { sku: 'BELT-V-002', description: 'V-belt 4L360', site: 'Plant 2', onHand: 2 },
  { sku: 'FILTER-12', description: 'HEPA Filter', site: 'Corporate HQ', onHand: 1 }
];

export default function Inventory() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Inventory</h1>
          <p className="mt-2 text-sm text-mutedfg">Monitor critical spares, reorder signals, and part availability across sites.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <Plus className="h-4 w-4" /> New part
        </button>
      </header>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
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
          <button className="rounded-2xl border border-border px-3 py-1 text-xs font-semibold text-fg">Export CSV</button>
        </div>
        <div className="mt-6 space-y-3">
          {lowStock.map((item) => (
            <div key={item.sku} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-mutedfg">
              <div>
                <p className="font-semibold text-fg">{item.sku}</p>
                <p>{item.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-mutedfg">{item.site}</span>
                <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">{item.onHand} on hand</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-mutedfg">
        <p className="font-semibold text-fg">Upcoming: predictive inventory</p>
        <p className="mt-2">Forecast consumption and automate reorders with lead time insights. Contact your account team to join the beta.</p>
      </section>
    </div>
  );
}
