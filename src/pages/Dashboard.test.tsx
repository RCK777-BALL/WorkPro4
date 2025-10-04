import React from 'react';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import Dashboard from './Dashboard';

describe('Dashboard page', () => {
  it('renders without throwing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    expect(() =>
      renderToString(
        <QueryClientProvider client={queryClient}>
          <Dashboard />
        </QueryClientProvider>,
      ),
    ).not.toThrow();
  });
});
