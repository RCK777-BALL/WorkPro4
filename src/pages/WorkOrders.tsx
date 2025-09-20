import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, Search, Filter, User, Calendar, AlertTriangle } from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { mockWorkOrders, type MockWorkOrder } from '../lib/mockWorkOrders';
import { WorkOrderForm } from '../components/forms/WorkOrderForm';

const defaultStatusOptions = ['Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Overdue'];
const defaultPriorityOptions = ['Low', 'Medium', 'High', 'Urgent'];

export default function WorkOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const [workOrders, setWorkOrders] = useState<MockWorkOrder[]>(mockWorkOrders);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  const workOrdersQuery = useQuery({
    queryKey: ['work-orders'],
    queryFn: async (): Promise<MockWorkOrder[]> => {
      try {
        return await api.get<MockWorkOrder[]>('/work-orders');
      } catch (error) {
        console.error('Failed to load work orders, using mock data', error);
        return mockWorkOrders;
      }
    }
  });

  useEffect(() => {
    if (workOrdersQuery.data) {
      setWorkOrders(workOrdersQuery.data);
    }
  }, [workOrdersQuery.data]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set(defaultStatusOptions);
    workOrders.forEach((wo) => {
      if (wo.status) {
        uniqueStatuses.add(wo.status);
      }
    });
    return Array.from(uniqueStatuses);
  }, [workOrders]);

  const priorityOptions = useMemo(() => {
    const uniquePriorities = new Set(defaultPriorityOptions);
    workOrders.forEach((wo) => {
      if (wo.priority) {
        uniquePriorities.add(wo.priority);
      }
    });
    return Array.from(uniquePriorities);
  }, [workOrders]);

  const assigneeOptions = useMemo(() => {
    const assignees = new Set<string>();
    workOrders.forEach((wo) => {
      if (wo.assignee) {
        assignees.add(wo.assignee);
      }
    });
    return Array.from(assignees);
  }, [workOrders]);

  const isFiltersApplied = useMemo(() => {
    return Boolean(
      filters.status ||
      filters.priority ||
      filters.assignee ||
      filters.dateFrom ||
      filters.dateTo
    );
  }, [filters]);

  const getPriorityColor = (priority: string) => {
    switch ((priority ?? '').toLowerCase()) {
      case 'urgent':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      case 'low':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusColor = (status: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'open':
        return colors.info;
      case 'assigned':
      case 'in progress':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'overdue':
        return colors.error;
      case 'cancelled':
        return colors.mutedForeground;
      default:
        return colors.mutedForeground;
    }
  };

  const statusStats = useMemo(() => {
    const counts = workOrders.reduce<Record<string, number>>((acc, wo) => {
      if (wo.status) {
        acc[wo.status] = (acc[wo.status] ?? 0) + 1;
      }
      return acc;
    }, {});

    return statusOptions.map((status) => ({
      label: status,
      count: counts[status] ?? 0,
      color: getStatusColor(status)
    }));
  }, [workOrders, statusOptions]);

  const filteredWorkOrders = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    return workOrders.filter((wo) => {
      const matchesStatusTile = statusFilter ? wo.status === statusFilter : true;
      const matchesStatusFilter = filters.status ? wo.status === filters.status : true;
      const matchesPriority = filters.priority ? wo.priority === filters.priority : true;
      const matchesAssignee = filters.assignee ? wo.assignee === filters.assignee : true;
      const matchesSearch = lowerSearch
        ? [wo.id, wo.title, wo.description, wo.asset]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(lowerSearch))
        : true;

      return matchesStatusTile && matchesStatusFilter && matchesPriority && matchesAssignee && matchesSearch;
    });
  }, [workOrders, statusFilter, filters, searchTerm]);

  const handleStatusTileClick = (status: string) => {
    setStatusFilter((current) => (current === status ? null : status));
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterReset = () => {
    setFilters({ status: '', priority: '', assignee: '', dateFrom: '', dateTo: '' });
  };

  const handleNewWorkOrder = () => {
    setSelectedWorkOrderId(null);
    setIsFormOpen(true);
  };

  const handleViewWorkOrder = (workOrderId: string) => {
    navigate(`/work-orders/${workOrderId}`);
  };

  const handleUpdateWorkOrder = (workOrderId: string) => {
    setSelectedWorkOrderId(workOrderId);
    setIsFormOpen(true);
  };

  const handleView = (workOrderId: string) => {
    handleViewWorkOrder(workOrderId);
  };

  const handleUpdate = (workOrderId: string) => {
    handleUpdateWorkOrder(workOrderId);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedWorkOrderId(null);
  };

  const handleFormSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    setIsFormOpen(false);
    setSelectedWorkOrderId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>
            Work Orders
          </h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage and track maintenance work orders
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
          onClick={handleNewWorkOrder}
        >
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusStats.map((stat) => {
          const isActive = statusFilter === stat.label;
          return (
            <div
              key={stat.label}
              className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer"
              style={{
                backgroundColor: isActive ? `${stat.color}20` : colors.card,
                borderColor: isActive ? stat.color : colors.border,
                color: colors.foreground
              }}
              onClick={() => handleStatusTileClick(stat.label)}
            >
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.count}
              </div>
              <div className="text-sm" style={{ color: colors.mutedForeground }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
            style={{ color: colors.mutedForeground }}
          />
          <input
            type="text"
            placeholder="Search work orders..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.foreground
            }}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
          style={{ borderColor: colors.border, color: colors.foreground }}
          onClick={() => setShowFilters((previous) => !previous)}
        >
          <Filter className="w-4 h-4" />
          Filters
          {isFiltersApplied && (
            <span
              className="ml-1 inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
          )}
        </button>

        {showFilters && (
          <div
            className="absolute right-0 top-12 w-72 rounded-xl border shadow-lg p-4 space-y-3 z-10"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div>
              <label className="text-sm font-medium" style={{ color: colors.foreground }}>
                Status
              </label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.foreground }}>
                Priority
              </label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
                value={filters.priority}
                onChange={(event) => handleFilterChange('priority', event.target.value)}
              >
                <option value="">All</option>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.foreground }}>
                Assignee
              </label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
                value={filters.assignee}
                onChange={(event) => handleFilterChange('assignee', event.target.value)}
              >
                <option value="">All</option>
                {assigneeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>
                  Start date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  value={filters.dateFrom}
                  onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>
                  End date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  value={filters.dateTo}
                  onChange={(event) => handleFilterChange('dateTo', event.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                style={{ borderColor: colors.border, color: colors.foreground }}
                onClick={handleFilterReset}
                type="button"
              >
                Reset
              </button>
              <button
                className="px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                style={{ backgroundColor: colors.primary, color: 'white' }}
                type="button"
                onClick={() => setShowFilters(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredWorkOrders.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.mutedForeground }}
          >
            No work orders found.
          </div>
        ) : (
          filteredWorkOrders.map((wo) => (
            <div
              key={wo.id}
              className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                      {wo.id}
                    </h3>
                    {wo.status && (
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: `${getStatusColor(wo.status)}20`,
                          color: getStatusColor(wo.status)
                        }}
                      >
                        {wo.status}
                      </span>
                    )}
                    {wo.priority && (
                      <span
                        className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                        style={{
                          backgroundColor: `${getPriorityColor(wo.priority)}20`,
                          color: getPriorityColor(wo.priority)
                        }}
                      >
                        {wo.priority.toLowerCase() === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                        {wo.priority}
                      </span>
                    )}
                  </div>

                  <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                    {wo.title}
                  </h4>

                  <p className="text-sm mb-3" style={{ color: colors.mutedForeground }}>
                    {wo.description ?? 'No description provided.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 text-sm" style={{ color: colors.mutedForeground }}>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      Asset: {wo.asset ?? 'N/A'}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {wo.assignee ?? 'Unassigned'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {wo.dueDate ?? 'TBD'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                    style={{ borderColor: colors.border, color: colors.foreground }}
                    onClick={() => handleView(wo.id)}
                  >
                    View
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                    onClick={() => handleUpdate(wo.id)}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <WorkOrderForm
          workOrderId={selectedWorkOrderId ?? undefined}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
