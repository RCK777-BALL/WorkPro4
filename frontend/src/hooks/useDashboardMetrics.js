import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const METRICS_QUERY_KEY = 'dashboard:metrics';

function buildParams(filters) {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }

    params.set(key, value);
  });

  return params;
}

export function useDashboardMetrics(filters) {
  const queryKey = useMemo(() => [METRICS_QUERY_KEY, filters], [filters]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = buildParams(filters);
      const response = await api.get('/dashboard/metrics', { params });
      const payload = response?.data?.data ?? response?.data ?? response;
      return payload;
    },
    keepPreviousData: true,
    staleTime: 30_000,
    meta: {
      params: filters,
    },
  });
}
