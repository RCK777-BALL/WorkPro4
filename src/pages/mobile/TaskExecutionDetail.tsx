import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ChevronLeft, ClipboardList, Loader2, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useOfflineQuery } from '../../hooks/useOfflineQuery';
import { api, ApiRequestError } from '../../lib/api';
import { getMockWorkOrderById, type MockWorkOrder } from '../../lib/mockWorkOrders';

export default function TaskExecutionDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline, pendingMutations, status: queueStatus, message } = useOfflineQueue();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fallback = id ? getMockWorkOrderById(id) ?? null : null;
  const {
    data,
    isFetching,
    error,
    servedFromCache,
  } = useOfflineQuery<MockWorkOrder | null>({
    queryKey: ['mobile', 'task', id],
    endpoint: `/work-orders/${id}`,
    enabled: Boolean(id),
    fallbackData: fallback,
  });

  const task = data ?? fallback;

  const updateStatus = async (nextStatus: string) => {
    if (!id) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await api.put(`/work-orders/${id}`, { status: nextStatus });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile', 'tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile', 'task', id] }),
      ]);
      setFeedback('Status updated successfully.');
    } catch (err) {
      if (err instanceof ApiRequestError && err.offline) {
        setFeedback('You are offline. The change has been queued and will sync automatically.');
      } else {
        setFeedback(err instanceof Error ? err.message : 'Unable to update work order.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-4 bg-background px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/mobile/tasks')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
        >
          <ChevronLeft className="h-4 w-4" /> Back to tasks
        </button>
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-mutedfg">
          No task was selected.
        </div>
      </div>
    );
  }

  if (!task && !isFetching) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-4 bg-background px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/mobile/tasks')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
        >
          <ChevronLeft className="h-4 w-4" /> Back to tasks
        </button>
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-mutedfg">
          We could not find a cached copy of this work order.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 bg-background px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => navigate('/mobile/tasks')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
      >
        <ChevronLeft className="h-4 w-4" /> Back to tasks
      </button>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{task?.id}</span>
          <h1 className="text-2xl font-semibold text-foreground">{task?.title}</h1>
          <p className="text-sm text-mutedfg">{task?.description}</p>
          {isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs text-mutedfg">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing latest data…
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-mutedSurface p-4 text-sm text-mutedfg sm:grid-cols-2">
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Status</span>
            <p className="text-base font-semibold text-foreground">{task?.status ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Priority</span>
            <p className="text-base font-semibold text-foreground">{task?.priority ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Asset</span>
            <p className="text-base text-foreground">{task?.asset ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Owner</span>
            <p className="text-base text-foreground">{task?.assignee ?? 'Unassigned'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Due</span>
            <p className="text-base text-foreground">{task?.dueDate ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-mutedfg">Created</span>
            <p className="text-base text-foreground">{task?.createdDate ?? '—'}</p>
          </div>
        </div>

        {task?.instructions ? (
          <div className="mt-4 rounded-2xl border border-border bg-mutedSurface p-4 text-sm text-foreground">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <ClipboardList className="h-4 w-4 text-accent" /> Execution notes
            </div>
            <p className="leading-relaxed text-mutedfg">{task.instructions}</p>
          </div>
        ) : null}

        {servedFromCache ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-accent bg-mutedSurface p-3 text-xs text-foreground">
            <WifiOff className="h-4 w-4 text-accent" /> Working from cached data.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-danger bg-mutedSurface p-3 text-sm text-danger">
            Failed to refresh the work order. {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : null}
      </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-foreground">Update status</h2>
            <p className="text-sm text-mutedfg">
              {isOnline
                ? 'Push updates as you complete work. Offline changes queue automatically.'
                : 'Offline mode — submit updates and we will sync them when you reconnect.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => updateStatus('In Progress')}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Start task
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => updateStatus('Completed')}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Mark complete
              </button>
            </div>

            <div className="text-xs text-mutedfg">
              Pending sync: {pendingMutations} • Status: {queueStatus}
              {message ? ` — ${message}` : ''}
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-accent bg-mutedSurface p-3 text-sm text-foreground">{feedback}</div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }
