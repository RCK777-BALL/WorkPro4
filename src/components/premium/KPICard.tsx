import { type ReactNode, useMemo } from 'react';

type DeltaType = 'positive' | 'negative' | 'neutral';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: DeltaType;
  description?: string;
  sparkline?: number[];
  loading?: boolean;
  icon?: ReactNode;
}

function formatPath(values: number[]) {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function KPICard({ title, value, delta, deltaType = 'neutral', description, sparkline = [], loading, icon }: KPICardProps) {
  const path = useMemo(() => formatPath(sparkline), [sparkline]);
  const deltaColor =
    deltaType === 'positive' ? 'text-success' : deltaType === 'negative' ? 'text-danger' : 'text-mutedfg';

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{title}</p>
          <div className="mt-3 text-3xl font-semibold text-fg">
            {loading ? <span className="block h-8 w-24 animate-pulse rounded-lg bg-muted" /> : value}
          </div>
          {delta && (
            <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${deltaColor}`}>
              <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden />
              {delta}
            </p>
          )}
          {description && <p className="mt-3 text-sm text-mutedfg">{description}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          {icon}
        </div>
      </div>
      {sparkline.length > 0 && (
        <div className="mt-6 h-20">
          <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" role="img" aria-label={`${title} trend`}>
            <polyline
              fill="none"
              stroke="var(--brand-2)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={path}
              className="transition-all duration-500 ease-out"
            />
            {sparkline.map((value, index) => {
              if (index === sparkline.length - 1) {
                const min = Math.min(...sparkline);
                const max = Math.max(...sparkline);
                const range = max - min || 1;
                const x = (index / Math.max(sparkline.length - 1, 1)) * 100;
                const y = 100 - ((value - min) / range) * 100;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={3.5}
                    stroke="var(--brand-2)"
                    strokeWidth="1.5"
                    fill="white"
                    className="drop-shadow"
                  />
                );
              }
              return null;
            })}
          </svg>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent transition group-hover:border-brand/40" />
    </article>
  );
}
