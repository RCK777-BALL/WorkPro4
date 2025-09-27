import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
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
  assetId: z.string().optional(),
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

  const checklists = rawChecklists
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const text = 'text' in item && typeof item.text === 'string' ? item.text : '';
      const note = 'note' in item && typeof item.note === 'string' ? item.note : undefined;
      const done = 'done' in item ? Boolean(item.done) : false;
      const completedAt =
        'completedAt' in item && typeof item.completedAt === 'string' ? item.completedAt : undefined;

      if (!text) {
        return null;
      }

      return { text, note, done, completedAt };
    })
    .filter((item): item is { text: string; note?: string; done: boolean; completedAt?: string } => item !== null);

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
    const { status, priority, assignee, from, to, q } = req.query;

    const where: Prisma.WorkOrderWhereInput = {};

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
    const payload = workOrderCreateSchema.parse(req.body);

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
        assetId: payload.assetId?.trim() || undefined,
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
