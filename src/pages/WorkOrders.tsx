import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar, Download, Filter, ListChecks, Plus, Search, User } from 'lucide-react';
import { FilterBar, type FilterDefinition, type QuickFilter } from '../components/premium/FilterBar';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { SlideOver } from '../components/premium/SlideOver';
import { ConfirmDialog } from '../components/premium/ConfirmDialog';
import { DataBadge } from '../components/premium/DataBadge';
import { EmptyState } from '../components/premium/EmptyState';
import { api } from '../lib/api';

interface WorkOrderRow {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee?: string | null;
  asset?: string | null;
  dueDate?: string | null;
}

interface NotificationState {
  message: string;
  tone: 'success' | 'danger';
}

const filters: FilterDefinition[] = [
  { key: 'search', label: 'Search', type: 'search', placeholder: 'WO ID, asset, or description' },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Assigned', 'In Progress', 'Completed', 'Overdue', 'Cancelled'].map((value) => ({ value, label: value })) },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'].map((value) => ({ value, label: value })) },
  { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'Technician name' },
  { key: 'dueDate', label: 'Due before', type: 'date' }
];

const quickFilters: QuickFilter[] = [
  { key: 'status', value: 'Overdue', label: 'Overdue' },
  { key: 'priority', value: 'Urgent', label: 'Urgent' },
  { key: 'status', value: 'Completed', label: 'Completed' }
];

const statusDisplay: Record<string, { status: string; label: string }> = {
  requested: { status: 'open', label: 'Requested' },
  approved: { status: 'assigned', label: 'Approved' },
  assigned: { status: 'assigned', label: 'Assigned' },
  in_progress: { status: 'in progress', label: 'In Progress' },
  'in progress': { status: 'in progress', label: 'In Progress' },
  completed: { status: 'completed', label: 'Completed' },
  cancelled: { status: 'cancelled', label: 'Cancelled' },
  overdue: { status: 'overdue', label: 'Overdue' },
};

const priorityDisplay: Record<string, { status: string; label: string }> = {
  critical: { status: 'high', label: 'Critical' },
  high: { status: 'high', label: 'High' },
  medium: { status: 'medium', label: 'Medium' },
  low: { status: 'low', label: 'Low' },
  urgent: { status: 'high', label: 'Urgent' },
};

const columns: ProTableColumn<WorkOrderRow>[] = [
  { key: 'id', header: 'WO #' },
  { key: 'title', header: 'Summary' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => {
      const normalized = (row.status ?? 'open').toLowerCase();
      const badge = statusDisplay[normalized];
      return <DataBadge status={badge?.status ?? 'scheduled'} label={badge?.label ?? (row.status ?? 'Open')} />;
    },
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: (row) => {
      const normalized = (row.priority ?? 'medium').toLowerCase();
      const badge = priorityDisplay[normalized];
      const label = badge?.label ?? (row.priority ?? 'Medium');
      return <DataBadge status={badge?.status ?? 'medium'} label={label} />;
    },
  },
  { key: 'assignee', header: 'Owner', accessor: (row) => row.assignee ?? 'Unassigned' },
  { key: 'asset', header: 'Asset', accessor: (row) => row.asset ?? '—' },
  {
    key: 'dueDate',
    header: 'Due',
    accessor: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'),
  },
];

export default function WorkOrders() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({ search: '' });
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
    data,
    isLoading,
    isError,
    error,
  } = useQuery<WorkOrderRow[]>({
    queryKey: ['work-orders'],
    queryFn: () => api.get<WorkOrderRow[]>('/work-orders'),
    retry: 0,
    onError: () => {
      setNotification({
        message: 'Unable to load work orders. Please try again later.',
        tone: 'danger',
      });
    },
  });

  const workOrders = data ?? [];

  const filtered = useMemo(() => {
    const search = (values.search ?? '').trim().toLowerCase();
    return workOrders.filter((order) => {
      const matchesSearch = search
        ? [order.id, order.title, order.asset, order.description].some((field) =>
            typeof field === 'string' && field.toLowerCase().includes(search)
          )
        : true;
      const matchesStatus = values.status ? order.status === values.status : true;
      const matchesPriority = values.priority ? order.priority === values.priority : true;
      const matchesAssignee = values.assignee ? (order.assignee ?? '').toLowerCase().includes(values.assignee.toLowerCase()) : true;
      const matchesDueDate = values.dueDate ? (order.dueDate ?? '') <= values.dueDate : true;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDueDate;
    });
  }, [values, workOrders]);

  const overdueCount = filtered.filter((order) => order.status === 'Overdue').length;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
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
            Track assignments, SLA risk, and technician load. {overdueCount} items need immediate follow-up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <Download className="mr-2 inline h-4 w-4" /> Export report
          </button>
          <button
            onClick={() =>
              setActiveWorkOrder({
                id: `WO-${Date.now()}`,
                title: '',
                description: '',
                status: 'open',
                priority: 'medium',
                assignee: 'Unassigned',
                asset: '',
                dueDate: '',
              })
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" /> New work order
          </button>
        </div>
      </header>
      {isError && (
        <div className="flex items-start gap-3 rounded-3xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Unable to load work orders</p>
            <p className="mt-1 text-danger/80">
              {error instanceof Error ? error.message : 'The backend did not respond.'}
            </p>
          </div>
        </div>
      )}
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
        <ProTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
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
          emptyState={
            <EmptyState
              title="No work orders found"
              description="Try changing your filters or creating a new work order."
              icon={<Calendar className="h-8 w-8" />}
            />
          }
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
                  value={activeWorkOrder.status ?? 'Open'}
                  onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, status: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {['Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Overdue'].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Priority
                <select
                  value={activeWorkOrder.priority ?? 'Medium'}
                  onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, priority: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
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
                value={activeWorkOrder.dueDate ?? ''}
                onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, dueDate: event.target.value })}
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
