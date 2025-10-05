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
import { api, isApiErrorResponse, workOrdersApi } from '../lib/api';
import { formatDate, formatWorkOrderPriority, formatWorkOrderStatus } from '../lib/format';
import { normalizeWorkOrders, type WorkOrderRecord } from '../lib/workOrders';

interface ToastState {
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
  { key: 'dueBefore', label: 'Due before', type: 'date' },
];

const quickFilters: QuickFilter[] = [
  { key: 'status', value: 'in_progress', label: 'In Progress' },
  { key: 'priority', value: 'urgent', label: 'Urgent' },
  { key: 'status', value: 'completed', label: 'Completed' }
];

const columns: ProTableColumn<WorkOrderRecord>[] = [
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
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrderRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const {
    data: workOrders,
    isLoading,
    isError,
    error,
  } = useQuery<WorkOrderRecord[]>({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const result = await api.get<unknown>('/work-orders');
      return normalizeWorkOrders(result);
    },
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : 'Unable to load work orders';
      setQueryError(message);
      setNotification({ message, tone: 'danger' });
      return;
    }

    setQueryError(null);
  }, [isError, error]);

  const workOrderRows = workOrders ?? [];

  const filtered = useMemo(() => {
    const search = (values.search ?? '').trim().toLowerCase();
    return workOrderRows.filter((order) => {
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
  }, [values, workOrderRows]);

  const inProgressCount = filtered.filter((order) => order.status === 'in_progress').length;
  const errorMessage = isError
    ? isApiErrorResponse(error)
      ? error.error.message
      : 'Unable to load work orders'
    : null;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key as keyof FilterValues]: value }));
  };

  const confirmBulkAction = () => {
    if (!pendingAction) return;

  const handleRowClick = (row: WorkOrderRecord) => {
    setActiveWorkOrder(row);
  };

  const handleDuplicate = () => {
    if (!canManage) {
      showToast('You are not authorized to duplicate work orders', 'danger');
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    duplicateMutation.mutate([...selectedIds]);
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<WorkOrderFormValues>[];
        const mapped = parsed
          .map((item) => ({
            title: item.title ?? '',
            description: item.description,
            status: normalizeStatus(item.status),
            priority: normalizePriority(item.priority),
            dueDate: item.dueDate,
            category: item.category,
          }))
          .filter((item) => item.title.trim().length >= 3);

        if (mapped.length === 0) {
          throw new Error('No valid records found in file');
        }

        importMutation.mutate(mapped);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json<Record<string, string>>(sheet);
        const mapped: WorkOrderFormValues[] = rows
          .map((row) => ({
            title: String(row.title ?? row.Title ?? '').trim(),
            description: (row.description ?? row.Description ?? '').toString(),
            status: normalizeStatus(row.status ?? row.Status ?? 'requested'),
            priority: normalizePriority(row.priority ?? row.Priority ?? 'medium'),
            dueDate: row.dueDate ?? row['Due Date'] ?? undefined,
            category: row.category ?? row.Category ?? undefined,
          }))
          .filter((item) => item.title && item.title.length >= 3);
        if (mapped.length === 0) {
          throw new Error('No valid rows found to import');
        }
        importMutation.mutate(mapped);
      }
    } catch (error) {
      setIsImporting(false);
      const message = error instanceof Error ? error.message : 'Failed to import file';
      showToast(message, 'danger');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportCurrentQuery = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const exportLimit = Math.min(data?.total ?? queryState.limit, 1000);
      const result = await workOrdersApi.export({
        page: 1,
        limit: exportLimit,
        search: queryState.search || undefined,
        assignee: queryState.assignee || undefined,
        status: queryState.status || undefined,
        priority: queryState.priority || undefined,
        dueBefore: queryState.dueBefore || undefined,
        sortBy: queryState.sortBy,
        sortDir: queryState.sortDir,
      });

      const flattened = result.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: toTitleCase(item.status),
        priority: toTitleCase(item.priority),
        assignee: item.assignee?.name ?? 'Unassigned',
        asset: item.asset?.name ?? '',
        dueDate: item.dueDate ?? '',
        createdAt: item.createdAt,
      }));

      const worksheet = utils.json_to_sheet(flattened);

      if (format === 'csv') {
        const csv = utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'work-orders.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
      } else {
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Work Orders');
        writeFile(workbook, 'work-orders.xlsx');
      }

      showToast(`Exported ${flattened.length} work orders`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export work orders';
      showToast(message, 'danger');
    } finally {
      setExporting(false);
    }
  };

  const filtersActive = useMemo(() => {
    return Object.entries(queryState).filter(([key, value]) => {
      if (['page', 'limit', 'sortBy', 'sortDir'].includes(key)) {
        return false;
      }
      return Boolean(value);
    }).length;
  }, [queryState]);

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
          <div className="flex items-center gap-2 text-xs font-semibold text-mutedfg">
            <Filter className="w-4 h-4" />
            Filters active: {filtersActive}
          </div>
          <button
            type="button"
            onClick={() => exportCurrentQuery('csv')}
            className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={exporting}
            data-testid="work-orders-export-csv"
            title={!canManage ? 'Limited export still available' : 'Export current view as CSV'}
          >
            <Download className="inline w-4 h-4 mr-2" /> Export CSV
          </button>
          <button
            onClick={() => setActiveWorkOrder(createDraftWorkOrder())}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="w-4 h-4" /> New work order
          </button>
        </div>
      </header>

      <div className="p-4 border shadow-xl rounded-3xl border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/60">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-mutedfg" />
            <input
              type="search"
              value={queryState.search}
              onChange={(event) => setQueryState({ search: event.target.value, page: 1 })}
              placeholder="Search work orders"
              className="w-full px-10 py-3 text-sm transition bg-white border shadow-inner outline-none rounded-2xl border-border text-fg focus:ring-2 focus:ring-brand"
              data-testid="work-orders-search"
            />
          </div>
          <select
            value={queryState.sortBy}
            onChange={(event) => setQueryState({ sortBy: event.target.value as QueryState['sortBy'], page: 1 })}
            className="px-4 py-2 text-xs font-semibold bg-white border shadow-sm rounded-2xl border-border text-fg"
            data-testid="work-orders-sort-field"
          >
            {sortingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>
          <select
            value={queryState.sortDir}
            onChange={(event) => setQueryState({ sortDir: event.target.value as QueryState['sortDir'], page: 1 })}
            className="px-4 py-2 text-xs font-semibold bg-white border shadow-sm rounded-2xl border-border text-fg"
            data-testid="work-orders-sort-direction"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button
            type="button"
            onClick={() => handleBulkAction('complete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Mark selected work orders complete' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-complete"
          >
            <ListChecks className="w-4 h-4" /> Mark complete
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('archive')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Archive selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-archive"
          >
            <Calendar className="w-4 h-4" /> Archive
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Duplicate selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-duplicate"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('delete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-danger shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canDelete}
            title={canDelete ? 'Delete selected work orders' : 'Requires supervisor or admin role'}
            data-testid="work-orders-delete"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('archive')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Archive selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-archive"
          >
            <Calendar className="w-4 h-4" /> Archive
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Duplicate selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-duplicate"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('delete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-danger shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canDelete}
            title={canDelete ? 'Delete selected work orders' : 'Requires supervisor or admin role'}
            data-testid="work-orders-delete"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
        <FilterBar filters={filters} values={values} onChange={handleChange} onReset={handleReset} quickFilters={quickFilters} sticky={false} />
        {queryError && (
          <div className="px-4 py-3 mb-4 text-sm border rounded-2xl border-danger/20 bg-danger/10 text-danger">
            {queryError}
          </div>
        )}
        <ProTable
          data={workOrders}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id || row.title}
          onRowClick={handleRowClick}
          onSelectionChange={setSelectedIds}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/work-orders/${row.id}`);
                }}
                className="px-3 py-1 text-xs font-semibold border rounded-full border-border text-brand hover:bg-brand/10"
                data-testid={`work-orders-view-${row.id}`}
              >
                View
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveWorkOrderId(row.id);
                }}
                className="px-3 py-1 text-xs font-semibold border rounded-full border-border text-fg hover:bg-muted"
                data-testid={`work-orders-edit-${row.id}`}
                disabled={!canManage}
                title={canManage ? 'Edit work order' : 'Requires planner, supervisor, or admin role'}
              >
                Edit
              </button>
            </div>
          )}
          emptyState={<EmptyState title="No work orders found" description="Try changing your filters or creating a new work order." icon={<Calendar className="w-8 h-8" />} />}
          onExportCsv={() => exportCurrentQuery('csv')}
          onExportXlsx={() => exportCurrentQuery('xlsx')}
          exportDisabled={exporting}
          pagination={{
            page: queryState.page,
            pageSize: queryState.limit,
            totalPages: data?.totalPages ?? 1,
            totalItems: data?.total ?? 0,
            onPageChange: (page) => setQueryState({ page }),
            onPageSizeChange: (limit) => setQueryState({ limit, page: 1 }),
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
            toast.tone === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
          }`}
          data-testid="work-orders-toast"
        >
          {toast.message}
        </div>
      )}

      <SlideOver
        open={!!activeWorkOrderId}
        title={activeWorkOrderId && activeWorkOrderId !== 'new' ? 'Edit work order' : 'New work order'}
        description="Quickly adjust assignments, priorities, and schedules."
        onClose={() => setActiveWorkOrderId(null)}
      >
        <form className="space-y-5" onSubmit={handleFormSubmit} data-testid="work-orders-form">
          <label className="block text-sm font-semibold text-mutedfg">
            Title
            <input
              {...form.register('title')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-title"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {form.formState.errors.title && (
              <span className="block mt-1 text-xs text-danger">{form.formState.errors.title.message}</span>
            )}
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Description
            <textarea
              {...form.register('description')}
              className="w-full h-32 px-4 py-3 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-description"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {form.formState.errors.description && (
              <span className="block mt-1 text-xs text-danger">{form.formState.errors.description.message}</span>
            )}
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-mutedfg">
              Status
              <select
                {...form.register('status')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                data-testid="work-orders-form-status"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {statusOptions?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
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
                  className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
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
              Priority
              <select
                {...form.register('priority')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                data-testid="work-orders-form-priority"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {priorityOptions?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-mutedfg">
            Assign to
            <div className="flex items-center gap-3 px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border">
              <User className="w-4 h-4 text-mutedfg" />
              <input
                type="date"
                value={activeWorkOrder.dueDate ? activeWorkOrder.dueDate.slice(0, 10) : ''}
                onChange={(event) => setActiveWorkOrder({ ...activeWorkOrder, dueDate: event.target.value || null })}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Due date
            <input
              type="date"
              {...form.register('dueDate')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-due"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Category
            <input
              {...form.register('category')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-category"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveWorkOrderId(null)}
              className="px-4 py-2 text-sm font-semibold border rounded-2xl border-border text-fg"
              data-testid="work-orders-form-cancel"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white shadow-lg rounded-2xl bg-brand disabled:opacity-60"
              data-testid="work-orders-form-submit"
              disabled={createMutation.isPending || updateMutation.isPending || !canManage}
              title={canManage ? 'Save changes' : 'Requires planner, supervisor, or admin role'}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={pendingAction != null}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmBulkAction}
        title={
          pendingAction === 'delete'
            ? 'Delete selected work orders?'
            : pendingAction === 'archive'
            ? 'Archive selected work orders?'
            : 'Complete selected work orders?'
        }
        description={
          pendingAction === 'delete'
            ? 'This action cannot be undone and will permanently remove the records.'
            : pendingAction === 'archive'
            ? 'Archived work orders will be hidden from active views.'
            : 'Completed work orders will update technician availability and notify subscribers.'
        }
        confirmLabel={pendingAction === 'delete' ? 'Delete' : pendingAction === 'archive' ? 'Archive' : 'Mark complete'}
        tone={pendingAction === 'delete' ? 'danger' : 'default'}
        data-testid="work-orders-confirm"
      />

      {isImporting && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="px-6 py-4 text-sm font-semibold bg-white shadow-xl rounded-2xl text-fg">Importing work orders…</div>
        </div>
      )}
    </div>
  );
}

