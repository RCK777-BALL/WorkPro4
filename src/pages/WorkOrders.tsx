import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

export default function WorkOrders() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  const { data: workOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async (): Promise<WorkOrder[]> => {
      try {
        return await api.get<WorkOrder[]>('/work-orders');
      } catch {
        return [
          {
            id: 'WO-2024-001',
            title: 'Motor Overheating - Emergency Repair',
            description: 'Drive motor is running hot and making unusual noises. Needs immediate attention.',
            priority: 'Urgent',
            status: 'Assigned',
            asset: 'Drive Motor #1',
            assignee: 'John Smith',
            dueDate: 'Today',
            createdDate: '2 hours ago'
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
            createdDate: '3 days ago'
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
            createdDate: '1 day ago'
          }
        ];
      }
    }
  });

  const openCount = workOrders.filter(wo => wo.status === 'Open').length;
  const inProgressCount = workOrders.filter(wo => ['Assigned', 'In Progress'].includes(wo.status)).length;
  const completedCount = workOrders.filter(wo => wo.status === 'Completed').length;
  const overdueCount = workOrders.filter(wo => wo.priority === 'Urgent').length;

  const statusStats = [
    { label: 'Open', count: openCount, color: colors.info },
    { label: 'In Progress', count: inProgressCount, color: colors.warning },
    { label: 'Completed', count: completedCount, color: colors.success },
    { label: 'Overdue', count: overdueCount, color: colors.error }
  ];

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
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-xl border animate-pulse"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            ></div>
          ))
        ) : workOrders.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.mutedForeground }}
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