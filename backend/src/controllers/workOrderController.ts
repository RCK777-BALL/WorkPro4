import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { ZodError } from 'zod';
import { createWorkOrderValidator } from '../validators/createWorkOrderValidator';

type TenantScopedRequest = Request & { tenantId?: string; siteId?: string; userId?: string };

function buildValidationError(error: ZodError) {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'base';
    const message = issue.message || 'Invalid value';

    if (!fields[path]) {
      fields[path] = [];
    }

    if (!fields[path].includes(message)) {
      fields[path].push(message);
    }
  }

  return {
    ok: false as const,
    error: {
      code: 'VALIDATION_ERROR' as const,
      fields,
    },
  };
}

function serializeWorkOrder(workOrder: {
  id: string;
  tenantId: string;
  siteId: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assetId: string | null;
  createdBy: string;
  assigneeId: string | null;
  dueDate: Date | null;
  category: string | null;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  const attachments = Array.isArray(workOrder.attachments)
    ? workOrder.attachments
        .map((raw) => {
          try {
            return JSON.parse(raw) as Prisma.JsonValue;
          } catch {
            return null;
          }
        })
        .filter((value): value is Prisma.JsonValue => value !== null)
    : [];

  return {
    id: workOrder.id,
    tenantId: workOrder.tenantId,
    siteId: workOrder.siteId,
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    status: workOrder.status,
    assetId: workOrder.assetId,
    requestedBy: workOrder.createdBy,
    assigneeId: workOrder.assigneeId,
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    category: workOrder.category,
    attachments,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  };
}

export async function createWorkOrder(req: TenantScopedRequest, res: Response) {
  const parsed = createWorkOrderValidator.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json(buildValidationError(parsed.error));
  }

  if (!req.tenantId) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Tenant context is required to create a work order',
      },
    });
  }

  if (!req.userId) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required to create a work order',
      },
    });
  }

  const data = parsed.data;

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId: req.tenantId,
        siteId: req.siteId ?? null,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'medium',
        status: 'requested',
        assetId: data.assetId ?? null,
        createdBy: req.userId,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        category: data.category ?? null,
        attachments: (data.attachments ?? []).map((attachment) => JSON.stringify(attachment)),
      },
    });

    return res.status(201).json({ ok: true, workOrder: serializeWorkOrder(workOrder) });
  } catch (error) {
    console.error('[workOrders] Failed to create work order:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Unable to create work order',
      },
    });
  }
}

export function listWorkOrders(_req: TenantScopedRequest, res: Response) {
  return res.status(200).json({ ok: true, workOrders: [] });
}

export function updateWorkOrder(_req: TenantScopedRequest, res: Response) {
  return res.status(501).json({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Update work order not yet implemented' },
  });
}

export function deleteWorkOrder(_req: TenantScopedRequest, res: Response) {
  return res.status(501).json({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Delete work order not yet implemented' },
  });
}
