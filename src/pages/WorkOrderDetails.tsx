import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, ClipboardList, User, MapPin, FileText } from 'lucide-react';
import type { ApiError, ApiResponse } from '../../shared/types/http';
import type { WorkOrderSummary } from '../../shared/types/workOrder';
import { api, isApiErrorResponse } from '../lib/api';
import { formatDate, formatWorkOrderStatus } from '../lib/format';

export default function WorkOrderDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    data: workOrder,
    isLoading,
    isError,
    error,
  } = useQuery<WorkOrderSummary, ApiResponse<ApiError>>({
    queryKey: ['work-order', id],
    queryFn: async () => {
      if (!id) {
        throw {
          data: null,
          error: { code: 400, message: 'Work order id is required' },
        } satisfies ApiResponse<ApiError>;
      }

      return api.get<WorkOrderSummary>(`/work-orders/${id}`);
    },
    enabled: Boolean(id),
  });

  const priorityBadge = useMemo(() => {
    const priority = workOrder?.priority ?? 'medium';
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', className: 'bg-danger/10 text-danger' };
      case 'high':
        return { label: 'High', className: 'bg-warning/10 text-warning' };
      case 'low':
        return { label: 'Low', className: 'bg-success/10 text-success' };
      default:
        return { label: 'Medium', className: 'bg-brand/10 text-brand' };
    }
  }, [workOrder?.priority]);

  const statusLabel = workOrder ? formatWorkOrderStatus(workOrder.status) : null;
  const errorMessage = isError
    ? isApiErrorResponse(error)
      ? error.error.message
      : 'Unable to load work order details'
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <button className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm text-fg" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="grid gap-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
          <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded-full bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <button className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm text-fg" onClick={() => navigate('/work-orders')}>
          <ArrowLeft className="h-4 w-4" /> Back to work orders
        </button>
        <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-mutedfg shadow-xl">
          {errorMessage ?? 'Work order not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm text-fg" onClick={() => navigate('/work-orders')}>
        <ArrowLeft className="h-4 w-4" /> Back to work orders
      </button>

      {errorMessage && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {errorMessage}
        </div>
      )}

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-fg">{workOrder.title}</h1>
            <p className="mt-2 text-sm text-mutedfg">{workOrder.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${priorityBadge.className}`}>
              Priority: {priorityBadge.label}
            </span>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase text-brand">
              Status: {statusLabel}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-mutedfg">
          {workOrder.description ?? 'No description provided.'}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-mutedfg md:grid-cols-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Asset: {workOrder.assetId ?? 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Assigned To: {workOrder.assignee?.name ?? 'Unassigned'}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Due Date: {workOrder.dueDate ? formatDate(workOrder.dueDate) : 'TBD'}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location: {workOrder.category ?? 'Not specified'}
          </div>
        </div>

        {workOrder.description && (
          <div className="mt-6 rounded-2xl border border-border bg-white/60 p-4 text-sm text-mutedfg shadow-inner dark:bg-muted/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <FileText className="w-4 h-4" />
              Summary
            </div>
            <p className="mt-2 text-sm">
              {workOrder.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
