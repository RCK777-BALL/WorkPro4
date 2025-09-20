import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, ClipboardList, User, AlertTriangle, Clock, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

interface WorkOrderDetailsData {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled' | string;
  asset: string;
  assignee: string;
  dueDate: string;
  createdDate: string;
  estimatedHours?: number;
  completedHours?: number;
  notes?: string;
}

const fallbackWorkOrders: WorkOrderDetailsData[] = [
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
    estimatedHours: 6,
    notes: 'Technician dispatched and materials staged for repair.'
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
    estimatedHours: 4,
    completedHours: 3,
    notes: 'All components passed inspection. Minor wear noted on pressure gauge.'
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
    estimatedHours: 8,
    notes: 'Awaiting part delivery scheduled for tomorrow.'
  }
];

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { colors } = useTheme();

  const fallback = useMemo(
    () => fallbackWorkOrders.find(workOrder => workOrder.id === id),
    [id]
  );

  const { data: workOrder, isLoading, error } = useQuery<WorkOrderDetailsData, Error>({
    queryKey: ['work-order', id],
    queryFn: async (): Promise<WorkOrderDetailsData> => {
      if (!id) {
        throw new Error('Work order not found');
      }

      try {
        return await api.get<WorkOrderDetailsData>(`/work-orders/${id}`);
      } catch {
        if (fallback) {
          return fallback;
        }
        throw new Error('Work order not found');
      }
    },
    enabled: !!id,
    retry: 0
  });

  const details = workOrder ?? fallback;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return colors.error;
      case 'High':
        return colors.warning;
      case 'Medium':
        return colors.info;
      case 'Low':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return colors.info;
      case 'Assigned':
      case 'In Progress':
        return colors.warning;
      case 'Completed':
        return colors.success;
      case 'Cancelled':
        return colors.mutedForeground;
      default:
        return colors.mutedForeground;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="h-64 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ color: colors.foreground }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Orders
        </button>
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <p style={{ color: colors.error }}>Unable to load work order details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg"
        style={{ color: colors.foreground }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Work Orders
      </button>

      <div
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>
                {details.title}
              </h1>
              <span
                className="px-3 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: `${getStatusColor(details.status)}20`,
                  color: getStatusColor(details.status)
                }}
              >
                {details.status}
              </span>
              <span
                className="px-3 py-1 text-xs rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: `${getPriorityColor(details.priority)}20`,
                  color: getPriorityColor(details.priority)
                }}
              >
                {details.priority === 'Urgent' && <AlertTriangle className="w-3 h-3" />}
                {details.priority}
              </span>
            </div>
            <p className="text-sm" style={{ color: colors.mutedForeground }}>
              {details.description}
            </p>
          </div>
          <div className="space-y-2 text-sm" style={{ color: colors.mutedForeground }}>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>Asset: {details.asset}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Assignee: {details.assignee}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Due: {details.dueDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Estimated: {details.estimatedHours ?? '—'} hrs</span>
            </div>
            {details.completedHours !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Actual: {details.completedHours} hrs</span>
              </div>
            )}
          </div>
        </div>

        {details.notes && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2" style={{ color: colors.foreground }}>
              <FileText className="w-4 h-4" />
              <h2 className="text-lg font-semibold">Notes</h2>
            </div>
            <p className="text-sm" style={{ color: colors.mutedForeground }}>
              {details.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
