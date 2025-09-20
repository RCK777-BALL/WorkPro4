import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ClipboardList, User, MapPin, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { type MockWorkOrder, getMockWorkOrderById } from '../lib/mockWorkOrders';

export default function WorkOrderDetails() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: workOrder, isLoading } = useQuery<MockWorkOrder | null>({
    queryKey: ['work-order', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const result = await api.get<MockWorkOrder>(`/work-orders/${id}`);
        if (!result) {
          return getMockWorkOrderById(id) ?? null;
        }
        return result;
      } catch {
        return getMockWorkOrderById(id) ?? null;
      }
    },
    enabled: !!id,
    initialData: () => (id ? getMockWorkOrderById(id) ?? null : null)
  });

  const priorityBadge = useMemo(() => {
    if (!workOrder) return { label: 'Unknown', color: colors.mutedForeground };
    const priority = workOrder.priority?.toLowerCase() ?? 'medium';
    switch (priority) {
      case 'urgent':
        return { label: 'Urgent', color: colors.error };
      case 'high':
        return { label: 'High', color: colors.warning };
      case 'low':
        return { label: 'Low', color: colors.success };
      default:
        return { label: 'Medium', color: colors.info };
    }
  }, [colors.error, colors.info, colors.mutedForeground, colors.success, colors.warning, workOrder]);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div
          className="rounded-xl border p-6 text-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.mutedForeground }}
        >
          Loading work order details...
        </div>

      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` }}
            onClick={() => navigate('/work-orders')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work Orders
          </button>
        </div>
        <div
          className="rounded-xl border p-6 text-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.mutedForeground }}
        >
          Work order not found.

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` }}
          onClick={() => navigate('/work-orders')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Orders
        </button>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>{workOrder.title}</h1>
            <p className="mt-2 text-sm" style={{ color: colors.mutedForeground }}>{workOrder.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: `${priorityBadge.color}20`, color: priorityBadge.color }}
            >
              Priority: {priorityBadge.label}
            </span>
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: `${colors.info}20`, color: colors.info }}
            >
              Status: {workOrder.status}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed" style={{ color: colors.mutedForeground }}>
          {workOrder.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2" style={{ color: colors.mutedForeground }}>
            <ClipboardList className="w-4 h-4" />
            Asset: {workOrder.asset ?? 'N/A'}
          </div>
          <div className="flex items-center gap-2" style={{ color: colors.mutedForeground }}>
            <User className="w-4 h-4" />
            Assigned To: {workOrder.assignee ?? 'Unassigned'}
          </div>
          <div className="flex items-center gap-2" style={{ color: colors.mutedForeground }}>
            <Calendar className="w-4 h-4" />
            Due Date: {workOrder.dueDate ?? 'TBD'}
          </div>
          <div className="flex items-center gap-2" style={{ color: colors.mutedForeground }}>
            <MapPin className="w-4 h-4" />
            Location: {workOrder.location ?? 'Not specified'}
          </div>
        </div>

        {workOrder.instructions && (
          <div className="mt-6 rounded-lg border p-4" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: colors.foreground }}>
              <FileText className="w-4 h-4" />
              Special Instructions
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.mutedForeground }}>
              {workOrder.instructions}

            </p>
          </div>
        )}
      </div>
    </div>
  );
}
