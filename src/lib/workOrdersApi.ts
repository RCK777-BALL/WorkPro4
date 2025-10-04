import { axiosClient, unwrapResponse } from './axiosClient';

export type WorkOrderStatus = 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrderListItem {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  assetId: string | null;
  asset: { id: string; code: string; name: string } | null;
  category: string | null;
  dueDate: string | null;
  attachments: string[];
  createdBy: string;
  createdByUser: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PaginatedWorkOrders {
  items: WorkOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  assignee?: string;
  status?: WorkOrderStatus | '';
  priority?: WorkOrderPriority | '';
  assigneeId?: string;
  dueBefore?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';
  sortDir?: 'asc' | 'desc';
}

export interface SaveWorkOrderPayload {
  title: string;
  description?: string | null;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  assetId?: string | null;
  assigneeId?: string | null;
  category?: string | null;
  dueDate?: string | null;
}

export const workOrdersApi = {
  list: (query: WorkOrderQuery) =>
    unwrapResponse<PaginatedWorkOrders>(
      axiosClient.get('/work-orders', {
        params: {
          ...query,
          assignee: query.assignee || undefined,
          status: query.status || undefined,
          priority: query.priority || undefined,
        },
      }),
    ),
  get: (id: string) => unwrapResponse<WorkOrderListItem>(axiosClient.get(`/work-orders/${id}`)),
  create: (payload: SaveWorkOrderPayload) => unwrapResponse<WorkOrderListItem>(axiosClient.post('/work-orders', payload)),
  update: (id: string, payload: SaveWorkOrderPayload) =>
    unwrapResponse<WorkOrderListItem>(axiosClient.patch(`/work-orders/${id}`, payload)),
  bulkComplete: (ids: string[]) => unwrapResponse<WorkOrderListItem[]>(axiosClient.post('/work-orders/bulk/complete', { ids })),
  bulkArchive: (ids: string[]) => unwrapResponse<WorkOrderListItem[]>(axiosClient.post('/work-orders/bulk/archive', { ids })),
  bulkDelete: (ids: string[]) => unwrapResponse<{ count: number; ids: string[] }>(axiosClient.post('/work-orders/bulk/delete', { ids })),
  bulkDuplicate: (ids: string[]) => unwrapResponse<WorkOrderListItem[]>(axiosClient.post('/work-orders/bulk/duplicate', { ids })),
  export: (query: WorkOrderQuery) =>
    unwrapResponse<{ items: WorkOrderListItem[] }>(
      axiosClient.get('/work-orders/export', {
        params: {
          ...query,
          assignee: query.assignee || undefined,
          status: query.status || undefined,
          priority: query.priority || undefined,
        },
      }),
    ),
  import: (items: SaveWorkOrderPayload[]) => unwrapResponse<WorkOrderListItem[]>(axiosClient.post('/work-orders/import', { items })),
};

