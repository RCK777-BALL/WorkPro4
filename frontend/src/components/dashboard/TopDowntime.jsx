import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts';

export function TopDowntime({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <p>No downtime logged for the selected period.</p>
        <button type="button" className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">
          Log Downtime Event
        </button>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.downtimeHours - a.downtimeHours);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ top: 16, right: 16, bottom: 16, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
        <XAxis type="number" tick={{ fill: 'var(--muted-foreground, #64748b)' }} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={120}
          tick={{ fill: 'var(--muted-foreground, #64748b)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value} hrs`, 'Downtime']}
          contentStyle={{ borderRadius: '0.75rem', border: 'none', background: 'rgba(15,23,42,0.9)', color: '#fff' }}
        />
        <Bar dataKey="downtimeHours" fill="#6366f1" radius={[0, 12, 12, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
