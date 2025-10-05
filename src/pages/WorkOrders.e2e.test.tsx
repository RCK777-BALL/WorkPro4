/**
 * @vitest-environment jsdom
 */

import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkOrders from './WorkOrders';
import { ToastProvider } from '../components/ui/toast';
import { useAuth } from '../hooks/useAuth';
import { workOrdersApi } from '../lib/api';
import type { WorkOrderListItem } from '../lib/api';

const now = vi.hoisted(() => new Date().toISOString());

let workOrders = vi.hoisted(() => [] as WorkOrderListItem[]);

const workOrdersApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  bulkComplete: vi.fn(),
  bulkArchive: vi.fn(),
  bulkDelete: vi.fn(),
  bulkDuplicate: vi.fn(),
  export: vi.fn(),
  import: vi.fn(),
}));

const apiStub = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  isApiErrorResponse: (value: unknown): value is { error: { message: string } } => {
    return Boolean(value && typeof value === 'object' && 'error' in value && (value as { error?: unknown }).error);
  },
  client: {},
}));

vi.mock('../lib/api', () => ({
  api: apiStub,
  isApiErrorResponse: apiStub.isApiErrorResponse,
  workOrdersApi: workOrdersApiMock,
}));

const mockedApi = vi.mocked(workOrdersApi);

function renderWorkOrders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WorkOrders />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('WorkOrders page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    mockedApi.list.mockImplementation(async () => ({
      items: [...workOrders],
      total: workOrders.length,
      page: 1,
      limit: Math.max(workOrders.length, 1),
      totalPages: 1,
    }));

    mockedApi.create.mockImplementation(async (payload) => {
      const created: WorkOrderListItem = {
        id: `wo-${Date.now()}`,
        tenantId: 'tenant-1',
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status ?? 'requested',
        priority: payload.priority ?? 'medium',
        assigneeId: payload.assigneeId ?? null,
        assignee: payload.assigneeId ? { id: payload.assigneeId, name: `User ${payload.assigneeId}`, email: '' } : null,
        assetId: payload.assetId ?? null,
        asset: payload.assetId ? { id: payload.assetId, code: payload.assetId, name: payload.assetId } : null,
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
    });

    mockedApi.update.mockImplementation(async (id, payload) => {
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
    });

    mockedApi.bulkComplete.mockImplementation(async (ids) => {
      const timestamp = new Date().toISOString();
      workOrders = workOrders.map((item) =>
        ids.includes(item.id)
          ? { ...item, status: 'completed', completedAt: timestamp, updatedAt: timestamp }
          : item,
      );
      return workOrders.filter((item) => ids.includes(item.id));
    });

    mockedApi.bulkArchive.mockImplementation(async (ids) =>
      workOrders.filter((item) => ids.includes(item.id)),
    );

    mockedApi.bulkDelete.mockImplementation(async (ids) => {
      const before = workOrders.length;
      workOrders = workOrders.filter((item) => !ids.includes(item.id));
      return { count: before - workOrders.length, ids };
    });

    mockedApi.bulkDuplicate.mockImplementation(async (ids) => {
      const duplicates = workOrders
        .filter((item) => ids.includes(item.id))
        .map((item) => ({
          ...item,
          id: `${item.id}-copy`,
          title: `${item.title} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      workOrders = [...duplicates, ...workOrders];
      return duplicates;
    });

    mockedApi.export.mockImplementation(async () => ({ items: [...workOrders] }));

    mockedApi.import.mockImplementation(async (items) => {
      const imported = items.map((item, index) => ({
        id: `import-${Date.now()}-${index}`,
        tenantId: 'tenant-1',
        title: item.title,
        description: item.description ?? null,
        status: item.status ?? 'requested',
        priority: item.priority ?? 'medium',
        assigneeId: item.assigneeId ?? null,
        assignee: null,
        assetId: item.assetId ?? null,
        asset: null,
        category: item.category ?? null,
        dueDate: item.dueDate ?? null,
        attachments: [],
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', name: 'Admin User' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      } satisfies WorkOrderListItem));
      workOrders = [...imported, ...workOrders];
      return imported;
    });

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

  it('renders work orders and supports create, edit, complete, and export actions', async () => {
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
    const newRowCell = await screen.findByRole('cell', { name: 'Test Work Order' });
    const newRow = newRowCell.closest('tr');
    expect(newRow).toBeTruthy();

    await user.click(within(newRow as HTMLElement).getByText('Edit'));
    await screen.findByTestId('work-orders-form');
    await user.selectOptions(screen.getByTestId('work-orders-form-status'), 'assigned');
    await user.click(screen.getByTestId('work-orders-form-submit'));
    await screen.findByText('Work order updated');

    const checkbox = within(newRow as HTMLElement).getByRole('checkbox');
    await user.click(checkbox);

    await user.click(screen.getByTestId('work-orders-complete'));
    const confirmDialog = await screen.findByRole('alertdialog', { name: 'Complete selected work orders?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Mark complete' }));
    await screen.findByText('Work orders marked complete');

    await user.click(screen.getByTestId('work-orders-export-csv'));
    await waitFor(() => {
      expect(mockedApi.export).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('displays an error message when the query fails', async () => {
    mockedApi.list.mockRejectedValueOnce({ data: null, error: { code: 500, message: 'Network failure' } });

    renderWorkOrders();

    await screen.findByText('Network failure');
  });

  it('imports work orders from a JSON file', async () => {
    renderWorkOrders();
    const user = userEvent.setup();

    await screen.findByText('Pump maintenance');

    const fileContent = JSON.stringify([
      { title: 'Imported WO', description: 'From file', status: 'assigned', priority: 'high' },
    ]);
    const file = new File([fileContent], 'import.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(fileContent),
    });

    const importButtons = screen.getAllByTestId('work-orders-import');
    await user.click(importButtons[importButtons.length - 1]!);

    const inputs = screen.getAllByTestId('work-orders-import-input') as HTMLInputElement[];
    const targetInput = inputs.find((element) => {
      const reactKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'));
      if (!reactKey) {
        return false;
      }

      const props = (element as unknown as Record<string, unknown>)[reactKey];
      if (!props || typeof props !== 'object') {
        return false;
      }

      return typeof (props as { onChange?: unknown }).onChange === 'function';
    });
    if (!targetInput) {
      throw new Error('Unable to locate file input with onChange handler');
    }
    const input = targetInput;
    const fileList = {
      0: file,
      length: 1,
      item: () => file,
      namedItem: () => file,
    } as unknown as FileList;
    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    await act(async () => {
      fireEvent.change(input, { target: { files: fileList } });
    });

    await waitFor(() => mockedApi.import.mock.calls.length > 0);
    await screen.findByRole('cell', { name: 'Imported WO' });
  });
});
