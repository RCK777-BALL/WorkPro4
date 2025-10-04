import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./axiosClient', () => {
  const get = vi.fn();
  const post = vi.fn();

  return {
    axiosClient: { get, post },
    unwrapResponse: <T>(promise: Promise<{ data: { data: T; error: null } }>) => promise.then((response) => response.data.data),
  };
});

describe('workOrdersApi', () => {
  let axiosModule: typeof import('./axiosClient');
  let apiModule: typeof import('./workOrdersApi');

  beforeEach(async () => {
    axiosModule = await import('./axiosClient');
    apiModule = await import('./workOrdersApi');
    axiosModule.axiosClient.get.mockReset();
    axiosModule.axiosClient.post.mockReset();
  });

  it('passes through query parameters when listing work orders', async () => {
    axiosModule.axiosClient.get.mockResolvedValue({
      data: {
        data: { items: [], total: 0, page: 1, limit: 10, totalPages: 1 },
        error: null,
      },
    });

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

    expect(axiosModule.axiosClient.get).toHaveBeenCalledWith('/work-orders', {
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
    axiosModule.axiosClient.get.mockResolvedValue({
      data: {
        data: { items: [] },
        error: null,
      },
    });

    await apiModule.workOrdersApi.export({ search: 'motor', assignee: 'alex', limit: 25, status: 'assigned' });

    expect(axiosModule.axiosClient.get).toHaveBeenCalledWith('/work-orders/export', {
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

