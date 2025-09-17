import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  FileText,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

interface PurchaseOrder {
  id: string;
  tenantId: string;
  vendorId: string;
  status: 'draft' | 'issued' | 'received' | 'closed';
  lines: {
    partId: string;
    qty: number;
    unitCost: number;
  }[];
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
  };
}

interface PurchaseOrderWithDetails extends PurchaseOrder {
  poNumber: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  orderedAt?: string;
  receivedAt?: string;
  linesWithDetails: {
    partName: string;
    partSku: string;
    quantity: number;
    unitCost: number;
  }[];
}

export function Purchasing() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', { search, status: statusFilter }],
    queryFn: async (): Promise<PurchaseOrderWithDetails[]> => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (statusFilter) params.set('status', statusFilter);
        return await api.get<PurchaseOrderWithDetails[]>(`/purchase-orders?${params}`);
      } catch {
        // Mock data fallback
        return [
          {
            id: '1',
            tenantId: '1',
            vendorId: '1',
            poNumber: 'PO-2024-001',
            status: 'issued',
            subtotal: 1250.00,
            tax: 100.00,
            shipping: 50.00,
            total: 1400.00,
            orderedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            receivedAt: undefined,
            lines: [
              { partId: '1', qty: 10, unitCost: 45.50 },
              { partId: '2', qty: 5, unitCost: 125.00 },
            ],
            linesWithDetails: [
              { partName: 'Pump Seal Kit', partSku: 'PUMP-SEAL-001', quantity: 10, unitCost: 45.50 },
              { partName: 'Bearing Set', partSku: 'BEAR-001', quantity: 5, unitCost: 125.00 },
            ],
            vendor: {
              id: '1',
              name: 'Industrial Supply Co.'
            },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            tenantId: '1',
            vendorId: '2',
            poNumber: 'PO-2024-002',
            status: 'received',
            subtotal: 850.00,
            tax: 68.00,
            shipping: 25.00,
            total: 943.00,
            orderedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            lines: [
              { partId: '3', qty: 25, unitCost: 12.75 },
              { partId: '4', qty: 10, unitCost: 32.50 },
            ],
            linesWithDetails: [
              { partName: 'V-Belt 4L360', partSku: 'BELT-V-002', quantity: 25, unitCost: 12.75 },
              { partName: 'Timing Belt', partSku: 'BELT-T-003', quantity: 10, unitCost: 32.50 },
            ],
            vendor: {
              id: '2',
              name: 'Belt & Drive Solutions'
            },
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            tenantId: '1',
            vendorId: '3',
            poNumber: 'PO-2024-003',
            status: 'draft',
            subtotal: 495.00,
            tax: 39.60,
            shipping: 15.00,
            total: 549.60,
            orderedAt: undefined,
            receivedAt: undefined,
            lines: [
              { partId: '5', qty: 60, unitCost: 8.25 },
            ],
            linesWithDetails: [
              { partName: 'Hydraulic Oil ISO 46', partSku: 'OIL-HYD-003', quantity: 60, unitCost: 8.25 },
            ],
            vendor: {
              id: '3',
              name: 'Lubricant Specialists'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
    }
  });

  // Filter purchase orders
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !search ||
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendor.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const statusCounts = purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const pendingValue = purchaseOrders
    .filter(po => ['draft', 'issued'].includes(po.status))
    .reduce((sum, po) => sum + po.total, 0);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ poId, status }: { poId: string; status: string }) => {
      return api.put(`/purchase-orders/${poId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchasing</h1>
          <p className="text-gray-500">Manage purchase orders and vendor relationships</p>
        </div>
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      {/* Purchase Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{purchaseOrders.length}</div>
            <div className="text-sm text-gray-500">Total POs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.issued || 0}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(pendingValue)}</div>
            <div className="text-sm text-gray-500">Pending Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search purchase orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex space-x-2">
          {['draft', 'issued', 'received', 'closed'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              {status} ({statusCounts[status] || 0})
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="requests">Purchase Requests</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {filteredPOs.map((po) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {po.poNumber}
                      </h3>
                      <Badge className={getStatusColor(po.status)}>
                        {po.status}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">
                      {po.vendor.name}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Subtotal:</span>
                        <div className="font-medium">{formatCurrency(po.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tax:</span>
                        <div className="font-medium">{formatCurrency(po.tax)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Shipping:</span>
                        <div className="font-medium">{formatCurrency(po.shipping)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <div className="font-medium text-lg">{formatCurrency(po.total)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Line Items:</div>
                      {po.linesWithDetails.map((line, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{line.partName}</span>
                            <span className="text-gray-500 ml-2">({line.partSku})</span>
                          </div>
                          <div className="text-right">
                            <div>{line.quantity} × {formatCurrency(line.unitCost)}</div>
                            <div className="font-medium">{formatCurrency(line.quantity * line.unitCost)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                      {po.orderedAt && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Ordered: {formatDate(po.orderedAt)}
                        </div>
                      )}
                      {po.receivedAt && (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Received: {formatDate(po.receivedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      {po.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ poId: po.id, status: 'issued' })}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Issue
                        </Button>
                      )}
                      {po.status === 'issued' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ poId: po.id, status: 'received' })}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          Receive
                        </Button>
                      )}
                      {po.status === 'received' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ poId: po.id, status: 'closed' })}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Purchase Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Purchase request management will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Vendor Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Vendor management will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {filteredPOs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first purchase order'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}