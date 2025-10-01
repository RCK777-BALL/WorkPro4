import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { normalizeToObjectIdString } from '../lib/ids';
import { asyncHandler, fail, ok } from '../utils/response';

const router = Router();

const workOrderCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .optional()
    .default('medium'),
  status: z
    .enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled'])
    .optional()
    .default('requested'),
  assetId: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      try {
        normalizeToObjectIdString(value);
      } catch (error) {
        if (error instanceof TypeError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid assetId',
          });
          return;
        }

        throw error;
      }
    })
    .transform((value) => normalizeToObjectIdString(value))
    .optional(),
  lineName: z.string().optional(),
  stationNumber: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  checklists: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        note: z.string().trim().optional(),
      }),
    )
    .optional(),
});

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: {
    asset: { select: { id: true; code: true; name: true } };
    createdByUser: { select: { id: true; name: true } };
  };
}>;

function mapWorkOrder(workOrder: WorkOrderWithRelations) {
  const rawChecklists = Array.isArray(workOrder.checklists)
    ? (workOrder.checklists as Prisma.JsonArray)
    : [];

  type NormalizedChecklist = {
    text: string;
    note?: string;
    done: boolean;
    completedAt?: string;
  };

  const checklists = rawChecklists.reduce<NormalizedChecklist[]>((acc, item) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const record = item as Record<string, unknown>;

    const text = typeof record.text === 'string' ? record.text : '';
    const note = typeof record.note === 'string' ? record.note : undefined;
    const done = 'done' in record ? Boolean(record.done) : false;
    const completedAt = typeof record.completedAt === 'string' ? record.completedAt : undefined;

    if (!text) {
      return acc;
    }

    acc.push({ text, note, done, completedAt });
    return acc;
  }, []);

  const assignees = Array.isArray(workOrder.assignees) ? workOrder.assignees.filter((id) => id) : [];

  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description ?? '',
    status: workOrder.status,
    priority: workOrder.priority,
    assetId: workOrder.assetId ?? null,
    assetName: workOrder.asset?.name ?? null,
    assetCode: workOrder.asset?.code ?? null,
    lineName: workOrder.lineName ?? null,
    stationNumber: workOrder.stationNumber ?? null,
    assignees,
    assigneeNames: assignees,
    requestedById: workOrder.createdByUser?.id ?? null,
    requestedByName: workOrder.createdByUser?.name ?? 'System',
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    completedAt: workOrder.status === 'completed' ? workOrder.updatedAt.toISOString() : null,
    dueDate: null,
    actualHours: workOrder.timeSpentMin ? workOrder.timeSpentMin / 60 : null,
    checklists,
  };
}

async function resolveDefaultUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    return null;
  }

  return user;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const defaultUser = await resolveDefaultUser();

    if (!defaultUser) {
      return fail(res, 500, 'No default user found');
    }

    const { status, priority, assignee, from, to, q } = req.query;

    const where: Prisma.WorkOrderWhereInput = {};

    where.tenantId = defaultUser.tenantId;

    if (typeof status === 'string' && status) {
      const allowedStatuses = ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
      if ((allowedStatuses as readonly string[]).includes(status)) {
        where.status = status as (typeof allowedStatuses)[number];
      }
    }

    if (typeof priority === 'string' && priority) {
      const allowedPriorities = ['low', 'medium', 'high', 'urgent'] as const;
      if ((allowedPriorities as readonly string[]).includes(priority)) {
        where.priority = priority as (typeof allowedPriorities)[number];
      }
    }

    if (typeof assignee === 'string' && assignee) {
      where.assignees = { has: assignee };
    }

    const createdAt: { gte?: Date; lte?: Date } = {};

    if (typeof from === 'string' && from) {
      const parsed = new Date(from);
      if (!Number.isNaN(parsed.getTime())) {
        createdAt.gte = parsed;
      }
    }

    if (typeof to === 'string' && to) {
      const parsed = new Date(to);
      if (!Number.isNaN(parsed.getTime())) {
        createdAt.lte = parsed;
      }
    }

    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    if (typeof q === 'string' && q.trim().length > 0) {
      const search = q.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { assetId: { contains: search, mode: 'insensitive' } },
        { lineName: { contains: search, mode: 'insensitive' } },
        { stationNumber: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        asset: { select: { id: true, code: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, workOrders.map(mapWorkOrder));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parseResult = workOrderCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      const { fieldErrors } = parseResult.error.flatten();
      const assetIdError = fieldErrors.assetId?.[0];
      if (assetIdError) {
        return fail(res, 400, assetIdError);
      }

      return fail(res, 400, 'Invalid request body');
    }

    const payload = parseResult.data;

    const defaultUser = await resolveDefaultUser();
    if (!defaultUser) {
      return fail(res, 500, 'No default user found to assign work orders');
    }

    const normalizedAssignees = payload.assignees?.filter((value) => value.trim().length > 0) ?? [];
    const normalizedChecklists = payload.checklists?.filter((item) => item.text.trim().length > 0) ?? [];

    const workOrder = await prisma.workOrder.create({
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || undefined,
        priority: payload.priority,
        status: payload.status,
        tenantId: defaultUser.tenantId,
        createdBy: defaultUser.id,
        assetId: payload.assetId ?? undefined,
        lineName: payload.lineName?.trim() || undefined,
        stationNumber: payload.stationNumber?.trim() || undefined,
        assignees: normalizedAssignees,
        checklists: normalizedChecklists.map((item) => ({
          text: item.text.trim(),
          note: item.note?.trim(),
          done: false,
        })),
      },
      include: {
        asset: { select: { id: true, code: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    });

    return ok(res, mapWorkOrder(workOrder));
  }),
);

export default router;
