import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkOrders from '../pages/WorkOrders';
import { workOrdersApi } from '../lib/api';
import { renderWithQueryClient } from '../test/utils';

describe('WorkOrders page states', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces API errors from the work orders query', async () => {
    vi.spyOn(workOrdersApi, 'list').mockRejectedValue(new Error('service unavailable'));

    renderWithQueryClient(
      <MemoryRouter>
        <WorkOrders />
      </MemoryRouter>,
    );

    const notices = await screen.findAllByText(/service unavailable/i);
    expect(notices.length).toBeGreaterThan(0);
  });
});
