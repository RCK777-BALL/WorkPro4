import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '../components/ui/toast';

export interface ProvidersOptions {
  route?: string;
  queryClient?: QueryClient;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(ui: ReactElement, options: ProvidersOptions & RenderOptions = {}) {
  const { route = '/assets', queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
