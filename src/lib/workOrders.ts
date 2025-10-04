export interface WorkOrderRecord {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assignee?: string;
  asset?: string;
  dueDate?: string;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function normalizeAssignee(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string');
    return typeof first === 'string' ? first : undefined;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string') {
      return record.name;
    }
  }

  return undefined;
}

function normalizeAsset(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string') {
      return record.name;
    }
    if (typeof record.code === 'string') {
      return record.code;
    }
  }

  return undefined;
}

function ensureId(record: Record<string, unknown>, title: string): string | null {
  const candidates = [
    record.id,
    record._id,
    record.workOrderId,
    record.reference,
    record.code,
  ];

  for (const candidate of candidates) {
    const asId = asString(candidate);
    if (asId) {
      return asId;
    }
  }

  const fallbackTitle = title.trim();
  if (fallbackTitle) {
    return `wo-${fallbackTitle.toLowerCase().replace(/\s+/g, '-')}`;
  }

  return null;
}

function normalizeWorkOrder(input: unknown): WorkOrderRecord | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;
  const title = asString(record.title, 'Untitled work order');
  const id = ensureId(record, title);

  if (!id) {
    return null;
  }

  const status = asString(record.status, 'Open');
  const priority = asString(record.priority, 'Medium');
  const description = asString(record.description, undefined);
  const assignee =
    normalizeAssignee(record.assignee) ||
    normalizeAssignee(record.assigneeName) ||
    normalizeAssignee(record.owner) ||
    normalizeAssignee(record.assignees) ||
    normalizeAssignee(record.assignedTo) ||
    normalizeAssignee(record.primaryTechnician);
  const asset = normalizeAsset(record.asset) || normalizeAsset(record.assetName);
  const dueDate = asString(record.dueDate, undefined);

  return {
    id,
    title,
    status,
    priority,
    description,
    assignee: assignee ?? 'Unassigned',
    asset,
    dueDate,
  };
}

export function normalizeWorkOrders(input: unknown): WorkOrderRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => normalizeWorkOrder(entry))
    .filter((entry): entry is WorkOrderRecord => entry !== null);
}
