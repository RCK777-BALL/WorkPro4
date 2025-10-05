import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import Dashboard from './Dashboard';

const mockApiGet = vi.hoisted(() => vi.fn());
const mockWorkOrdersList = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    get: mockApiGet,
  },
  workOrdersApi: {
    list: mockWorkOrdersList,
  },
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockWorkOrdersList.mockReset();

    mockApiGet.mockResolvedValue({
      kpis: {
        openWorkOrders: {
          total: 0,
          byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
          delta7d: 0,
        },
        mttrHours: { value: 0, delta30d: 0 },
        uptimePct: { value: 0, delta30d: 0 },
        stockoutRisk: { count: 0, items: [] },
      },
    });

    mockWorkOrdersList.mockResolvedValue({ items: [] });
  });

  it('renders without throwing', () => {
    const queryClient = new QueryClient();

    expect(() =>
      renderToString(
        <QueryClientProvider client={queryClient}>
          <Dashboard />
        </QueryClientProvider>
      )
    ).not.toThrow();
  });
});
