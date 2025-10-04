import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

interface RenderOptions {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        suspense: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  const result = render(ui, { wrapper: Wrapper });
  return { ...result, queryClient };
}
