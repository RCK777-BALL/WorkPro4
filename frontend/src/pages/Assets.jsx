import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { exportTableToXlsx } from '@/lib/xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, Search } from 'lucide-react';

import { AssetImportDrawer } from '@/components/assets/AssetImportDrawer';
import { NewAssetModal } from '@/components/assets/NewAssetModal';
import { useToast } from '@/hooks/use-toast';
import { api, unwrapApiResult } from '@/lib/api';
import { exportAssets } from '@/lib/assets';
import { downloadBlob, formatDate, getStatusColor } from '@/lib/utils';

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);

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
      const response = await api.get(`/assets${queryString}`);
      const payload = unwrapApiResult(response);

      if (Array.isArray(payload)) {
        return payload;
      }

      if (payload && typeof payload === 'object' && Array.isArray(payload.assets)) {
        return payload.assets;
      }

      return [];
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

  const updateCachedAssets = useCallback(
    (project) => {
      queryClient.setQueriesData({ queryKey: ['assets'] }, (existing) => {
        if (!existing) {
          const next = project([]);
          return Array.isArray(next) ? next : existing;
        }

        if (Array.isArray(existing)) {
          return project(existing);
        }

        if (existing && typeof existing === 'object' && Array.isArray(existing.assets)) {
          return {
            ...existing,
            assets: project(existing.assets),
          };
        }

        return existing;
      });
    },
    [queryClient],
  );

  const handleAssetCreated = useCallback(
    (createdAsset) => {
      if (!createdAsset) {
        return;
      }

      updateCachedAssets((existing) => {
        const next = Array.isArray(existing) ? [...existing] : [];
        const deduped = next.filter((asset) => {
          if (asset?.id && createdAsset.id) {
            return asset.id !== createdAsset.id;
          }
          if (asset?.code && createdAsset.code) {
            return asset.code !== createdAsset.code;
          }
          return true;
        });
        return [createdAsset, ...deduped];
      });

      void refetch();
    },
    [refetch, updateCachedAssets],
  );

  const handleImportComplete = useCallback(
    (importedAssets) => {
      if (!Array.isArray(importedAssets) || importedAssets.length === 0) {
        void refetch();
        return;
      }

      updateCachedAssets((existing) => {
        const base = Array.isArray(existing) ? existing : [];
        const seen = new Set();
        const combined = [...importedAssets, ...base];

        return combined.filter((asset) => {
          const key = asset?.id ?? asset?.code ?? asset?.name;
          if (!key) {
            return true;
          }
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      });

      void refetch();
    },
    [refetch, updateCachedAssets],
  );

  const handleExport = useCallback(async () => {
    const params = {};
    if (filters.search) {
      params.search = filters.search;
    }
    if (filters.status) {
      params.status = filters.status;
    }

    const toastRef = toast({
      title: 'Preparing export…',
      description: 'Generating your asset export file.',
    });

    try {
      const blob = await exportAssets(params);
      const dateLabel = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `assets-${dateLabel}.xlsx`);
      if (toastRef?.update) {
        toastRef.update({
          title: 'Export started',
          description: 'Your asset export has started downloading.',
        });
        setTimeout(() => toastRef.dismiss?.(), 3000);
      }
    } catch (error) {
      const description = error?.response?.data?.error?.message || error?.message || 'Unable to export assets.';
      if (toastRef?.update) {
        toastRef.update({
          title: 'Export failed',
          description,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Export failed',
          description,
          variant: 'destructive',
        });
      }
    }
  }, [filters, toast]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const headerRow = [
        'Name*',
        'Code*',
        'Status (operational|maintenance|down|retired|decommissioned)',
        'Criticality (1-5)',
        'Location',
        'Category',
        'Cost',
        'Purchase Date',
        'Commissioned At',
        'Manufacturer',
        'Model Number',
        'Serial Number',
        'Warranty Provider',
        'Warranty Contact',
        'Warranty Expires At',
        'Warranty Notes',
        'Site ID',
        'Area ID',
        'Line ID',
        'Station ID',
      ];
      const exampleRow = [
        'Example Pump',
        'PUMP-001',
        'operational',
        '3',
        'Building A',
        'Equipment',
        '1500',
        '2023-01-10',
        '2023-02-01',
        'Acme Corp',
        'AC-200',
        'SN-1001',
        'Warranty Co',
        'support@example.com',
        '2025-01-31',
        'Includes 2-year coverage',
        '',
        '',
        '',
        '',
      ];

      await exportTableToXlsx('asset-import-template.xlsx', [headerRow, exampleRow], {
        sheetName: 'Template',
      });
      toast({
        title: 'Template downloaded',
        description: 'The asset import template has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error?.message || 'Unable to generate the template.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
            <p className="text-sm text-muted-foreground">
              View and manage the assets associated with your organization.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefetch}
            disabled={isFetching}
            className="inline-flex items-center gap-2"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setIsImportDrawerOpen(true)} className="inline-flex items-center gap-2">
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} className="inline-flex items-center gap-2">
            Export
          </Button>
          <Button variant="secondary" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2">
            Download Template
          </Button>
          <Button onClick={() => setIsNewAssetModalOpen(true)} className="inline-flex items-center gap-2">
            Add Asset
          </Button>
        </div>
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
      <AssetImportDrawer
        open={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        onImported={handleImportComplete}
      />
      <NewAssetModal
        open={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        onSuccess={handleAssetCreated}
      />
    </section>
  );
}
