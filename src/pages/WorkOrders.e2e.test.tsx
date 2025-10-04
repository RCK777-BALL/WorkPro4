import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkOrders from './WorkOrders';
import { useAuth } from '../hooks/useAuth';
import type { WorkOrderListItem } from '../lib/workOrdersApi';

const now = new Date().toISOString();

let workOrders: WorkOrderListItem[] = [];

vi.mock('../lib/workOrdersApi', () => {
  return {
    workOrdersApi: {
      list: vi.fn(async () => ({
        items: [...workOrders],
        total: workOrders.length,
        page: 1,
        limit: Math.max(workOrders.length, 1),
        totalPages: 1,
      })),
      get: vi.fn(async (id: string) => workOrders.find((item) => item.id === id) ?? workOrders[0]),
      create: vi.fn(async (payload: any) => {
        const created: WorkOrderListItem = {
          id: `wo-${Date.now()}`,
          tenantId: 'tenant-1',
          title: payload.title,
          description: payload.description ?? null,
          status: payload.status ?? 'requested',
          priority: payload.priority ?? 'medium',
          assigneeId: null,
          assignee: null,
          assetId: null,
          asset: null,
          category: payload.category ?? null,
          dueDate: payload.dueDate ?? null,
          attachments: [],
          createdBy: 'user-1',
          createdByUser: { id: 'user-1', name: 'Admin User' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        };
        workOrders = [created, ...workOrders];
        return created;
      }),
      update: vi.fn(async (id: string, payload: any) => {
        let updated: WorkOrderListItem | null = null;
        workOrders = workOrders.map((item) => {
          if (item.id === id) {
            updated = {
              ...item,
              title: payload.title ?? item.title,
              description: payload.description ?? item.description,
              status: payload.status ?? item.status,
              priority: payload.priority ?? item.priority,
              dueDate: payload.dueDate ?? item.dueDate,
              category: payload.category ?? item.category,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return item;
        });
        return updated ?? workOrders[0];
      }),
      bulkComplete: vi.fn(async (ids: string[]) => {
        const timestamp = new Date().toISOString();
        workOrders = workOrders.map((item) =>
          ids.includes(item.id)
            ? { ...item, status: 'completed', completedAt: timestamp, updatedAt: timestamp }
            : item,
        );
        return workOrders.filter((item) => ids.includes(item.id));
      }),
      bulkArchive: vi.fn(async () => []),
      bulkDelete: vi.fn(async () => ({ count: 0, ids: [] })),
      bulkDuplicate: vi.fn(async () => []),
      export: vi.fn(async () => ({ items: [...workOrders] })),
      import: vi.fn(async () => workOrders),
    },
  };
});

const renderWorkOrders = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <WorkOrders />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe('WorkOrders end-to-end flow', () => {
  beforeEach(() => {
    workOrders = [
      {
        id: 'wo-1',
        tenantId: 'tenant-1',
        title: 'Pump maintenance',
        description: 'Inspect the primary pump',
        status: 'requested',
        priority: 'medium',
        assigneeId: null,
        assignee: null,
        assetId: null,
        asset: null,
        category: null,
        dueDate: null,
        attachments: [],
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', name: 'Admin User' },
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
    ];

    useAuth.setState({
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    if (typeof URL.createObjectURL !== 'function') {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn(() => 'blob:mock'),
      });
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    }

    if (typeof URL.revokeObjectURL !== 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
      });
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }
  });

  it('supports creating, editing, completing, and exporting work orders', async () => {
    renderWorkOrders();

    const user = userEvent.setup();

    await screen.findByText('Pump maintenance');

    await user.click(screen.getByTestId('work-orders-new'));
    await screen.findByTestId('work-orders-form');
    await user.clear(screen.getByTestId('work-orders-form-title'));
    await user.type(screen.getByTestId('work-orders-form-title'), 'Test Work Order');
    await user.type(screen.getByTestId('work-orders-form-description'), 'Verify system performance');
    await user.click(screen.getByTestId('work-orders-form-submit'));

    await screen.findByText('Work order created');
    await screen.findByText('Test Work Order');

    const newRow = screen.getByText('Test Work Order').closest('tr');
    expect(newRow).toBeTruthy();

    await user.click(within(newRow as HTMLElement).getByText('Edit'));
    await screen.findByTestId('work-orders-form');
    await user.selectOptions(screen.getByTestId('work-orders-form-status'), 'assigned');
    await user.click(screen.getByTestId('work-orders-form-submit'));
    await screen.findByText('Work order updated');

    const checkbox = within(newRow as HTMLElement).getByRole('checkbox');
    await user.click(checkbox);

    await user.click(screen.getByTestId('work-orders-complete'));
    await screen.findByText('Complete selected work orders?');
    await user.click(screen.getByText('Mark complete'));
    await screen.findByText('Work orders marked complete');

    await user.click(screen.getByTestId('work-orders-export-csv'));
    await screen.findByText(/Exported/);

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});

