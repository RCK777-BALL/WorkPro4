import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Filter, User, Calendar, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function WorkOrders() {
  const { colors } = useTheme();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    dateFrom: '',
    dateTo: ''
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
      dueDateValue: '2024-03-05',
      createdDateValue: '2024-03-04T08:00:00.000Z'
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
      dueDateValue: '2024-03-03',
      createdDateValue: '2024-03-01T12:00:00.000Z'
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
      dueDateValue: '2024-03-10',
      createdDateValue: '2024-03-03T09:30:00.000Z'
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
      <div className="flex items-center gap-4">
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
        <button
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
          style={{ borderColor: colors.border, color: colors.foreground }}
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
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
                >
                  View
                </button>
                <button 
                  className="px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}