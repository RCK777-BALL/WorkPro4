import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, Copy, Download, Filter, ListChecks, Plus, Search, Trash2 } from 'lucide-react';
import { FilterBar, type FilterDefinition, type QuickFilter } from '../components/premium/FilterBar';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { SlideOver } from '../components/premium/SlideOver';
import { ConfirmDialog } from '../components/premium/ConfirmDialog';
import { DataBadge } from '../components/premium/DataBadge';
import { EmptyState } from '../components/premium/EmptyState';
import { ApiError, ApiRequestError, ApiResponse, isApiErrorResponse, PaginatedWorkOrders, SaveWorkOrderPayload, type WorkOrderListItem, WorkOrderPriority, workOrdersApi, WorkOrderStatus } from '../lib/api';
import { formatDate, formatWorkOrderPriority, formatWorkOrderStatus } from '../lib/format';
import { useToast } from '@/components/ui/toast';
import { useCan } from '@/lib/rbac';
import { toTitleCase } from '@/lib/utils';
import { createCsvFromRecords, exportArrayToXlsx, parseXlsxRows } from '@/lib/xlsx';

type QueryState = {
  page: number;
  limit: number;
  search: string;
  status: WorkOrderStatus | '';
  priority: WorkOrderPriority | '';
  assignee: string;
  dueBefore: string;
  sortBy: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortDir: 'asc' | 'desc';
};

const initialQueryState: QueryState = {
  page: 1,
  limit: 10,
  search: '',
  status: '',
  priority: '',
  assignee: '',
  dueBefore: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
};

const statusOptions: { value: WorkOrderStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { value: WorkOrderPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const sortingOptions: { value: QueryState['sortBy']; label: string }[] = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },
];

const filters: FilterDefinition[] = [
  { key: 'status', label: 'Status', type: 'select', options: statusOptions.map((option) => ({ value: option.value, label: option.label })) },
  { key: 'priority', label: 'Priority', type: 'select', options: priorityOptions.map((option) => ({ value: option.value, label: option.label })) },
  { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'Technician name' },
  { key: 'dueBefore', label: 'Due before', type: 'date' },
];

const quickFilters: QuickFilter[] = [
  { key: 'status', value: 'in_progress', label: 'In Progress' },
  { key: 'priority', value: 'urgent', label: 'Urgent' },
  { key: 'status', value: 'completed', label: 'Completed' },
];

type WorkOrderTableRow = {
  id: string;
  title: string;
  status: WorkOrderStatus;
  statusLabel: string;
  priority: WorkOrderPriority;
  priorityLabel: string;
  assigneeName: string;
  assetName: string;
  assetId: string | null;
  dueDate: string | null;
  createdAt: string;
  description: string;
  category: string;
};

type WorkOrderFormValues = {
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  dueDate: string;
  category: string;
  assigneeId: string;
  assetId: string;
};

const defaultFormValues: WorkOrderFormValues = {
  title: '',
  description: '',
  status: 'requested',
  priority: 'medium',
  dueDate: '',
  category: '',
  assigneeId: '',
  assetId: '',
};

const statusSet = new Set<WorkOrderStatus>(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']);
const prioritySet = new Set<WorkOrderPriority>(['low', 'medium', 'high', 'urgent']);

function normalizeStatus(value: unknown): WorkOrderStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
    if (statusSet.has(normalized as WorkOrderStatus)) {
      return normalized as WorkOrderStatus;
    }
  }
  return 'requested';
}

function normalizePriority(value: unknown): WorkOrderPriority {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (prioritySet.has(normalized as WorkOrderPriority)) {
      return normalized as WorkOrderPriority;
    }
  }
  return 'medium';
}

function mapToTableRow(record: WorkOrderListItem): WorkOrderTableRow {
  const assetName = record.asset?.name ?? record.asset?.code ?? record.assetId ?? '';
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    statusLabel: formatWorkOrderStatus(record.status),
    priority: record.priority,
    priorityLabel: formatWorkOrderPriority(record.priority),
    assigneeName: record.assignee?.name ?? 'Unassigned',
    assetName,
    assetId: record.asset?.id ?? record.assetId ?? null,
    dueDate: record.dueDate ?? null,
    createdAt: record.createdAt,
    description: record.description ?? '',
    category: record.category ?? '',
  };
}

