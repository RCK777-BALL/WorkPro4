import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Filters } from '../Filters';

describe('Dashboard Filters', () => {
  it('triggers range preset and role changes', async () => {
    const onChange = vi.fn();
    const onRoleChange = vi.fn();
    const onRangeChange = vi.fn();
    const onModeToggle = vi.fn();

    render(
      <Filters
        filters={{ preset: '30d', rolePreset: 'admin' }}
        options={{
          tenants: [{ label: 'Tenant A', value: 'tenant-a' }],
          sites: [],
          lines: [],
          assets: [],
        }}
        onChange={onChange}
        onRoleChange={onRoleChange}
        onRangeChange={onRangeChange}
        mode="light"
        onModeToggle={onModeToggle}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /qtd/i }));
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange.mock.calls[0][0].preset).toBe('qtd');

    await userEvent.click(screen.getByRole('button', { name: /technician/i }));
    expect(onRoleChange).toHaveBeenCalledWith('technician');

    await userEvent.click(screen.getByLabelText(/toggle dark mode/i));
    expect(onModeToggle).toHaveBeenCalledTimes(1);
  });
});
