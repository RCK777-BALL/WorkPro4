export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkOrderStatus = 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface WorkOrderChecklist {
  text: string;
  done: boolean;
  note?: string;
  completedAt?: string;
}

export interface WorkOrderPartUsed {
  partId: string;
  qty: number;
  cost?: number;
}

export interface WorkOrderSignature {
  byUserId: string;
  byName?: string;
  role?: string;
  ts: string;
}

export interface WorkOrderAssigneeSummary {
  id: string;
  name: string;
  email: string;
}

export interface WorkOrderSummary {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assetId: string | null;
  assigneeId: string | null;
  assignee: WorkOrderAssigneeSummary | null;
  category: string | null;
  dueDate: string | null;
  attachments: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  assetId?: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  approvalStatus: ApprovalStatus;
  assignees: string[];
  checklists?: WorkOrderChecklist[];
  partsUsed?: WorkOrderPartUsed[];
  signatures?: WorkOrderSignature[];
  timeSpentMin?: number;
  photos: string[];
  failureCode?: string;
  pmTaskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    code: string;
    name: string;
  };
  createdByUser?: {
    id: string;
    name: string;
  };
}

export interface CreateWorkOrderRequest {
  assetId?: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  assignees?: string[];
  checklists?: Omit<WorkOrderChecklist, 'done' | 'completedAt'>[];
}

export interface UpdateWorkOrderRequest {
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
  assignees?: string[];
  checklists?: WorkOrderChecklist[];
}

export interface CompleteWorkOrderRequest {
  timeSpentMin?: number;
  checklists?: WorkOrderChecklist[];
  partsUsed?: WorkOrderPartUsed[];
  signatures?: Omit<WorkOrderSignature, 'ts'>[];
  photos?: string[];
  failureCode?: string;
}