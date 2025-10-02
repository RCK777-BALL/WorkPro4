import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import {
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Filter,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  Search,
  Wrench,
  X,
} from 'lucide-react';

import { AssetFilterDrawer } from '@/components/assets/AssetFilterDrawer';
import { AssetMapView } from '@/components/assets/AssetMapView';
import { AssetTreeView } from '@/components/assets/AssetTreeView';
import { NewAssetModal } from '@/components/assets/NewAssetModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';
import { api } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';

const VIEW_OPTIONS = ['list', 'tile', 'tree', 'map'];

const STATUS_SUMMARY_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'down', label: 'Down' },
  { value: 'decommissioned', label: 'Decommissioned' },
];


function normalizeAssetsResponse(response) {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

export function Assets() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const search = searchParams.get('search') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const locationFilter = searchParams.get('location')?.trim?.() ?? '';
  const viewParam = searchParams.get('view') ?? 'list';
  const view = VIEW_OPTIONS.includes(viewParam) ? viewParam : 'list';

  const activeFilterCount = useMemo(
    () => [statusFilter, typeFilter, locationFilter].filter(Boolean).length,
    [locationFilter, statusFilter, typeFilter]
  );

  const updateParams = useCallback(
    (updates, options = { replace: true }) => {
      const next = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      setSearchParams(next, options);

    },
    [searchParams, setSearchParams]
  );

  const filters = useMemo(
    () => ({
      search,
      status: statusFilter,
      type: typeFilter,
      location: locationFilter,
    }),
    [locationFilter, search, statusFilter, typeFilter]
  );

  const {
    data: assetResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.location) params.set('location', filters.location);

      const query = params.toString();
      const response = await api.get(`/assets${query ? `?${query}` : ''}`);
      return normalizeAssetsResponse(response);
    },
    keepPreviousData: true,
  });

  const assets = useMemo(() => normalizeAssetsResponse(assetResponse), [assetResponse]);

  const statusCounts = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const status = asset.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [assets]);

  const handleStatusCardClick = (status) => {
    updateParams({ status: statusFilter === status ? '' : status });
  };

  const handleFilterApply = (values) => {
    const normalizedLocation = values?.location?.trim?.() ?? '';
    updateParams({
      status: values?.status || '',
      type: values?.type || '',
      location: normalizedLocation,
    });
  };

  const handleFilterReset = () => {
    updateParams({ status: '', type: '', location: '' });
  };

  const handleOpenWorkOrder = (asset) => {
    setSelectedAsset(asset);
    setShowWorkOrderModal(true);
  };

  const closeWorkOrderModal = () => {
    setShowWorkOrderModal(false);
    setSelectedAsset(null);
  };

  const handleWorkOrderSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    closeWorkOrderModal();
  };

  const handleAssetCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Unable to load assets</p>
          <p className="mt-1 text-red-600">{error?.message || 'Please try again later.'}</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-500">
            Manage your equipment, facilities, and asset hierarchy
          </p>
        </div>
        <Button className="flex items-center" onClick={() => setShowNewAssetModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Asset
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_SUMMARY_OPTIONS.map((status) => (
          <Card
            key={status.value}
            className={`cursor-pointer transition-all ${
              statusFilter === status.value ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
            onClick={() => handleStatusCardClick(status.value)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statusCounts[status.value] || 0}</div>
              <div className="text-sm text-gray-500 capitalize">{status.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(event) => updateParams({ search: event.target.value })}
            className="pl-10"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
        <Button
          variant="outline"
          className="relative flex items-center"
          onClick={() => setShowFilterDrawer(true)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <Tabs
        value={view}
        onValueChange={(nextView) => updateParams({ view: nextView })}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="tile">Tile View</TabsTrigger>
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {assets.map((asset) => {
            const purchaseCost = Number(asset.purchaseCost);
            const hasPurchaseCost = Number.isFinite(purchaseCost);
            const warrantyExpires = asset.warrantyExpires;
            const purchasedDate = asset.purchasedDate
              ? formatDate(asset.purchasedDate)
              : null;
            const location = asset.location || 'Unassigned location';

            return (
              <Card
                key={asset.id || asset.tag || asset.name}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {asset.name || 'Untitled asset'}
                      </h3>
                      {asset.tag && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {asset.tag}

                        </Badge>
                      )}
                      {asset.status && (
                        <Badge className={getStatusColor(asset.status)}>
                          {asset.status}
                        </Badge>
                      )}
                      {asset.type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {asset.type}
                        </Badge>
                      )}
                      </div>


                      {asset.description && (
                        <p className="text-gray-600 mb-3">{asset.description}</p>
                      )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {location}
                      </div>
                      {purchasedDate && (
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          Purchased: {purchasedDate}
                        </div>
                      )}
                      {hasPurchaseCost && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${purchaseCost.toLocaleString()}

                        </div>
                      )}
                    </div>

                    {warrantyExpires && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Warranty expires: </span>
                        <span
                          className={
                            new Date(warrantyExpires) < new Date()
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {formatDate(warrantyExpires)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenWorkOrder(asset)}>

                        <Wrench className="w-4 h-4 mr-1" />
                        Work Order
                      </Button>
                      {asset.qrCodeUrl && (
                        <Button variant="outline" size="sm">
                          <QrCode className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="tile">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const purchaseCost = Number(asset.purchaseCost);
              const hasPurchaseCost = Number.isFinite(purchaseCost);
              const purchasedDate = asset.purchasedDate
                ? formatDate(asset.purchasedDate)
                : null;
              const location = asset.location || null;

              return (
                <Card key={asset.id || asset.tag || asset.name} className="group border border-gray-200">
                  <CardHeader className="space-y-1">
                    <CardTitle className="flex items-start justify-between gap-3 text-base">
                      <span>{asset.name || 'Untitled asset'}</span>
                      {asset.status && (
                        <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {asset.tag && (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {asset.tag}
                        </Badge>
                      )}
                      {asset.type && <span className="capitalize">{asset.type}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {asset.description && (
                      <p className="line-clamp-3 text-sm text-gray-600">{asset.description}</p>
                    )}
                    <div className="space-y-2 text-sm text-gray-500">
                      {location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{location}</span>
                        </div>
                      )}
                      {purchasedDate && (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span>Purchased {purchasedDate}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {hasPurchaseCost && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          ${purchaseCost.toLocaleString()}
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleOpenWorkOrder(asset)}>
                        <Wrench className="mr-2 h-4 w-4 text-gray-500" />
                        Dispatch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tree">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Asset Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetTreeView assets={assets} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Asset Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetMapView assets={assets} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {assets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter || typeFilter || locationFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first asset'}
            </p>
            <Button onClick={() => setShowNewAssetModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Asset
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">
              Unable to load assets. {error.message || 'Please try again later.'}
            </p>
          </CardContent>
        </Card>
      )}

      <AssetFilterDrawer
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        values={{ status: statusFilter, type: typeFilter, location: locationFilter }}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      <NewAssetModal
        open={showNewAssetModal}
        onClose={() => setShowNewAssetModal(false)}
        onSuccess={handleAssetCreated}
      />

      {showWorkOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Work Order</h2>
                {selectedAsset?.name && (
                  <p className="text-sm text-gray-500">
                    Assigning work for <span className="font-medium">{selectedAsset.name}</span>
                  </p>
                )}

              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeWorkOrderModal}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"

              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <WorkOrderForm
                key={selectedAsset?.id || selectedAsset?.tag || 'work-order-form'}
                onClose={closeWorkOrderModal}
                onSuccess={handleWorkOrderSuccess}
                defaultValues={{
                  assetId: selectedAsset?.id
                    ? String(selectedAsset.id)
                    : selectedAsset?.tag || selectedAsset?.name || '',
                }}

              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

