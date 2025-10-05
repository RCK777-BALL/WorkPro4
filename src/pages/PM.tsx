import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CalendarCheck, Clock, Plus, ChevronLeft, ChevronRight, AlertTriangle, ListChecks } from 'lucide-react';
import { api } from '../lib/api';
import type { PmOverviewResponse, PmUpcomingEventDto, PmTriggerRunDto } from '../../shared/types/pm';
import { cn, formatDate } from '../lib/utils';

function createMonthMatrix(anchor: Date): Date[][] {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startDay = start.getDay();
  const matrixStart = new Date(start);
  matrixStart.setDate(start.getDate() - startDay);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(matrixStart);
      date.setDate(matrixStart.getDate() + week * 7 + day);
      return date;
    }),
  );
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function runStatusClasses(status: PmTriggerRunDto['status']): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'failed':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function summarizeEvent(event: PmUpcomingEventDto): string {
  const date = new Date(event.scheduledFor);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function PM() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const { data, isLoading, error } = useQuery({
    queryKey: ['pm', 'overview'],
    queryFn: () => api.get<PmOverviewResponse>('/pm/overview'),
    staleTime: 60_000,
  });

  const stats = data?.stats ?? { activePrograms: 0, upcomingWeek: 0, overdueTriggers: 0, totalTasks: 0 };
  const upcomingEvents = data?.upcomingEvents ?? [];
  const recentRuns = data?.runs ?? [];
  const programs = data?.programs ?? [];

  const eventMap = useMemo(() => {
    return upcomingEvents.reduce<Map<string, PmUpcomingEventDto[]>>((acc, event) => {
      const key = event.scheduledFor.slice(0, 10);
      const existing = acc.get(key) ?? [];
      existing.push(event);
      acc.set(key, existing);
      return acc;
    }, new Map());
  }, [upcomingEvents]);

  const calendar = useMemo(() => createMonthMatrix(currentMonth), [currentMonth]);
  const todayKey = dateKey(new Date());

  const metrics = [
    {
      label: 'Active programs',
      value: stats.activePrograms,
      icon: CalendarCheck,
      accent: 'bg-brand/10 text-brand',
    },
    {
      label: 'Due this week',
      value: stats.upcomingWeek,
      icon: Clock,
      accent: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Overdue triggers',
      value: stats.overdueTriggers,
      icon: AlertTriangle,
      accent: 'bg-rose-100 text-rose-700',
    },
    {
      label: 'Checklist items',
      value: stats.totalTasks,
      icon: ListChecks,
      accent: 'bg-slate-100 text-slate-700',
    },
  ];

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const monthLabel = monthFormatter.format(currentMonth);

  const handleMonthChange = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Preventive maintenance</h1>
            <p className="mt-2 text-sm text-mutedfg">Automate schedules, checklists, and compliance for recurring maintenance routines.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg" disabled>
            <Plus className="h-4 w-4" /> New PM program
          </button>
        </header>
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <p className="text-sm text-mutedfg">Loading preventive maintenance data…</p>
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <p className="text-sm text-rose-600">{error instanceof Error ? error.message : 'Unable to load preventive maintenance data.'}</p>
        </div>
      </div>
    );
  }

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, accent }) => (
          <article key={label} className="flex items-center justify-between rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-fg">{value}</p>
            </div>
            <span className={cn('rounded-full p-3', accent)}>
              <Icon className="h-5 w-5" />
            </span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6 shadow-xl lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Schedule</h2>
            <div className="flex items-center gap-2 text-sm text-mutedfg">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] text-center font-medium text-fg">{monthLabel}</span>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs text-mutedfg">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-medium uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.map((week, weekIndex) => (
              <Fragment key={weekIndex}>
                {week.map((day) => {
                  const key = dateKey(day);
                  const events = eventMap.get(key) ?? [];
                  const isToday = key === todayKey;
                  const inMonth = day.getMonth() === currentMonth.getMonth();

                  return (
                    <div
                      key={key}
                      className={cn(
                        'min-h-[90px] rounded-2xl border p-2 transition-colors',
                        inMonth ? 'border-border bg-muted/40 text-fg' : 'border-dashed border-border bg-muted/10 text-mutedfg',
                        isToday && 'border-brand bg-brand/10',
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{day.getDate()}</span>
                        {events.length > 0 && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                            {events.length} due
                          </span>
                        )}
                      </div>
                      {events.slice(0, 2).map((event) => (
                        <div key={event.id} className="mt-2 rounded-xl bg-surface px-2 py-1 text-[11px] font-medium text-mutedfg shadow-sm">
                          {event.programName}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <p className="mt-1 text-[10px] text-mutedfg">+{events.length - 2} more</p>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-fg">Upcoming services</h2>
          <ul className="space-y-3">
            {upcomingEvents.slice(0, 6).map((event) => (
              <li key={event.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-fg">{event.programName}</p>
                  <p className="text-xs text-mutedfg">{summarizeEvent(event)}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    event.overdue ? 'bg-rose-100 text-rose-700' : 'bg-brand/10 text-brand',
                  )}
                >
                  {event.overdue ? 'Overdue' : 'Scheduled'}
                </span>
              </li>
            ))}
            {upcomingEvents.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-mutedfg">
                No upcoming PM services scheduled. Create a trigger to populate this list.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6 shadow-xl lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-fg">Recent generations</h2>
          <ul className="space-y-3 text-sm text-mutedfg">
            {recentRuns.slice(0, 6).map((run) => (
              <li key={run.id} className="rounded-2xl border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-fg">{run.programName}</p>
                    <p className="text-xs text-mutedfg">{formatDate(run.runAt)}</p>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', runStatusClasses(run.status))}>
                    {run.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-mutedfg">
                  {run.workOrderId ? `Work order ${run.workOrderId}` : 'No work order generated'}
                </div>
              </li>
            ))}
            {recentRuns.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-mutedfg">
                No scheduler history yet. Enable a trigger to generate preventive maintenance work orders.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-mutedfg">
          <Calendar className="mb-3 h-5 w-5 text-brand" />
          {programs.length > 0 ? (
            <p className="leading-relaxed">
              You have {programs.length} program{programs.length === 1 ? '' : 's'} monitoring {stats.totalTasks} checklist items. Configure
              additional triggers or adjust checklists to keep technicians aligned with critical equipment cadence.
            </p>
          ) : (
            <p className="leading-relaxed">
              Build advanced PM templates with nested checklists, SLA tracking, and meter-based triggers. Start by creating your first
              program to populate this workspace.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
