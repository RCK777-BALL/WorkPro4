import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Search,
  ShoppingCart,
  Truck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

const mockPurchaseOrders = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    vendorName: 'Industrial Supply Co.',
    status: 'approved',
    subtotal: 1250.0,
    tax: 100.0,
    shipping: 50.0,
    total: 1400.0,
    orderedAt: '2024-01-15T10:00:00Z',
    receivedAt: null,
    lines: [
      { partName: 'Pump Seal Kit', partSku: 'PUMP-SEAL-001', quantity: 10, unitCost: 45.5 },
      { partName: 'Bearing Set', partSku: 'BEAR-001', quantity: 5, unitCost: 125.0 },
    ],
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    vendorName: 'Belt & Drive Solutions',
    status: 'received',
    subtotal: 850.0,
    tax: 68.0,
    shipping: 25.0,
    total: 943.0,
    orderedAt: '2024-01-10T14:30:00Z',
    receivedAt: '2024-01-18T09:15:00Z',
    lines: [
      { partName: 'V-Belt 4L360', partSku: 'BELT-V-002', quantity: 25, unitCost: 12.75 },
      { partName: 'Timing Belt', partSku: 'BELT-T-003', quantity: 10, unitCost: 32.5 },
    ],
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    vendorName: 'Lubricant Specialists',
    status: 'draft',
    subtotal: 495.0,
    tax: 39.6,
    shipping: 15.0,
    total: 549.6,
    orderedAt: null,
    receivedAt: null,
    lines: [
      { partName: 'Hydraulic Oil ISO 46', partSku: 'OIL-HYD-003', quantity: 60, unitCost: 8.25 },
    ],
  },
];

export function Purchasing() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: purchaseOrders = mockPurchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders', { search, status: statusFilter }],
    queryFn: async () => {
      return mockPurchaseOrders.filter((po) => {
        const matchesSearch =
          !search ||
          po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          po.vendorName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || po.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    },
  });

  const statusCounts = purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});

  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const pendingValue = purchaseOrders
    .filter((po) => ['draft', 'submitted', 'approved'].includes(po.status))
    .reduce((sum, po) => sum + po.total, 0);

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
            <div className="text-2xl font-bold text-orange-600">{statusCounts.approved || 0}</div>
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
          {['draft', 'submitted', 'approved', 'ordered', 'received'].map((status) => (
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
          {purchaseOrders.map((po) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{po.poNumber}</h3>
                      <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                    </div>

                    <p className="text-gray-600 mb-3">{po.vendorName}</p>

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
                      {po.lines.map((line, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                        >
                          <div>
                            <span className="font-medium">{line.partName}</span>
                            <span className="text-gray-500 ml-2">({line.partSku})</span>
                          </div>
                          <div className="text-right">
                            <div>{line.quantity} × {formatCurrency(line.unitCost)}</div>
                            <div className="font-medium">
                              {formatCurrency(line.quantity * line.unitCost)}
                            </div>
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
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Submit
                        </Button>
                      )}
                      {po.status === 'approved' && (
                        <Button variant="outline" size="sm">
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Order
                        </Button>
                      )}
                      {po.status === 'ordered' && (
                        <Button variant="outline" size="sm">
                          <Truck className="w-4 h-4 mr-1" />
                          Receive
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
                <DollarSign className="w-5 h-5 mr-2" />
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

      {purchaseOrders.length === 0 && (
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