const columns: ProTableColumn<WorkOrderTableRow>[] = [
  { key: 'id', header: 'WO #' },
  { key: 'title', header: 'Summary' },
  {
    key: 'status',
    header: 'Status',
    accessor: (row) => <DataBadge status={row.statusLabel} />,
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: (row) => <DataBadge status={row.priorityLabel} />,
  },
  {
    key: 'assigneeName',
    header: 'Owner',
    accessor: (row) => row.assigneeName ?? 'Unassigned',
  },
  {
    key: 'assetName',
    header: 'Asset',
    accessor: (row) => row.assetName || '—',
  },
  {
    key: 'dueDate',
    header: 'Due',
    accessor: (row) => (row.dueDate ? formatDate(row.dueDate) : '—'),
  },
];

function buildPayload(values: WorkOrderFormValues): SaveWorkOrderPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() ? values.description.trim() : undefined,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
    category: values.category.trim() ? values.category.trim() : null,
    assigneeId: values.assigneeId.trim() ? values.assigneeId.trim() : null,
    assetId: values.assetId.trim() ? values.assetId.trim() : null,
  };
}

export default function WorkOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const canManage = useCan('manage', 'workOrder');
  const canDelete = useCan('delete', 'workOrder');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [queryState, setQueryState] = useState<QueryState>(initialQueryState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<'complete' | 'archive' | 'delete' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);

  const form = useForm<WorkOrderFormValues>({ defaultValues: defaultFormValues });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedWorkOrders, ApiResponse<ApiError>>({
    queryKey: ['work-orders', queryState],
    queryFn: () => workOrdersApi.list(queryState),
    keepPreviousData: true,
  });

  const tableRows = useMemo(() => (data?.items ?? []).map(mapToTableRow), [data?.items]);
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const inProgressCount = useMemo(
    () => tableRows.filter((row) => row.status === 'in_progress').length,
    [tableRows],
  );

  const queryErrorMessage = isError
    ? isApiErrorResponse(error)
      ? error.error?.message ?? 'Unable to load work orders'
      : errorMessage(error, 'Unable to load work orders')
    : null;

  const filtersActive = useMemo(() => {
    return [queryState.search, queryState.status, queryState.priority, queryState.assignee, queryState.dueBefore].filter(
      (value) => Boolean(value),
    ).length;
  }, [queryState]);

  const filterValues = useMemo(
    () => ({
      status: queryState.status,
      priority: queryState.priority,
      assignee: queryState.assignee,
      dueBefore: queryState.dueBefore,
    }),
    [queryState.status, queryState.priority, queryState.assignee, queryState.dueBefore],
  );

  useEffect(() => {
    if (drawerMode === 'edit' && activeWorkOrderId) {
      const record = data?.items.find((item) => item.id === activeWorkOrderId);
      if (record) {
        reset({
          title: record.title,
          description: record.description ?? '',
          status: record.status,
          priority: record.priority,
          dueDate: record.dueDate ? record.dueDate.slice(0, 10) : '',
          category: record.category ?? '',
          assigneeId: record.assigneeId ?? '',
          assetId: record.asset?.id ?? record.assetId ?? '',
        });
      }
    } else if (drawerMode === 'create') {
      reset(defaultFormValues);
    }
  }, [drawerMode, activeWorkOrderId, data?.items, reset]);

  const createMutation = useMutation({
    mutationFn: (payload: SaveWorkOrderPayload) => workOrdersApi.create(payload),
    onSuccess: (created) => {
      showToast({
        title: 'Work order created',
        description: created.title,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setDrawerMode(null);
      setActiveWorkOrderId(null);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to create work order',
        description: errorMessage(mutationError, 'Unable to create work order'),
        variant: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SaveWorkOrderPayload }) => workOrdersApi.update(id, payload),
    onSuccess: (updated) => {
      showToast({
        title: 'Work order updated',
        description: updated.title,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setDrawerMode(null);
      setActiveWorkOrderId(null);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to update work order',
        description: errorMessage(mutationError, 'Unable to update work order'),
        variant: 'error',
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkDuplicate(ids),
    onSuccess: (result) => {
      showToast({
        title: 'Work orders duplicated',
        description: `${result.length} work orders duplicated`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setSelectedIds([]);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to duplicate work orders',
        description: errorMessage(mutationError, 'Unable to duplicate work orders'),
        variant: 'error',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkComplete(ids),
    onSuccess: (result) => {
      showToast({
        title: 'Work orders marked complete',
        description: `${result.length} work orders updated`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setSelectedIds([]);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to mark work orders complete',
        description: errorMessage(mutationError, 'Unable to mark work orders complete'),
        variant: 'error',
      });
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkArchive(ids),
    onSuccess: (result) => {
      showToast({
        title: 'Work orders archived',
        description: `${result.length} work orders archived`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setSelectedIds([]);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to archive work orders',
        description: errorMessage(mutationError, 'Unable to archive work orders'),
        variant: 'error',
      });
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkDelete(ids),
    onSuccess: (result) => {
      showToast({
        title: 'Work orders deleted',
        description: `${result.count} work orders removed`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setSelectedIds([]);
    },
    onError: (mutationError) => {
      showToast({
        title: 'Failed to delete work orders',
        description: errorMessage(mutationError, 'Unable to delete work orders'),
        variant: 'error',
      });
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: (items: SaveWorkOrderPayload[]) => workOrdersApi.import(items),
    onSuccess: (result) => {
      showToast({
        title: 'Work orders imported',
        description: `${result.length} work orders imported`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setQueryState((previous) => {
      if (!(key in previous)) {
        return previous;
      }
      const next: QueryState = { ...previous, page: 1 };
      (next as Record<string, unknown>)[key] = value;
      return next;
    });
  };

  const handleResetFilters = () => {
    setQueryState((previous) => ({
      ...initialQueryState,
      sortBy: previous.sortBy,
      sortDir: previous.sortDir,
      limit: previous.limit,
    }));
  };

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setActiveWorkOrderId(null);
  };

  const openEditDrawer = (id: string) => {
    setDrawerMode('edit');
    setActiveWorkOrderId(id);
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setActiveWorkOrderId(null);
  };

  const onSubmit = handleSubmit((values) => {
    const payload = buildPayload(values);
    if (drawerMode === 'edit' && activeWorkOrderId) {
      updateMutation.mutate({ id: activeWorkOrderId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const handleBulkAction = (action: 'complete' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) {
      return;
    }
    setPendingAction(action);
  };

  const confirmBulkAction = () => {
    if (!pendingAction || selectedIds.length === 0) {
      return;
    }
    const ids = [...selectedIds];
    if (pendingAction === 'complete') {
      completeMutation.mutate(ids);
    } else if (pendingAction === 'archive') {
      archiveMutation.mutate(ids);
    } else if (pendingAction === 'delete') {
      deleteMutation.mutate(ids);
    }
  };

  const handleDuplicate = () => {
    if (!canManage || selectedIds.length === 0) {
      return;
    }
    duplicateMutation.mutate([...selectedIds]);
  };

  const exportCurrentQuery = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      const exportLimit = Math.min(totalItems || queryState.limit, 1000);
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
        asset: item.asset?.name ?? item.asset?.code ?? '',
        dueDate: item.dueDate ?? '',
        createdAt: item.createdAt,
      }));

      if (format === 'csv') {
        const csv = createCsvFromRecords(flattened);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'work-orders.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
      } else {
        await exportArrayToXlsx('work-orders.xlsx', flattened, { sheetName: 'Work Orders' });
      }

      showToast({
        title: 'Export complete',
        description: `Exported ${flattened.length} work orders`,
        variant: 'success',
      });
    } catch (exportError) {
      showToast({
        title: 'Failed to export work orders',
        description: errorMessage(exportError, 'Unable to export work orders'),
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let payload: SaveWorkOrderPayload[] = [];

      if (extension === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          payload = parsed
            .map((entry) => ({
              title: typeof entry?.title === 'string' ? entry.title : '',
              description: typeof entry?.description === 'string' ? entry.description : undefined,
              status: normalizeStatus(entry?.status),
              priority: normalizePriority(entry?.priority),
              dueDate: typeof entry?.dueDate === 'string' ? entry.dueDate : undefined,
              category: typeof entry?.category === 'string' ? entry.category : undefined,
              assigneeId: typeof entry?.assigneeId === 'string' ? entry.assigneeId : undefined,
              assetId: typeof entry?.assetId === 'string' ? entry.assetId : undefined,
            }))
            .filter((item) => item.title.trim().length >= 3) as SaveWorkOrderPayload[];
        }
      } else {
        const buffer = await file.arrayBuffer();
        const rows = await parseXlsxRows(buffer);

        const getValue = (record: Record<string, unknown>, keys: string[]): unknown => {
          for (const key of keys) {
            if (key in record) {
              return record[key];
            }
          }
          return undefined;
        };

        const toOptionalString = (value: unknown): string | undefined => {
          if (value === null || value === undefined) {
            return undefined;
          }

          if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
          }

          const stringValue = String(value).trim();
          return stringValue ? stringValue : undefined;
        };

        const toStringOrEmpty = (value: unknown): string => toOptionalString(value) ?? '';

        payload = rows
          .map((row: Record<string, unknown>): SaveWorkOrderPayload => ({
            title: toStringOrEmpty(getValue(row, ['title', 'Title'])),
            description: toOptionalString(getValue(row, ['description', 'Description'])),
            status: normalizeStatus(toOptionalString(getValue(row, ['status', 'Status']))),
            priority: normalizePriority(toOptionalString(getValue(row, ['priority', 'Priority']))),
            dueDate:
              toOptionalString(getValue(row, ['dueDate', 'Due Date'])) ??
              toOptionalString(getValue(row, ['due_date', 'Due_Date'])),
            category: toOptionalString(getValue(row, ['category', 'Category'])),
            assigneeId: toOptionalString(
              getValue(row, ['assigneeId', 'Assignee Id', 'Assignee ID', 'AssigneeID']),
            ),
            assetId: toOptionalString(getValue(row, ['assetId', 'Asset Id', 'Asset ID', 'AssetID'])),
          }))
          .filter((item): item is SaveWorkOrderPayload => item.title.trim().length >= 3);
      }

      if (payload.length === 0) {
        throw new Error('No valid records found in file');
      }

      await importMutation.mutateAsync(payload);
    } catch (importError) {
      showToast({
        title: 'Failed to import work orders',
        description: errorMessage(importError, 'Unable to import work orders'),
        variant: 'error',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleImportFile(file);
    }
  };

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const value = event.target.value;
    setQueryState((previous) => ({ ...previous, search: value, page: 1 }));
  };

  const sortingDisabled = isLoading || exporting;

  const confirmTitle = pendingAction === 'delete'
    ? 'Delete selected work orders?'
    : pendingAction === 'archive'
      ? 'Archive selected work orders?'
      : 'Complete selected work orders?';

  const confirmDescription = pendingAction === 'delete'
    ? 'This action cannot be undone and will permanently remove the records.'
    : pendingAction === 'archive'
      ? 'Archived work orders will be hidden from active views.'
      : 'Completed work orders will notify subscribers and update technician load.';

  const confirmLabel = pendingAction === 'delete' ? 'Delete' : pendingAction === 'archive' ? 'Archive' : 'Mark complete';
  const confirmTone = pendingAction === 'delete' ? 'danger' : 'default';

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
            data-testid="work-orders-import-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={isImporting}
            data-testid="work-orders-import"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => exportCurrentQuery('csv')}
            className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={exporting}
            data-testid="work-orders-export-csv"
          >
            <Download className="inline w-4 h-4 mr-2" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportCurrentQuery('xlsx')}
            className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={exporting}
            data-testid="work-orders-export-xlsx"
          >
            Export XLSX
          </button>
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            data-testid="work-orders-new"
          >
            <Plus className="w-4 h-4" /> New work order
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4 border shadow-xl rounded-3xl border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/60">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-mutedfg" />
            <input
              type="search"
              value={queryState.search}
              onChange={handleSearchChange}
              placeholder="Search work orders"
              className="w-full px-10 py-3 text-sm bg-white border shadow-inner outline-none rounded-2xl border-border text-fg focus:ring-2 focus:ring-brand"
              data-testid="work-orders-search"
            />
          </div>
          <select
            value={queryState.sortBy}
            onChange={(event) => setQueryState((previous) => ({ ...previous, sortBy: event.target.value as QueryState['sortBy'], page: 1 }))}
            className="px-4 py-2 text-xs font-semibold bg-white border shadow-sm rounded-2xl border-border text-fg"
            data-testid="work-orders-sort-field"
            disabled={sortingDisabled}
          >
            {sortingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>
          <select
            value={queryState.sortDir}
            onChange={(event) => setQueryState((previous) => ({ ...previous, sortDir: event.target.value as QueryState['sortDir'], page: 1 }))}
            className="px-4 py-2 text-xs font-semibold bg-white border shadow-sm rounded-2xl border-border text-fg"
            data-testid="work-orders-sort-direction"
            disabled={sortingDisabled}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button
            type="button"
            onClick={() => handleBulkAction('complete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            data-testid="work-orders-complete"
          >
            <ListChecks className="w-4 h-4" /> Mark complete
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('archive')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            data-testid="work-orders-archive"
          >
            <Calendar className="w-4 h-4" /> Archive
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            data-testid="work-orders-duplicate"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('delete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-danger shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canDelete}
            data-testid="work-orders-delete"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>

        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          quickFilters={quickFilters}
          sticky={false}
        />

        {queryErrorMessage && (
          <div className="flex items-start gap-3 px-4 py-3 text-sm border rounded-2xl border-warning/30 bg-warning/10 text-warning" data-testid="work-orders-error">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>{queryErrorMessage}</span>
          </div>
        )}

        <ProTable
          data={tableRows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          onSelectionChange={setSelectedIds}
          onRowClick={(row) => openEditDrawer(row.id)}
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
                  openEditDrawer(row.id);
                }}
                className="px-3 py-1 text-xs font-semibold border rounded-full border-border text-fg hover:bg-muted"
                data-testid={`work-orders-edit-${row.id}`}
                disabled={!canManage}
              >
                Edit
              </button>
            </div>
          )}
          emptyState={
            <EmptyState
              title="No work orders found"
              description="Try changing your filters or creating a new work order."
              icon={<Calendar className="w-8 h-8" />}
            />
          }
          onExportCsv={() => exportCurrentQuery('csv')}
          onExportXlsx={() => exportCurrentQuery('xlsx')}
          exportDisabled={exporting}
          pagination={{
            page: queryState.page,
            pageSize: queryState.limit,
            totalPages,
            totalItems,
            onPageChange: (page) => setQueryState((previous) => ({ ...previous, page })),
            onPageSizeChange: (limit) => setQueryState((previous) => ({ ...previous, limit, page: 1 })),
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </div>

      <SlideOver
        open={drawerMode !== null}
        title={drawerMode === 'edit' ? 'Edit work order' : 'New work order'}
        description="Adjust assignments, priorities, and schedules."
        onClose={closeDrawer}
      >
        <form className="space-y-5" onSubmit={onSubmit} data-testid="work-orders-form">
          <label className="block text-sm font-semibold text-mutedfg">
            Title
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-title"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {errors.title && <span className="block mt-1 text-xs text-danger">{errors.title.message}</span>}
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Description
            <textarea
              {...register('description')}
              className="w-full h-32 px-4 py-3 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-description"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-mutedfg">
              Status
              <select
                {...register('status')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                data-testid="work-orders-form-status"
                disabled={createMutation.isPending || updateMutation.isPending}
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
                {...register('priority')}
                className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                data-testid="work-orders-form-priority"
                disabled={createMutation.isPending || updateMutation.isPending}
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
            Due date
            <input
              type="date"
              {...register('dueDate')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-due"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Category
            <input
              {...register('category')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-category"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Assignee ID
            <input
              {...register('assigneeId')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-assignee"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Asset ID
            <input
              {...register('assetId')}
              className="w-full px-4 py-2 mt-2 text-sm bg-white border shadow-inner rounded-2xl border-border text-fg focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-asset"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDrawer}
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
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmBulkAction}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        tone={confirmTone}
      />

      {isImporting && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="px-6 py-4 text-sm font-semibold bg-white shadow-xl rounded-2xl text-fg">Importing work orders…</div>
        </div>
      )}
    </div>
  );
}
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.message || fallback;
  }

  if (isApiErrorResponse(error)) {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (isApiErrorResponse(payload)) {
      const message = payload.error?.message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

