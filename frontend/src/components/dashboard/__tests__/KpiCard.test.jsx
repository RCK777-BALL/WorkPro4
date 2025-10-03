import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('renders title, value, and delta badge', () => {
    render(
      <div style={{ width: 360, height: 200 }}>
        <KpiCard
          title="Open Work Orders"
          value={42}
          delta={12.5}
          timeframe="30d"
          breakdown={{ critical: 2, high: 10, medium: 20, low: 10 }}
          series={[1, 2, 3, 4]}
        />
      </div>,
    );

    expect(screen.getByText('Open Work Orders')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByLabelText(/change up/i)).toBeInTheDocument();
    expect(screen.getAllByText(/critical|high|medium|low/i)).toHaveLength(4);
  });
});
