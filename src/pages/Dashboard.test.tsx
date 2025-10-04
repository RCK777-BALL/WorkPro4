import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';

describe('Dashboard page', () => {
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
