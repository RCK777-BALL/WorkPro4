import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const PRIORITY_COLORS = {
  critical: '#f43f5e',
  high: '#f97316',
  medium: '#6366f1',
  low: '#10b981',
};

export function StackedBar({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <p>No work orders match the selected filters.</p>
        <button type="button" className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
          Create Work Order
        </button>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} stackOffset="expand" margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
        <XAxis dataKey="status" tick={{ fill: 'var(--muted-foreground, #64748b)', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fill: 'var(--muted-foreground, #64748b)', fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(79, 70, 229, 0.08)' }}
          formatter={(value, name) => [value, name]}
          contentStyle={{ borderRadius: '0.75rem', border: 'none', background: 'rgba(15,23,42,0.9)', color: '#fff' }}
        />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
        {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
          <Bar
            key={priority}
            dataKey={priority}
            stackId="priority"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
