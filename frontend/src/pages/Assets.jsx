import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, Search } from 'lucide-react';

import { api } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';

const MAX_NON_AUTH_RETRIES = 2;

function buildQueryString(filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? '',
    }),
    [searchParams],
  );

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const { data } = await api.get(`/assets${queryString}`);
      return data ?? [];
    },
    retry: (failureCount, fetchError) => {
      if (!fetchError) {
        return failureCount <= MAX_NON_AUTH_RETRIES;
      }

      if (fetchError.status === 401 || fetchError.status === 403) {
        return false;
      }

      return failureCount <= MAX_NON_AUTH_RETRIES;
    },
    keepPreviousData: true,
  });

  const handleSearchChange = (event) => {
    const next = new URLSearchParams(searchParams);
    const value = event.target.value;

    if (!value) {
      next.delete('search');
    } else {
      next.set('search', value);
    }

    setSearchParams(next, { replace: true });
  };

  const handleStatusToggle = (status) => {
    const next = new URLSearchParams(searchParams);
    const current = next.get('status');

    if (current === status) {
      next.delete('status');
    } else {
      next.set('status', status);
    }

    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center space-y-4 py-12 text-center text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p>Loading assets…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
        <p className="text-base font-semibold text-destructive">Unable to load assets</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {error?.message || 'An unexpected error occurred while loading your assets.'}
        </p>
        <Button onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Retry
        </Button>
      </section>
    );
  }

  if (!assets.length) {
    return (
      <section className="flex flex-col items-center justify-center space-y-4 py-12 text-center text-sm text-muted-foreground">
        <p>No assets found.</p>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching} className="inline-flex items-center gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Retry
        </Button>
      </section>
    );
  }

  const handleRefetch = () => {
    void refetch();
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            View and manage the assets associated with your organization.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefetch} disabled={isFetching} className="inline-flex items-center gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </Button>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search by name, tag, or location"
            className="pl-9"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {['operational', 'maintenance', 'down', 'decommissioned'].map((status) => (
            <Button
              key={status}
              variant={filters.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusToggle(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {assets.map((asset) => {
          const purchaseCost = Number(asset.purchaseCost);
          const hasPurchaseCost = Number.isFinite(purchaseCost);
          const status = asset.status ?? 'unknown';
          const location = asset.location ?? 'Unassigned location';

          return (
            <Card key={asset.id ?? asset.tag ?? asset.name}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {asset.name || 'Untitled asset'}
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {asset.tag && (
                      <Badge variant="outline" className="font-mono uppercase">
                        {asset.tag}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(status)}>{status}</Badge>
                    {asset.type && (
                      <Badge variant="outline" className="capitalize">
                        {asset.type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {asset.description && <p>{asset.description}</p>}
                <div className="grid gap-1 sm:grid-cols-2">
                  <span>
                    <strong className="font-medium text-foreground">Location:</strong> {location}
                  </span>
                  {asset.purchasedDate && (
                    <span>
                      <strong className="font-medium text-foreground">Purchased:</strong> {formatDate(asset.purchasedDate)}
                    </span>
                  )}
                  {hasPurchaseCost && (
                    <span>
                      <strong className="font-medium text-foreground">Purchase cost:</strong> ${purchaseCost.toLocaleString()}
                    </span>
                  )}
                  {asset.warrantyExpires && (
                    <span>
                      <strong className="font-medium text-foreground">Warranty expires:</strong> {formatDate(asset.warrantyExpires)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
