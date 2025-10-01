import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Calendar,
  Factory,
  Filter,
  Hash,
  Plus,
  Search,
  X,
  User,
  Wrench,
} from 'lucide-react';

import { WorkOrderForm } from '@/components/work-orders/WorkOrderForm';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';

const INITIAL_ADVANCED_FILTERS = {

  priority: '',
  assignee: '',
  from: '',
  to: '',
};


export function WorkOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(() => ({
    ...INITIAL_ADVANCED_FILTERS,
  }));
  const [tempFilters, setTempFilters] = useState(() => ({
    ...INITIAL_ADVANCED_FILTERS,
  }));
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isFiltersOpen) {
      return;
    }

    setTempFilters((previous) => {
      const hasChanges = Object.keys(advancedFilters).some((key) => {
        return previous?.[key] !== advancedFilters[key];
      });

      return hasChanges ? { ...advancedFilters } : previous;
    });
  }, [isFiltersOpen, advancedFilters]);

  const queryClient = useQueryClient();


  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      'work-orders',
      {
        search,
        status: statusFilter,
        priority: advancedFilters.priority,
        assignee: advancedFilters.assignee,
        from: advancedFilters.from,
        to: advancedFilters.to,

      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (advancedFilters.priority)
        params.set('priority', advancedFilters.priority);
      if (advancedFilters.assignee)
        params.set('assignee', advancedFilters.assignee);
      if (advancedFilters.from) params.set('from', advancedFilters.from);
      if (advancedFilters.to) params.set('to', advancedFilters.to);


      const result = await api.get(`/work-orders?${params}`);
      return result?.data ?? result;
    },
  });

  const workOrders = Array.isArray(data) ? data : data?.workOrders || [];

  const normalizedWorkOrders = workOrders.map((workOrder) => {
    const assigneeNames = Array.isArray(workOrder?.assigneeNames)
      ? workOrder.assigneeNames
      : Array.isArray(workOrder?.assignees)
      ? workOrder.assignees
      : [];

    const assetName =
      workOrder?.assetName ||
      workOrder?.asset?.name ||
      workOrder?.asset?.code ||
      workOrder?.assetId ||
      '';

    return {
      ...workOrder,
      title: workOrder?.title || '',
      description: workOrder?.description || '',
      status: workOrder?.status || 'requested',
      priority: workOrder?.priority || 'medium',
      assigneeNames,
      assetName,
      requestedByName: workOrder?.requestedByName || workOrder?.createdByName || 'System',
      createdAt:
        workOrder?.createdAt || workOrder?.created_at || new Date().toISOString(),
    };
  });

  const statusCounts = normalizedWorkOrders.reduce((acc, wo) => {
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
        <Button
          variant="outline"
          className="flex items-center"
          onClick={() => setIsFiltersOpen((prev) => !prev)}

        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {isFiltersOpen && (
        <Card className="mt-4">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Priority
                </p>
                <Select
                  value={tempFilters.priority}
                  onValueChange={(value) =>
                    setTempFilters((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />

                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </p>
                <Input
                  placeholder="Enter assignee name"
                  value={tempFilters.assignee}
                  onChange={(e) =>
                    setTempFilters((prev) => ({

                      ...prev,
                      assignee: e.target.value,
                    }))
                  }
                />
              </div>
             <div>
                <p className="text-sm font-medium text-gray-700 mb-2">From</p>
                <Input
                  type="date"
                  value={tempFilters.from}
                  onChange={(e) =>
                    setTempFilters((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">To</p>
                <Input
                  type="date"
                  value={tempFilters.to}
                  onChange={(e) =>
                    setTempFilters((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setTempFilters({ ...INITIAL_ADVANCED_FILTERS });
                  setAdvancedFilters({ ...INITIAL_ADVANCED_FILTERS });

                }}
              >
                Clear
              </Button>
              <Button
                onClick={() => {
                  setAdvancedFilters({ ...tempFilters });
                  setIsFiltersOpen(false);

                }}
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Orders List */}
      <div className="space-y-4">
        {normalizedWorkOrders.map((workOrder) => (
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

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                    {workOrder.assetName && (
                      <div className="flex items-center">
                        <Wrench className="w-4 h-4 mr-1" />
                        {workOrder.assetName}
                      </div>
                    )}
                    {workOrder.lineName && (
                      <div className="flex items-center">
                        <Factory className="w-4 h-4 mr-1" />
                        Line: {workOrder.lineName}
                      </div>
                    )}
                    {workOrder.stationNumber && (
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-1" />
                        Station: {workOrder.stationNumber}
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

      {normalizedWorkOrders.length === 0 && (
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
