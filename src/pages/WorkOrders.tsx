import { useState } from 'react';

import { ClipboardList, Plus, Search, Filter, User, Calendar, AlertTriangle } from 'lucide-react';
import { WorkOrderForm } from '../components/forms/WorkOrderForm';

import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled' | string;
  asset: string;
  assignee: string;
  dueDate: string;
  createdDate: string;
}

type WorkOrder = {
  id: string;
  title: string;
  description: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  asset: string;
  assignee: string;
  dueDate: string;
  createdDate: string;
};

export default function WorkOrders() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    dateFrom: '',
    dateTo: ''
  });

  type FilterState = {
    status: string;
    priority: string;
    assignee: string;
    startDate: string;
    endDate: string;
  };

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'All',
    priority: 'All',
    assignee: 'All',
    startDate: '',
    endDate: ''
  });

  const statusStats = [
    { label: 'Open', count: 24, color: colors.info },
    { label: 'In Progress', count: 8, color: colors.warning },
    { label: 'Completed', count: 156, color: colors.success },
    { label: 'Overdue', count: 3, color: colors.error }
  ];

  type WorkOrder = {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    asset: string;
    assignee: string;
    dueDate: string;
    createdDate: string;
    dueDateValue: string;
    createdDateValue: string;
  };

  const workOrders = useMemo<WorkOrder[]>(
    () => [
    {
      id: 'WO-2024-001',
      title: 'Motor Overheating - Emergency Repair',
      description: 'Drive motor is running hot and making unusual noises. Needs immediate attention.',
      priority: 'Urgent',
      status: 'Assigned',
      asset: 'Drive Motor #1',
      assignee: 'John Smith',
      dueDate: 'Today',
      createdDate: '2 hours ago',
      createdAt: '2024-04-24'

    },
    {
      id: 'WO-2024-002',
      title: 'Quarterly Hydraulic System Inspection',
      description: 'Routine quarterly inspection of hydraulic pump and associated components.',
      priority: 'Medium',
      status: 'Completed',
      asset: 'Hydraulic Pump #1',
      assignee: 'Jane Doe',
      dueDate: 'Yesterday',
      createdDate: '3 days ago',
      createdAt: '2024-04-20'

    },
    {
      id: 'WO-2024-003',
      title: 'Conveyor Belt Replacement',
      description: 'Replace worn conveyor belt before it fails.',
      priority: 'High',
      status: 'Open',
      asset: 'Conveyor Belt #1',
      assignee: 'Unassigned',
      dueDate: 'Next week',
      createdDate: '1 day ago',
      createdAt: '2024-04-22'

    }
  ], []);

  const statusOptions = useMemo(
    () => Array.from(new Set(workOrders.map((wo) => wo.status))).sort(),
    [workOrders]
  );

  const priorityOptions = useMemo(
    () => Array.from(new Set(workOrders.map((wo) => wo.priority))).sort(),
    [workOrders]
  );

  const assigneeOptions = useMemo(
    () => Array.from(new Set(workOrders.map((wo) => wo.assignee))).sort(),
    [workOrders]
  );

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchesStatus = filters.status ? wo.status === filters.status : true;
      const matchesPriority = filters.priority ? wo.priority === filters.priority : true;
      const matchesAssignee = filters.assignee ? wo.assignee === filters.assignee : true;

      const createdDate = new Date(wo.createdDateValue);
      const matchesDateFrom = filters.dateFrom ? createdDate >= new Date(filters.dateFrom) : true;
      const matchesDateTo = filters.dateTo ? createdDate <= new Date(filters.dateTo) : true;

      return (
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [filters, workOrders]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };



  const openForm = (workOrderId?: string) => {
    setSelectedWorkOrderId(workOrderId ?? null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedWorkOrderId(null);
  };

  const handleView = (workOrderId: string) => {
    navigate(`/work-orders/${workOrderId}`);
  };

  const handleUpdate = (workOrderId: string) => {
    openForm(workOrderId);
  };


  const statusOptions = ['All', 'Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
  const priorityOptions = ['All', 'Urgent', 'High', 'Medium', 'Low'];
  const assigneeOptions = ['All', ...Array.from(new Set(workOrders.map((wo) => wo.assignee).filter(Boolean)))];

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const statusMatch = filters.status === 'All' || wo.status === filters.status;
    const priorityMatch = filters.priority === 'All' || wo.priority === filters.priority;
    const assigneeMatch = filters.assignee === 'All' || wo.assignee === filters.assignee;

    const createdDate = wo.createdAt ? new Date(wo.createdAt) : null;
    const startDateMatch = !filters.startDate || (createdDate && createdDate >= new Date(filters.startDate));
    const endDateMatch = !filters.endDate || (createdDate && createdDate <= new Date(filters.endDate));

    return statusMatch && priorityMatch && assigneeMatch && startDateMatch && endDateMatch;
  });

  const isFiltersApplied =
    filters.status !== 'All' ||
    filters.priority !== 'All' ||
    filters.assignee !== 'All' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return colors.error;
      case 'High': return colors.warning;
      case 'Medium': return colors.info;
      case 'Low': return colors.success;
      default: return colors.mutedForeground;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return colors.info;
      case 'Assigned': return colors.warning;
      case 'In Progress': return colors.warning;
      case 'Completed': return colors.success;
      case 'Cancelled': return colors.mutedForeground;
      default: return colors.mutedForeground;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Work Orders</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage and track maintenance work orders
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
          onClick={() => openForm()}

        >
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusStats.map((stat, index) => (
          <div 
            key={index}
            className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</div>
            <div className="text-sm" style={{ color: colors.mutedForeground }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
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
          />
        </div>
        <div className="relative">
          <button
            className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
            style={{
              borderColor: colors.border,
              color: colors.foreground,
              backgroundColor: isFiltersApplied ? `${colors.primary}10` : 'transparent'
            }}
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
            aria-haspopup="true"
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
              className="absolute right-0 mt-2 w-72 rounded-xl border shadow-lg p-4 space-y-3 z-10"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Status</label>
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
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Priority</label>
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
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Assignee</label>
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
                  {assigneeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: colors.foreground }}>Start date</label>
                  <input
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground
                    }}
                    value={filters.startDate}
                    onChange={(event) => handleFilterChange('startDate', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: colors.foreground }}>End date</label>
                  <input
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground
                    }}
                    value={filters.endDate}
                    onChange={(event) => handleFilterChange('endDate', event.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  className="text-sm hover:underline"
                  style={{ color: colors.mutedForeground }}
                  onClick={() => {
                    setFilters({
                      status: 'All',
                      priority: 'All',
                      assignee: 'All',
                      startDate: '',
                      endDate: ''
                    });
                    setShowFilters(false);
                  }}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                  onClick={() => setShowFilters(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {showFilters && (
        <div
          className="rounded-xl border p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(event) => handleFilterChange('priority', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Assignee
            </label>
            <select
              value={filters.assignee}
              onChange={(event) => handleFilterChange('assignee', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Created Date
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
                className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => handleFilterChange('dateTo', event.target.value)}
                className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              />
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 border rounded-xl text-sm hover:bg-opacity-80 transition-colors"
              style={{ borderColor: colors.border, color: colors.foreground }}
              onClick={() =>
                setFilters({ status: '', priority: '', assignee: '', dateFrom: '', dateTo: '' })
              }
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.map((wo) => (
          <div
            key={wo.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}

          >
            No work orders found.
          </div>
        ) : (
          workOrders.map((wo) => (
            <div
              key={wo.id}
              className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                      {wo.id}
                    </h3>
                    <span
                      className="px-2 py-1 text-xs rounded-full"
                      style={{
                        backgroundColor: `${getStatusColor(wo.status)}20`,
                        color: getStatusColor(wo.status)
                      }}
                    >
                      {wo.status}
                    </span>
                    <span
                      className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: `${getPriorityColor(wo.priority)}20`,
                        color: getPriorityColor(wo.priority)
                      }}
                    >
                      {wo.priority === 'Urgent' && <AlertTriangle className="w-3 h-3" />}
                      {wo.priority}
                    </span>

                  </div>

                  <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                    {wo.title}
                  </h4>

                  <p className="text-sm mb-3" style={{ color: colors.mutedForeground }}>
                    {wo.description}
                  </p>

                  <div className="flex items-center gap-6 text-sm" style={{ color: colors.mutedForeground }}>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      Asset: {wo.asset}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {wo.assignee}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {wo.dueDate}
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
          onClose={closeForm}
          onSuccess={() => {
            refetch();

          }}
        />
      )}
    </div>
  );
}
