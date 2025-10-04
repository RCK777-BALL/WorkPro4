import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, ListChecks, Plus, Search, User } from 'lucide-react';
import type { ApiError, ApiResponse } from '../../shared/types/http';
import type { WorkOrderSummary } from '../../shared/types/workOrder';
import { FilterBar, type FilterDefinition, type QuickFilter } from '../components/premium/FilterBar';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { SlideOver } from '../components/premium/SlideOver';
import { ConfirmDialog } from '../components/premium/ConfirmDialog';
import { DataBadge } from '../components/premium/DataBadge';
import { EmptyState } from '../components/premium/EmptyState';
import { api, isApiErrorResponse } from '../lib/api';
import { formatDate, formatWorkOrderPriority, formatWorkOrderStatus } from '../lib/utils';
import { toWorkOrderRow, type WorkOrderRow } from '../lib/workOrders';

interface NotificationState {
  message: string;
  tone: 'success' | 'danger';
}

interface FilterValues {
  search: string;
  status?: WorkOrderRow['status'];
  priority?: WorkOrderRow['priority'];
  assignee?: string;
  dueDate?: string;
}

const statusOptions: { value: WorkOrderRow['status']; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { value: WorkOrderRow['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const filters: FilterDefinition[] = [
  { key: 'search', label: 'Search', type: 'search', placeholder: 'WO ID, asset, or description' },
  { key: 'status', label: 'Status', type: 'select', options: statusOptions.map((option) => ({ value: option.value, label: option.label })) },
  { key: 'priority', label: 'Priority', type: 'select', options: priorityOptions.map((option) => ({ value: option.value, label: option.label })) },
  { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'Technician name' },
  { key: 'dueDate', label: 'Due before', type: 'date' }
];

const quickFilters: QuickFilter[] = [
  { key: 'status', value: 'in_progress', label: 'In Progress' },
  { key: 'priority', value: 'urgent', label: 'Urgent' },
  { key: 'status', value: 'completed', label: 'Completed' }
];

const columns: ProTableColumn<WorkOrderRow>[] = [
  { key: 'id', header: 'WO #' },
  { key: 'title', header: 'Summary' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={row.statusLabel} />
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: (row) => <DataBadge status={row.priorityLabel} />
  },
  {
    key: 'assignee',
    header: 'Owner',
    accessor: (row) => row.assignee ?? 'Unassigned'
  },
  {
    key: 'assetId',
    header: 'Asset',
    accessor: (row) => row.assetId ?? '—'
  },
  {
    key: 'dueDate',
    header: 'Due',
    accessor: (row) => (row.dueDate ? formatDate(row.dueDate) : '—')
  }
];

const createDraftWorkOrder = (): WorkOrderRow => ({
  id: '',
  title: '',
  description: '',
  status: 'requested',
  statusLabel: formatWorkOrderStatus('requested'),
  priority: 'medium',
  priorityLabel: formatWorkOrderPriority('medium'),
  assignee: null,
  dueDate: null,
  assetId: null
});

export default function WorkOrders() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FilterValues>({ search: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrderRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const {
    data: workOrders = [],
    isLoading,
    isError,
    error,
  } = useQuery<WorkOrderRow[], ApiResponse<ApiError>>({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const result = await api.get<WorkOrderSummary[]>('/work-orders');
      if (!Array.isArray(result)) {
        return [];
      }
      return result.map(toWorkOrderRow);
    }
  });

  const filtered = useMemo(() => {
    const search = values.search?.trim().toLowerCase() ?? '';

    return workOrders.filter((order) => {
      const matchesSearch = search
        ? [order.id, order.title, order.description ?? '', order.assignee ?? '', order.assetId ?? '']
            .filter((field): field is string => typeof field === 'string')
            .some((field) => field.toLowerCase().includes(search))
        : true;
      const matchesStatus = values.status ? order.status === values.status : true;
      const matchesPriority = values.priority ? order.priority === values.priority : true;
      const matchesAssignee = values.assignee
        ? (order.assignee ?? '').toLowerCase().includes(values.assignee.toLowerCase())
        : true;
      const matchesDueDate = values.dueDate ? (order.dueDate ?? '') <= values.dueDate : true;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDueDate;
    });
  }, [values, workOrders]);

  const inProgressCount = filtered.filter((order) => order.status === 'in_progress').length;
  const errorMessage = isError
    ? isApiErrorResponse(error)
      ? error.error.message
      : 'Unable to load work orders'
    : null;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key as keyof FilterValues]: value }));
  };

  const handleReset = () => setValues({ search: '' });

  const handleRowClick = (row: WorkOrderRow) => {
    setActiveWorkOrder(row);
  };

  const handleBulkComplete = () => {
    setDialogOpen(true);
  };

  const confirmBulkComplete = () => {
    setDialogOpen(false);
    if (selectedIds.length === 0) return;
    setNotification({ message: `${selectedIds.length} work orders marked complete`, tone: 'success' });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Work order pipeline</h1>
          <p className="mt-2 text-sm text-mutedfg">
            Track assignments, SLA risk, and technician load. {inProgressCount} items currently in progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <Download className="mr-2 inline h-4 w-4" /> Export report
          </button>
          <button
            onClick={() => setActiveWorkOrder(createDraftWorkOrder())}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" /> New work order
          </button>
        </div>
      </header>
      <div className="rounded-3xl border border-border bg-surface p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mutedfg" />
            <input
              type="search"
              value={values.search ?? ''}
              onChange={(event) => handleChange('search', event.target.value)}
              placeholder="Search work orders"
              className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-mutedfg">
            <Filter className="h-4 w-4" />
            Filters active: {Object.entries(values).filter(([key, value]) => key !== 'search' && value).length}
          </div>
          <button
            type="button"
            onClick={handleBulkComplete}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0}
          >
            <ListChecks className="h-4 w-4" /> Mark complete
          </button>
        </div>
        <FilterBar filters={filters} values={values} onChange={handleChange} onReset={handleReset} quickFilters={quickFilters} sticky={false} />
        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {errorMessage}
          </div>
        )}
        <ProTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id || row.title}
          onRowClick={handleRowClick}
          onSelectionChange={setSelectedIds}
          rowActions={(row) => (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/work-orders/${row.id}`);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
            >
              View
            </button>
          )}
          emptyState={<EmptyState title="No work orders found" description="Try changing your filters or creating a new work order." icon={<Calendar className="h-8 w-8" />} />}
        />
      </div>
      {notification && (
        <div className={`fixed bottom-6 right-6 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
          notification.tone === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
        }`}
        >
          {notification.message}
        </div>
      )}
      <SlideOver
        open={!!activeWorkOrder}
        title={activeWorkOrder?.title ? `Edit ${activeWorkOrder.title}` : 'New work order'}
        description="Quickly adjust assignments, priorities, and schedules."
        onClose={() => setActiveWorkOrder(null)}
      >
        {activeWorkOrder && (
          <div className="space-y-5">
            <label className="block text-sm font-semibold text-mutedfg">
              Title
              <input
                value={activeWorkOrder.title}
                onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, title: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Description
              <textarea
                value={activeWorkOrder.description ?? ''}
                onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, description: event.target.value })}
                className="mt-2 h-32 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Status
                <select
                  value={activeWorkOrder.status}
                  onChange={(event) => {
                    const value = event.target.value as WorkOrderRow['status'];
                    setActiveWorkOrder({
                      ...activeWorkOrder,
                      status: value,
                      statusLabel: formatWorkOrderStatus(value)
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Priority
                <select
                  value={activeWorkOrder.priority}
                  onChange={(event) => {
                    const value = event.target.value as WorkOrderRow['priority'];
                    setActiveWorkOrder({
                      ...activeWorkOrder,
                      priority: value,
                      priorityLabel: formatWorkOrderPriority(value)
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold text-mutedfg">
              Assign to
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-2 text-sm shadow-inner">
                <User className="h-4 w-4 text-mutedfg" />
                <input
                  value={activeWorkOrder.assignee ?? ''}
                  onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, assignee: event.target.value })}
                  className="flex-1 bg-transparent text-fg outline-none"
                  placeholder="Add technician"
                />
              </div>
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Due date
              <input
                type="date"
                value={activeWorkOrder.dueDate ? activeWorkOrder.dueDate.slice(0, 10) : ''}
                onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, dueDate: event.target.value || null })}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveWorkOrder(null)}
                className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotification({ message: 'Work order saved', tone: 'success' });
                  setActiveWorkOrder(null);
                }}
                className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg"
              >
                Save changes
              </button>
            </div>
          </div>
        )}
      </SlideOver>
      <ConfirmDialog
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onConfirm={confirmBulkComplete}
        title="Complete selected work orders?"
        description="Completed work orders will update technician availability and notify subscribers."
        confirmLabel="Mark complete"
      />
    </div>
  );
}
