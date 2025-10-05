import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { api } from '../lib/api';
import { workOrdersApi } from '../lib/workOrdersApi';
import { renderWithQueryClient } from '../test/utils';

const noopPromise = () => new Promise<any>(() => {});

describe('Dashboard page states', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders KPI skeletons while metrics are loading', () => {
    vi.spyOn(workOrdersApi, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 16,
      totalPages: 1,
    });

    vi.spyOn(api, 'get').mockImplementation((endpoint: string) => {
      if (endpoint === '/dashboard/metrics') {
        return noopPromise();
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    const { container } = renderWithQueryClient(<Dashboard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows an error banner when metrics fail to load', async () => {
    vi.spyOn(workOrdersApi, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 16,
      totalPages: 1,
    });

    vi.spyOn(api, 'get').mockImplementation((endpoint: string) => {
      if (endpoint === '/dashboard/metrics') {
        return Promise.reject(new Error('metrics offline'));
      }
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    renderWithQueryClient(<Dashboard />);

    expect(
      await screen.findByText(/We couldn’t refresh the dashboard metrics/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/metrics offline/i)).toBeInTheDocument();
  });
});
