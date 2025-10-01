import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Filter,
  MapPin,
  Plus,
  QrCode,
  Search,
  Wrench,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, getStatusColor } from '@/lib/utils';
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';
import { api } from '@/lib/api';

export function Assets() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['assets', { search, status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const queryString = params.toString();
      const response = await api.get(
        queryString ? `/api/assets?${queryString}` : '/api/assets',
      );

      const items = Array.isArray(response) ? response : response?.data ?? [];

      return items.map((asset, index) => ({
        ...asset,
        id:
          asset?._id ??
          asset?.id ??
          asset?.assetId ??
          asset?.tag ??
          asset?.name ??
          String(index),
      }));
    },
  });

  const statusCounts = assets.reduce((acc, asset) => {
    if (asset.status) {
      acc[asset.status] = (acc[asset.status] || 0) + 1;
    }
    return acc;
  }, {});

  const handleOpenWorkOrder = (asset) => {
    setSelectedAsset(asset);
    setShowWorkOrder(true);
  };

  const handleCloseWorkOrder = () => {
    setShowWorkOrder(false);
    setSelectedAsset(null);
  };

  const handleWorkOrderSuccess = () => {
    handleCloseWorkOrder();
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
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
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Asset
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['operational', 'maintenance', 'down', 'decommissioned'].map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-all ${
              statusFilter === status ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
              <div className="text-sm text-gray-500 capitalize">{status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className="transition-shadow hover:shadow-md cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                      {(asset.tag || asset.assetTag || asset.assetId) && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {asset.tag || asset.assetTag || asset.assetId}
                        </Badge>
                      )}
                      {asset.status && (
                        <Badge className={getStatusColor(asset.status)}>
                          {asset.status}
                        </Badge>
                      )}
                    </div>

                    {asset.description && (
                      <p className="text-gray-600 mb-3">{asset.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                      {asset.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {asset.location}
                        </div>
                      )}
                      {asset.purchasedDate && (
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          Purchased: {formatDate(asset.purchasedDate)}
                        </div>
                      )}
                      {asset.warrantyExpires && !asset.purchasedDate && (
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          Warranty: {formatDate(asset.warrantyExpires)}
                        </div>
                      )}
                      {asset.purchaseCost && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          $
                          {Number.isFinite(Number(asset.purchaseCost))
                            ? Number(asset.purchaseCost).toLocaleString()
                            : asset.purchaseCost}
                        </div>
                      )}
                    </div>

                    {asset.warrantyExpires && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Warranty expires: </span>
                        <span
                          className={
                            new Date(asset.warrantyExpires) < new Date()
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {formatDate(asset.warrantyExpires)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenWorkOrder(asset)}
                      >
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
          ))}
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
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-12">
                  Asset tree view will be implemented here
                </div>
              </div>
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
              <div className="text-center text-gray-500 py-12">
                Interactive map view will be implemented here
              </div>
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
              {search || statusFilter || typeFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first asset'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Asset
            </Button>
          </CardContent>
        </Card>
      )}

      {showWorkOrder && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Work Order</h2>
                <p className="text-sm text-gray-500">
                  Asset: {selectedAsset.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={handleCloseWorkOrder}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <WorkOrderForm
                asset={selectedAsset}
                onClose={handleCloseWorkOrder}
                onSuccess={handleWorkOrderSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

