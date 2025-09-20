import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Filter,
  Plus,
  Search,
  X,
  User,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';
import { api } from '@/lib/api';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';

export function WorkOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['work-orders', { search, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);

      const result = await api.get(`/work-orders?${params}`);
      return result.data;
    },
  });

  const workOrders = Array.isArray(data) ? data : data?.workOrders || [];

  const statusCounts = workOrders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500">Manage and track maintenance work orders</p>
        </div>
        <Button className="flex items-center" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {['requested', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled'].map(
          (status) => (
            <Card
              key={status}
              className={`cursor-pointer transition-all ${
                statusFilter === status ? 'ring-2 ring-primary' : 'hover:shadow-md'
              }`}
              onClick={() =>
                setStatusFilter(statusFilter === status ? '' : status)
              }
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
                <div className="text-sm text-gray-500 capitalize">
                  {status.replace('_', ' ')}
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search work orders..."
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

      {/* Work Orders List */}
      <div className="space-y-4">
        {workOrders.map((workOrder) => (
          <Card
            key={workOrder.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {workOrder.title}
                    </h3>
                    <Badge className={getStatusColor(workOrder.status)}>
                      {workOrder.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(workOrder.priority)}>
                      {workOrder.priority}
                    </Badge>
                  </div>

                  {workOrder.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {workOrder.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {workOrder.assetName && (
                      <div className="flex items-center">
                        <Wrench className="w-4 h-4 mr-1" />
                        {workOrder.assetName}
                      </div>
                    )}
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {workOrder.requestedByName}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(workOrder.createdAt)}
                    </div>
                    {workOrder.dueDate && (
                      <div className="flex items-center text-orange-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        Due: {formatDate(workOrder.dueDate)}
                      </div>
                    )}
                  </div>

                  {workOrder.assigneeNames.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-500">
                        Assigned to: {workOrder.assigneeNames.join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {workOrder.completedAt && (
                    <div className="text-sm text-green-600 font-medium">
                      Completed {formatDate(workOrder.completedAt)}
                    </div>
                  )}
                  {workOrder.actualHours && (
                    <div className="text-sm text-gray-500">
                      {workOrder.actualHours}h logged
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No work orders found
            </h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first work order'}
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Work Order
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Work Order</h2>
                <p className="text-sm text-gray-500">
                  Provide the details below to add a new work order.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <WorkOrderForm
                onClose={() => setShowCreate(false)}
                onSuccess={() => {
                  setShowCreate(false);
                  queryClient.invalidateQueries({ queryKey: ['work-orders'] });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
