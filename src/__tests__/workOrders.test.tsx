import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import WorkOrders from '../pages/WorkOrders';
import { renderWithProviders } from './testUtils';
import { api } from '../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WorkOrders page', () => {
  it('shows table skeleton while work orders load', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));

    const { container, queryClient } = renderWithProviders(<WorkOrders />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    queryClient.clear();
  });

  it('surfaces error messaging when the query fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('API offline'));

    const { queryClient } = renderWithProviders(<WorkOrders />);

    await screen.findByText(/unable to load work orders/i);
    expect(screen.getByText(/api offline/i)).toBeInTheDocument();
    expect(
      screen.getByText(/unable to load work orders\. please try again later\./i),
    ).toBeInTheDocument();

    queryClient.clear();
  });
});
