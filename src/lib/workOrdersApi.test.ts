import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '../../shared/types/http';
import type { PaginatedWorkOrders, WorkOrderListItem } from './api';

function createAxiosResponse<T>(payload: ApiResponse<T>): AxiosResponse<ApiResponse<T>> {
  return {
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  } as AxiosResponse<ApiResponse<T>>;
}

describe('workOrdersApi', () => {
  let apiModule: typeof import('./api');

  beforeEach(async () => {
    vi.resetModules();
    apiModule = await import('./api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through query parameters when listing work orders', async () => {
    const getSpy = vi
      .spyOn(apiModule.httpClient, 'get')
      .mockResolvedValue(
        createAxiosResponse<PaginatedWorkOrders>({
          data: { items: [], total: 0, page: 1, limit: 10, totalPages: 1 },
          error: null,
        }),
      );

    await apiModule.workOrdersApi.list({
      page: 2,
      limit: 10,
      search: 'pump',
      assignee: 'alex',
      status: 'requested',
      priority: 'high',
      sortBy: 'title',
      sortDir: 'asc',
    });

    expect(getSpy).toHaveBeenCalledWith('/work-orders', {
      params: {
        page: 2,
        limit: 10,
        search: 'pump',
        assignee: 'alex',
        status: 'requested',
        priority: 'high',
        sortBy: 'title',
        sortDir: 'asc',
      },
    });
  });

  it('uses export endpoint with filters', async () => {
    const getSpy = vi
      .spyOn(apiModule.httpClient, 'get')
      .mockResolvedValue(
        createAxiosResponse<{ items: WorkOrderListItem[] }>({
          data: { items: [] },
          error: null,
        }),
      );

    await apiModule.workOrdersApi.export({ search: 'motor', assignee: 'alex', limit: 25, status: 'assigned' });

    expect(getSpy).toHaveBeenCalledWith('/work-orders/export', {
      params: {
        search: 'motor',
        assignee: 'alex',
        limit: 25,
        status: 'assigned',
        priority: undefined,
      },
    });
  });
});
