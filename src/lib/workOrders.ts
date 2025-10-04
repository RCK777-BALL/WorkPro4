import type { WorkOrderSummary } from '../../shared/types/workOrder';
import { formatWorkOrderPriority, formatWorkOrderStatus } from './utils';

export interface WorkOrderRow {
  id: string;
  title: string;
  description: string | null;
  status: WorkOrderSummary['status'];
  statusLabel: string;
  priority: WorkOrderSummary['priority'];
  priorityLabel: string;
  assignee: string | null;
  dueDate: string | null;
  assetId: string | null;
}

export function toWorkOrderRow(workOrder: WorkOrderSummary): WorkOrderRow {
  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description ?? null,
    status: workOrder.status,
    statusLabel: formatWorkOrderStatus(workOrder.status),
    priority: workOrder.priority,
    priorityLabel: formatWorkOrderPriority(workOrder.priority),
    assignee: workOrder.assignee?.name ?? null,
    dueDate: workOrder.dueDate ?? null,
    assetId: workOrder.assetId ?? null,
  } satisfies WorkOrderRow;
}
