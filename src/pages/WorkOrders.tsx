import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Copy,
  Download,
  FileDown,
  FileUp,
  Filter,
  ListChecks,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { z } from 'zod';
import { read, utils, writeFile } from 'xlsx';
import { FilterBar, type FilterDefinition, type QuickFilter } from '../components/premium/FilterBar';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { SlideOver } from '../components/premium/SlideOver';
import { ConfirmDialog } from '../components/premium/ConfirmDialog';
import { DataBadge } from '../components/premium/DataBadge';
import { EmptyState } from '../components/premium/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { workOrdersApi, type WorkOrderListItem, type WorkOrderPriority, type WorkOrderStatus } from '../lib/workOrdersApi';

interface ToastState {
  message: string;
  tone: 'success' | 'danger';
}

type BulkAction = 'complete' | 'archive' | 'delete';

const manageRoles = new Set(['planner', 'supervisor', 'admin']);
const adminRoles = new Set(['supervisor', 'admin']);

const statusOptions: FilterDefinition['options'] = [
  { value: 'requested', label: 'Requested' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: FilterDefinition['options'] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const filters: FilterDefinition[] = [
  { key: 'search', label: 'Search', type: 'search', placeholder: 'WO ID, asset, or description' },
  { key: 'status', label: 'Status', type: 'select', options: statusOptions },
  { key: 'priority', label: 'Priority', type: 'select', options: priorityOptions },
  { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'Technician name' },
  { key: 'dueBefore', label: 'Due before', type: 'date' },
];

const quickFilters: QuickFilter[] = [
  { key: 'status', value: 'completed', label: 'Completed' },
  { key: 'priority', value: 'urgent', label: 'Urgent' },
  { key: 'status', value: 'assigned', label: 'Assigned' },
];

const workOrderFormSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(120, 'Title must be 120 characters or fewer'),
  description: z
    .string()
    .max(4000, 'Description must be 4000 characters or fewer')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  status: z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']).default('requested'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  category: z
    .string()
    .max(120, 'Category must be 120 characters or fewer')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

interface QueryState {
  search: string;
  status: WorkOrderStatus | '';
  priority: WorkOrderPriority | '';
  assignee: string;
  dueBefore: string;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortDir: 'asc' | 'desc';
}

const defaultQueryState: QueryState = {
  search: '',
  status: '',
  priority: '',
  assignee: '',
  dueBefore: '',
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

function buildQueryState(searchParams: URLSearchParams): QueryState {
  const base = { ...defaultQueryState };

  const page = Number.parseInt(searchParams.get('page') ?? '', 10);
  const limit = Number.parseInt(searchParams.get('limit') ?? '', 10);
  const sortBy = searchParams.get('sortBy') as QueryState['sortBy'] | null;
  const sortDir = searchParams.get('sortDir') as QueryState['sortDir'] | null;

  return {
    search: searchParams.get('search') ?? base.search,
    status: (searchParams.get('status') as QueryState['status']) ?? base.status,
    priority: (searchParams.get('priority') as QueryState['priority']) ?? base.priority,
    assignee: searchParams.get('assignee') ?? base.assignee,
    dueBefore: searchParams.get('dueBefore') ?? base.dueBefore,
    page: Number.isFinite(page) && page > 0 ? page : base.page,
    limit: Number.isFinite(limit) && limit > 0 ? limit : base.limit,
    sortBy: sortBy ?? base.sortBy,
    sortDir: sortDir ?? base.sortDir,
  };
}

function toTitleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function mapWorkOrderColumns(): ProTableColumn<WorkOrderListItem>[] {
  return [
    { key: 'id', header: 'WO #' },
    { key: 'title', header: 'Summary' },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <DataBadge status={toTitleCase(row.status)} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (row) => <DataBadge status={toTitleCase(row.priority)} />,
    },
    {
      key: 'assignee',
      header: 'Owner',
      accessor: (row) => row.assignee?.name ?? 'Unassigned',
    },
    {
      key: 'asset',
      header: 'Asset',
      accessor: (row) => row.asset?.name ?? '—',
    },
    {
      key: 'dueDate',
      header: 'Due',
      accessor: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'),
    },
  ];
}

const sortingOptions: Array<{ label: string; value: QueryState['sortBy'] }> = [
  { label: 'Created date', value: 'createdAt' },
  { label: 'Due date', value: 'dueDate' },
  { label: 'Priority', value: 'priority' },
  { label: 'Status', value: 'status' },
  { label: 'Title', value: 'title' },
];

const statusValues: WorkOrderStatus[] = ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'];
const priorityValues: WorkOrderPriority[] = ['low', 'medium', 'high', 'urgent'];

function normalizeStatus(value: unknown): WorkOrderStatus {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return statusValues.includes(normalized as WorkOrderStatus) ? (normalized as WorkOrderStatus) : 'requested';
}

function normalizePriority(value: unknown): WorkOrderPriority {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return priorityValues.includes(normalized as WorkOrderPriority) ? (normalized as WorkOrderPriority) : 'medium';
}

export default function WorkOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const queryState = useMemo(() => buildQueryState(searchParams), [searchParams]);

  const setQueryState = useCallback(
    (patch: Partial<QueryState>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        const merged: QueryState = { ...queryState, ...patch };

        Object.entries(defaultQueryState).forEach(([key, defaultValue]) => {
          const value = (merged as Record<string, unknown>)[key];
          const stringValue = typeof value === 'number' ? String(value) : (value as string);
          const defaultString = typeof defaultValue === 'number' ? String(defaultValue) : (defaultValue as string);

          if (stringValue && stringValue !== defaultString) {
            next.set(key, stringValue);
          } else {
            next.delete(key);
          }
        });

        return next;
      }, { replace: true });
    },
    [queryState, setSearchParams],
  );

  const queryKey = useMemo(() => ['work-orders', queryState] as const, [queryState]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      workOrdersApi.list({
        page: queryState.page,
        limit: queryState.limit,
        search: queryState.search || undefined,
        assignee: queryState.assignee || undefined,
        status: queryState.status || undefined,
        priority: queryState.priority || undefined,
        assigneeId: undefined,
        dueBefore: queryState.dueBefore || undefined,
        sortBy: queryState.sortBy,
        sortDir: queryState.sortDir,
      }),
    keepPreviousData: true,
  });

  const workOrders = data?.items ?? [];
  const overdueCount = workOrders.filter((order) => order.status === 'in_progress' && order.dueDate && new Date(order.dueDate) < new Date()).length;

  const columns = useMemo(() => mapWorkOrderColumns(), []);

  const { data: editingWorkOrder } = useQuery({
    queryKey: ['work-orders', activeWorkOrderId],
    queryFn: () => (activeWorkOrderId && activeWorkOrderId !== 'new' ? workOrdersApi.get(activeWorkOrderId) : Promise.resolve(null)),
    enabled: !!activeWorkOrderId && activeWorkOrderId !== 'new',
  });

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'requested',
      priority: 'medium',
      dueDate: '',
      category: '',
    },
  });

  useEffect(() => {
    if (!activeWorkOrderId || activeWorkOrderId === 'new') {
      form.reset({
        title: '',
        description: '',
        status: 'requested',
        priority: 'medium',
        dueDate: '',
        category: '',
      });
      return;
    }

    if (!editingWorkOrder) {
      return;
    }

    form.reset({
      id: editingWorkOrder.id,
      title: editingWorkOrder.title,
      description: editingWorkOrder.description ?? '',
      status: editingWorkOrder.status,
      priority: editingWorkOrder.priority,
      dueDate: editingWorkOrder.dueDate ? editingWorkOrder.dueDate.split('T')[0] : '',
      category: editingWorkOrder.category ?? '',
    });
  }, [activeWorkOrderId, editingWorkOrder, form]);

  const showToast = useCallback((message: string, tone: ToastState['tone']) => {
    setToast({ message, tone });
  }, []);

  const canManage = manageRoles.has(user?.role ?? 'user');
  const canDelete = adminRoles.has(user?.role ?? 'user');

  const createMutation = useMutation({
    mutationFn: (payload: WorkOrderFormValues) =>
      workOrdersApi.create({
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate ?? undefined,
        category: payload.category ?? undefined,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey });
      showToast('Work order created', 'success');
      setActiveWorkOrderId(null);
      setSelectedIds([]);
      setQueryState({ page: 1 });
      queryClient.setQueryData(queryKey, (current: typeof data) => {
        if (!current) return current;
        return {
          ...current,
          items: [created, ...current.items].slice(0, current.limit),
          total: current.total + 1,
        };
      });
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to create work order', 'danger');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: WorkOrderFormValues) =>
      workOrdersApi.update(payload.id!, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate ?? undefined,
        category: payload.category ?? undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, (current: typeof data) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) => (item.id === updated.id ? updated : item)),
        };
      });
      showToast('Work order updated', 'success');
      setActiveWorkOrderId(null);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to update work order', 'danger');
    },
  });

  const bulkCompleteMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkComplete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof data>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          items: previous.items.map((item) =>
            ids.includes(item.id)
              ? { ...item, status: 'completed', completedAt: new Date().toISOString() }
              : item,
          ),
        });
      }

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      showToast(error.message || 'Failed to complete work orders', 'danger');
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, (current: typeof data) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) => updated.find((row) => row.id === item.id) ?? item),
        };
      });
      showToast('Work orders marked complete', 'success');
      setSelectedIds([]);
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkArchive(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof data>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          items: previous.items.map((item) =>
            ids.includes(item.id)
              ? { ...item, status: 'cancelled', updatedAt: new Date().toISOString() }
              : item,
          ),
        });
      }

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      showToast(error.message || 'Failed to archive work orders', 'danger');
    },
    onSuccess: () => {
      showToast('Work orders archived', 'success');
      setSelectedIds([]);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkDelete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof data>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          items: previous.items.filter((item) => !ids.includes(item.id)),
          total: Math.max(0, previous.total - ids.length),
        });
      }

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      showToast(error.message || 'Failed to delete work orders', 'danger');
    },
    onSuccess: () => {
      showToast('Work orders deleted', 'success');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (ids: string[]) => workOrdersApi.bulkDuplicate(ids),
    onSuccess: (created) => {
      showToast(`${created.length} work orders duplicated`, 'success');
      queryClient.setQueryData(queryKey, (current: typeof data) => {
        if (!current) return current;
        return {
          ...current,
          items: [...created, ...current.items].slice(0, current.limit),
          total: current.total + created.length,
        };
      });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to duplicate work orders', 'danger');
    },
  });

  const importMutation = useMutation({
    mutationFn: (items: WorkOrderFormValues[]) => {
      const sanitized = items.map((item) => ({
        title: item.title,
        description: item.description,
        status: normalizeStatus(item.status),
        priority: normalizePriority(item.priority),
        dueDate: item.dueDate ?? undefined,
        category: item.category ?? undefined,
      }));
      return workOrdersApi.import(sanitized);
    },
    onSuccess: (created) => {
      showToast(`${created.length} work orders imported`, 'success');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to import work orders', 'danger');
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const handleFormSubmit = form.handleSubmit((values) => {
    if (!canManage) {
      showToast('You are not authorized to modify work orders', 'danger');
      return;
    }

    if (values.id) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  });

  const handleBulkAction = (action: BulkAction) => {
    if (selectedIds.length === 0) {
      return;
    }

    if (!canManage && action !== 'delete') {
      showToast('You are not authorized to modify work orders', 'danger');
      return;
    }

    if (!canDelete && action === 'delete') {
      showToast('You are not authorized to delete work orders', 'danger');
      return;
    }

    setPendingAction(action);
  };

  const confirmBulkAction = () => {
    if (!pendingAction) return;

    const ids = [...selectedIds];

    switch (pendingAction) {
      case 'complete':
        bulkCompleteMutation.mutate(ids);
        break;
      case 'archive':
        bulkArchiveMutation.mutate(ids);
        break;
      case 'delete':
        bulkDeleteMutation.mutate(ids);
        break;
      default:
        break;
    }

    setPendingAction(null);
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
            Track assignments, SLA risk, and technician load. {overdueCount} items need immediate follow-up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-mutedfg">
            <Filter className="h-4 w-4" />
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
            <Download className="mr-2 inline h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportCurrentQuery('xlsx')}
            className="rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={exporting}
            data-testid="work-orders-export-xlsx"
            title={!canManage ? 'Limited export still available' : 'Export current view as XLSX'}
          >
            <FileDown className="mr-2 inline h-4 w-4" /> Export XLSX
          </button>
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            title={canManage ? 'Import CSV, XLSX, or JSON' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-import"
          >
            <FileUp className="h-4 w-4" />
            Import
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              ref={fileInputRef}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  if (!canManage) {
                    showToast('You are not authorized to import work orders', 'danger');
                    event.target.value = '';
                    return;
                  }
                  void handleImportFile(file);
                }
              }}
              className="hidden"
              data-testid="work-orders-import-input"
            />
          </label>
          <button
            onClick={() => {
              if (!canManage) {
                showToast('You are not authorized to create work orders', 'danger');
                return;
              }
              setActiveWorkOrderId('new');
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
            type="button"
            data-testid="work-orders-new"
            title={canManage ? 'Create work order' : 'Requires planner, supervisor, or admin role'}
            disabled={!canManage}
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
              value={queryState.search}
              onChange={(event) => setQueryState({ search: event.target.value, page: 1 })}
              placeholder="Search work orders"
              className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
              data-testid="work-orders-search"
            />
          </div>
          <select
            value={queryState.sortBy}
            onChange={(event) => setQueryState({ sortBy: event.target.value as QueryState['sortBy'], page: 1 })}
            className="rounded-2xl border border-border bg-white px-4 py-2 text-xs font-semibold text-fg shadow-sm"
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
            className="rounded-2xl border border-border bg-white px-4 py-2 text-xs font-semibold text-fg shadow-sm"
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
            <ListChecks className="h-4 w-4" /> Mark complete
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('archive')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Archive selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-archive"
          >
            <Calendar className="h-4 w-4" /> Archive
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canManage}
            title={canManage ? 'Duplicate selected work orders' : 'Requires planner, supervisor, or admin role'}
            data-testid="work-orders-duplicate"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('delete')}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-danger shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            disabled={selectedIds.length === 0 || !canDelete}
            title={canDelete ? 'Delete selected work orders' : 'Requires supervisor or admin role'}
            data-testid="work-orders-delete"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>

        <FilterBar
          filters={filters}
          values={{
            search: queryState.search,
            status: queryState.status,
            priority: queryState.priority,
            assignee: queryState.assignee,
            dueBefore: queryState.dueBefore,
          }}
          onChange={(key, value) => setQueryState({ [key]: value, page: 1 } as Partial<QueryState>)}
          onReset={() => setQueryState(defaultQueryState)}
          quickFilters={quickFilters}
          sticky={false}
        />

        <ProTable
          data={workOrders}
          columns={columns}
          loading={isLoading || isFetching}
          getRowId={(row) => row.id}
          onRowClick={(row) => setActiveWorkOrderId(row.id)}
          onSelectionChange={setSelectedIds}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/work-orders/${row.id}`);
                }}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
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
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg hover:bg-muted"
                data-testid={`work-orders-edit-${row.id}`}
                disabled={!canManage}
                title={canManage ? 'Edit work order' : 'Requires planner, supervisor, or admin role'}
              >
                Edit
              </button>
            </div>
          )}
          emptyState={<EmptyState title="No work orders found" description="Try changing your filters or creating a new work order." icon={<Calendar className="h-8 w-8" />} />}
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
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-title"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {form.formState.errors.title && (
              <span className="mt-1 block text-xs text-danger">{form.formState.errors.title.message}</span>
            )}
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Description
            <textarea
              {...form.register('description')}
              className="mt-2 h-32 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-description"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {form.formState.errors.description && (
              <span className="mt-1 block text-xs text-danger">{form.formState.errors.description.message}</span>
            )}
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-mutedfg">
              Status
              <select
                {...form.register('status')}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
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
            <label className="block text-sm font-semibold text-mutedfg">
              Priority
              <select
                {...form.register('priority')}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
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
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-2 text-sm shadow-inner">
              <User className="h-4 w-4 text-mutedfg" />
              <input
                placeholder="Assignment handled elsewhere"
                className="flex-1 bg-transparent text-mutedfg outline-none"
                disabled
              />
            </div>
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Due date
            <input
              type="date"
              {...form.register('dueDate')}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-due"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Category
            <input
              {...form.register('category')}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              data-testid="work-orders-form-category"
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveWorkOrderId(null)}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg"
              data-testid="work-orders-form-cancel"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
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
          <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-fg shadow-xl">Importing work orders…</div>
        </div>
      )}
    </div>
  );
}

