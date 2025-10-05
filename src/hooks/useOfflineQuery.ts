import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiRequestError } from '../lib/api';
import { getCachedApiResponse, warmApiCache } from '../lib/offlineCache';

interface OfflineQueryOptions<TData> {
  queryKey: QueryKey;
  endpoint: string;
  enabled?: boolean;
  fallbackData?: TData;
  staleTime?: number;
}

export function useOfflineQuery<TData>({
  queryKey,
  endpoint,
  enabled = true,
  fallbackData,
  staleTime = 5 * 60 * 1000,
}: OfflineQueryOptions<TData>) {
  const [servedFromCache, setServedFromCache] = useState(false);

  const options: UseQueryOptions<TData, unknown, TData, QueryKey> = {
    queryKey,
    enabled,
    staleTime,
    cacheTime: staleTime * 2,
    queryFn: async () => {
      try {
        const data = await api.get<TData>(endpoint);
        setServedFromCache(false);
        if (data != null) {
          void warmApiCache(endpoint, data);
        }
        return data;
      } catch (error) {
        if (error instanceof ApiRequestError && error.offline) {
          const cached = await getCachedApiResponse<TData>(endpoint);
          if (cached != null) {
            setServedFromCache(true);
            return cached;
          }
          if (fallbackData != null) {
            setServedFromCache(true);
            return fallbackData;
          }
        }
        throw error;
      }
    },
    retry: 0,
    refetchOnWindowFocus: false,
  };

  const query = useQuery(options);

  return { ...query, servedFromCache };
}
