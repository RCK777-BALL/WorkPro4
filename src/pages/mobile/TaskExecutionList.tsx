import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CircleCheckBig, RefreshCw, SendHorizontal, WifiOff } from 'lucide-react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useOfflineQuery } from '../../hooks/useOfflineQuery';
import { mockWorkOrders, type MockWorkOrder } from '../../lib/mockWorkOrders';

function formatTimestamp(value: number | null): string {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export default function TaskExecutionList() {
  const navigate = useNavigate();
  const { pendingMutations, status, isOnline, flushQueue, message, lastUpdated } = useOfflineQueue();
  const {
    data,
    isFetching,
    error,
    servedFromCache,
  } = useOfflineQuery<MockWorkOrder[]>({
    queryKey: ['mobile', 'tasks'],
    endpoint: '/work-orders',
    fallbackData: mockWorkOrders,
  });

  const tasks = useMemo(() => data ?? mockWorkOrders, [data]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 bg-background px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Task execution</h1>
        <p className="text-sm text-mutedfg">
          Review assignments, capture completions, and stay productive even when the connection drops.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-xl">
        <div className="flex flex-col gap-3 text-sm text-mutedfg">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <CircleCheckBig className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-warning" />
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {isOnline ? 'Online — live updates enabled' : 'Offline mode active'}
              </p>
              <p>
                {isOnline
                  ? 'Changes sync instantly when connectivity is available.'
                  : 'We will queue updates locally and send them as soon as you regain service.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-mutedfg">Queued updates</span>
              <span className="text-base font-semibold text-foreground">
                {pendingMutations}
              </span>
              <span className="text-xs text-mutedfg">
                Status: {status}{' '}
                {lastUpdated ? `• Last change ${formatTimestamp(lastUpdated)}` : ''}
              </span>
              {message ? <span className="text-xs text-warning">{message}</span> : null}
            </div>
            <button
              type="button"
              onClick={flushQueue}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <SendHorizontal className="h-4 w-4" /> Sync now
            </button>
          </div>
          {servedFromCache ? (
            <div className="flex items-center gap-2 rounded-xl border border-accent bg-mutedSurface p-3 text-xs text-foreground">
              <AlertCircle className="h-4 w-4 text-accent" />
              Viewing cached data — refresh once connectivity returns to pull the latest records.
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Assignments</h2>
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-mutedfg">
              <RefreshCw className="h-3 w-3 animate-spin" /> Refreshing
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-danger bg-mutedSurface p-4 text-sm text-danger">
            Failed to load work orders. {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : null}

        <div className="grid gap-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(`/mobile/tasks/${task.id}`)}
              className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-mutedfg">{task.id}</span>
                <span className="rounded-full bg-mutedSurface px-3 py-1 text-xs font-semibold text-brand">
                  {task.priority}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
              <p className="text-sm text-mutedfg line-clamp-2">{task.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-mutedfg">
                <span>Status: <span className="font-semibold text-foreground">{task.status}</span></span>
                {task.assignee ? <span>Owner: <span className="font-semibold text-foreground">{task.assignee}</span></span> : null}
                {task.dueDate ? <span>Due: <span className="font-semibold text-foreground">{task.dueDate}</span></span> : null}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
