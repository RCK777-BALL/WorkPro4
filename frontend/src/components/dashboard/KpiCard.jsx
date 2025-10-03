import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Sparkline from './Sparkline';

const DEFAULT_SERIES = [12, 18, 14, 20, 22, 24, 21];

function DeltaBadge({ value }) {
  if (value === undefined || value === null) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }

  const positive = numeric >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const tone = positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      aria-label={`Change ${positive ? 'up' : 'down'} ${Math.abs(numeric).toFixed(1)} percent`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {Math.abs(numeric).toFixed(1)}%
    </span>
  );
}

function formatSeries(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return DEFAULT_SERIES;
  }
  return series.map((value) => Number(value) || 0);
}

export function KpiCard({
  title,
  value,
  delta,
  timeframe = '30d',
  breakdown,
  series,
  accent = 'indigo',
}) {
  const displayValue = typeof value === 'number' ? value : 0;
  const safeSeries = formatSeries(series);
  const badgeClasses = {
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  const accentBadge = badgeClasses[accent] ?? badgeClasses.indigo;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</CardTitle>
        <Badge className={`${accentBadge} border-0 text-xs font-medium uppercase tracking-wide`} aria-label={`Timeframe ${timeframe}`}>
          {timeframe}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <DeltaBadge value={delta} />
        </div>
        <div className="mt-3">
          <Sparkline
            data={safeSeries}
            color={accent === 'emerald' ? '#10b981' : accent === 'amber' ? '#f59e0b' : '#4f46e5'}
            ariaLabel={`${title} trend sparkline`}
          />
        </div>
        {breakdown && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-4">
            {Object.entries(breakdown).map(([key, amount]) => (
              <div
                key={key}
                className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"
                role="group"
                aria-label={`${key} count ${amount}`}
              >
                <span className="capitalize text-[11px] tracking-wide text-slate-500 dark:text-slate-400">{key}</span>
                <span className="text-sm font-semibold tabular-nums">{Number(amount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
