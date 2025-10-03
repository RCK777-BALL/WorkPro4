import { format, parseISO } from 'date-fns';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

export function UpcomingPm({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <p>No preventive maintenance scheduled.</p>
        <button type="button" className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
          Schedule PM
        </button>
      </div>
    );
  }

  const normalized = data
    .map((entry) => ({
      date: parseISO(entry.date),
      count: entry.count,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      <ul className="space-y-2">
        {normalized.slice(0, 7).map((item) => (
          <li
            key={item.date.toISOString()}
            className="flex items-center justify-between rounded-xl border border-transparent bg-white/80 px-4 py-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:bg-slate-900/60"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {format(item.date, 'MMMM d')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{dayFormatter.format(item.date)}</p>
            </div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              {item.count} tasks
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-7 gap-2 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-900/60">
        {normalized.slice(0, 14).map((item) => (
          <div
            key={`${item.date.toISOString()}-tile`}
            className="flex flex-col items-center gap-1 rounded-xl border border-transparent bg-white px-2 py-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {dayFormatter.format(item.date)}
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {format(item.date, 'd')}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
