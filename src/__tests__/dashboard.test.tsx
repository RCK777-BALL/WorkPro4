import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { renderWithProviders } from './testUtils';
import { api } from '../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Dashboard page', () => {
  it('renders KPI skeletons while metrics are loading', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));

    const { container, queryClient } = renderWithProviders(<Dashboard />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    queryClient.clear();
  });

  it('shows an error banner when the metrics request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('metrics offline'));

    const { queryClient } = renderWithProviders(<Dashboard />);

    await screen.findByText(/unable to load dashboard metrics/i);
    expect(screen.getByText(/metrics offline/i)).toBeInTheDocument();

    queryClient.clear();
  });
});
