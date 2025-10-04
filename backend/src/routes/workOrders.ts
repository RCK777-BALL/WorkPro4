import { Router } from 'express';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest, requireRoles } from '../middleware/auth';
import { prisma } from '../db';
import {
  createWorkOrderValidator,
  objectIdSchema,
  priorityEnum,
  statusEnum,
} from '../validators/workOrderValidators';

const router = Router();

router.use(authenticateToken);

const manageRoles = ['planner', 'supervisor', 'admin'];
const adminRoles = ['supervisor', 'admin'];

const workOrderInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  asset: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{ include: typeof workOrderInclude }>;

function serializeWorkOrder(workOrder: WorkOrderWithRelations) {
  return {
    id: workOrder.id,
    tenantId: workOrder.tenantId,
    title: workOrder.title,
    description: workOrder.description ?? null,
    priority: workOrder.priority,
    status: workOrder.status,
    assetId: workOrder.assetId ?? null,
    asset: workOrder.asset
      ? {
          id: workOrder.asset.id,
          code: workOrder.asset.code,
          name: workOrder.asset.name,
        }
      : null,
    assigneeId: workOrder.assigneeId ?? null,
    assignee: workOrder.assignee
      ? {
          id: workOrder.assignee.id,
          name: workOrder.assignee.name,
          email: workOrder.assignee.email,
        }
      : null,
    category: workOrder.category ?? null,
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    attachments: Array.isArray(workOrder.attachments) ? workOrder.attachments : [],
    createdBy: workOrder.createdBy,
    createdByUser: workOrder.createdByUser
      ? {
          id: workOrder.createdByUser.id,
          name: workOrder.createdByUser.name,
        }
      : null,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    completedAt: workOrder.completedAt ? workOrder.completedAt.toISOString() : null,
  };
}

const sortFieldEnum = z.enum(['createdAt', 'dueDate', 'priority', 'status', 'title']);

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  assignee: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeId: objectIdSchema.optional(),
  dueBefore: z
    .string()
    .trim()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) {
        return;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dueBefore must be an ISO 8601 date string' });
      }
    }),
  sortBy: sortFieldEnum.default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

const exportQuerySchema = listQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

const updateWorkOrderSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assetId: objectIdSchema.optional().nullable(),
    assigneeId: z.union([objectIdSchema, z.null()]).optional(),
    category: z.string().trim().max(120).optional().nullable(),
    dueDate: z
      .union([z.string().min(1), z.null()])
      .optional()
      .superRefine((value, ctx) => {
        if (value === undefined || value === null) {
          return;
        }

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'dueDate must be an ISO 8601 date string',
          });
        }
      }),
    attachments: z.array(objectIdSchema).optional(),
  })
  .strict();

const bulkActionSchema = z.object({
  ids: z.array(objectIdSchema).min(1),
});

const importSchema = z.object({
  items: z
    .array(
      z
        .object({
          title: z
            .string()
            .trim()
            .min(3, 'Title must be at least 3 characters long')
            .max(120, 'Title must be 120 characters or fewer'),
          description: z.string().optional(),
          status: statusEnum.optional(),
          priority: priorityEnum.optional(),
          assetId: objectIdSchema.optional(),
          assigneeId: z.union([objectIdSchema, z.null()]).optional(),
          category: z.string().optional(),
          dueDate: z.string().optional(),
          attachments: z.array(objectIdSchema).optional(),
        })
        .transform((value) => ({
          ...value,
          description: value.description ?? undefined,
          attachments: value.attachments ?? [],
        })),
    )
    .min(1)
    .max(500),
});

function buildWhere(query: z.infer<typeof listQuerySchema>, tenantId: string): Prisma.WorkOrderWhereInput {
  const where: Prisma.WorkOrderWhereInput = { tenantId };

  if (query.status) {
    where.status = query.status;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.assigneeId) {
    where.assigneeId = query.assigneeId;
  }

  if (query.assignee) {
    where.assignee = {
      is: {
        name: { contains: query.assignee, mode: 'insensitive' },
      },
    };
  }

  if (query.dueBefore) {
    const parsed = new Date(query.dueBefore);
    if (!Number.isNaN(parsed.getTime())) {
      where.dueDate = { lte: parsed };
    }
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { id: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
      { asset: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
      { assignee: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

// GET /work-orders
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const parsed = listQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return fail(res, 400, 'Invalid query parameters', parsed.error.format());
    }

    const query = parsed.data;
    const where = buildWhere(query, req.user.tenantId);
    const skip = (query.page - 1) * query.limit;

    const orderBy: Prisma.WorkOrderOrderByWithRelationInput = {
      [query.sortBy]: query.sortDir,
    };

    const [items, total] = await prisma.$transaction([
      prisma.workOrder.findMany({
        where,
        include: workOrderInclude,
        orderBy,
        skip,
        take: query.limit,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return ok(res, {
      items: items.map(serializeWorkOrder),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

// GET /work-orders/export
router.get(
  '/export',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid query parameters', parsed.error.format());
    }

    const query = parsed.data;
    const where = buildWhere(query, req.user.tenantId);
    const orderBy: Prisma.WorkOrderOrderByWithRelationInput = {
      [query.sortBy]: query.sortDir,
    };

    const items = await prisma.workOrder.findMany({
      where,
      include: workOrderInclude,
      orderBy,
      take: query.limit,
    });

    return ok(res, { items: items.map(serializeWorkOrder) });
  }),
);

// GET /work-orders/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: workOrderInclude,
    });

    if (!workOrder) {
      return fail(res, 404, 'Work order not found');
    }

    return ok(res, serializeWorkOrder(workOrder));
  }),
);

// POST /work-orders
router.post(
  '/',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createWorkOrderValidator.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        title: data.title,
        description: data.description,
        status: (data.status ?? 'requested') as WorkOrderStatus,
        priority: data.priority ?? 'medium',
        assetId: data.assetId ?? undefined,
        assigneeId: data.assigneeId ?? null,
        category: data.category ?? undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        attachments: data.attachments ?? [],
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
      },
      include: workOrderInclude,
    });

    return ok(res, serializeWorkOrder(workOrder));
  }),
);

// PUT /work-orders/:id
router.put(
  '/:id',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const data = updateWorkOrderSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const existing = await prisma.workOrder.findFirst({ where: { id, tenantId: req.user.tenantId } });

    if (!existing) {
      return fail(res, 404, 'Work order not found');
    }

    const updateData: Prisma.WorkOrderUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status as WorkOrderStatus;
      if (data.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if ('assetId' in data) {
      updateData.assetId = data.assetId ?? null;
    }

    if ('assigneeId' in data) {
      updateData.assigneeId = data.assigneeId ?? null;
    }

    if ('category' in data) {
      updateData.category = data.category && data.category.length > 0 ? data.category : null;
    }

    if ('dueDate' in data) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.attachments !== undefined) {
      updateData.attachments = data.attachments;
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: workOrderInclude,
    });

    return ok(res, serializeWorkOrder(workOrder));
  }),
);

// PATCH /work-orders/:id
router.patch(
  '/:id',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const data = updateWorkOrderSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const existing = await prisma.workOrder.findFirst({ where: { id, tenantId: req.user.tenantId } });

    if (!existing) {
      return fail(res, 404, 'Work order not found');
    }

    const updateData: Prisma.WorkOrderUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status as WorkOrderStatus;
      if (data.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if ('assetId' in data) {
      updateData.assetId = data.assetId ?? null;
    }

    if ('assigneeId' in data) {
      updateData.assigneeId = data.assigneeId ?? null;
    }

    if ('category' in data) {
      updateData.category = data.category && data.category.length > 0 ? data.category : null;
    }

    if ('dueDate' in data) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.attachments !== undefined) {
      updateData.attachments = data.attachments;
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: workOrderInclude,
    });

    return ok(res, serializeWorkOrder(workOrder));
  }),
);

// POST /work-orders/bulk/complete
router.post(
  '/bulk/complete',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { ids } = bulkActionSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    await prisma.workOrder.updateMany({
      where: {
        id: { in: ids },
        tenantId: req.user.tenantId,
      },
      data: { status: 'completed', completedAt: new Date() },
    });

    const updated = await prisma.workOrder.findMany({
      where: { id: { in: ids }, tenantId: req.user.tenantId },
      include: workOrderInclude,
    });

    return ok(res, updated.map(serializeWorkOrder));
  }),
);

// POST /work-orders/bulk/archive
router.post(
  '/bulk/archive',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { ids } = bulkActionSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    await prisma.workOrder.updateMany({
      where: {
        id: { in: ids },
        tenantId: req.user.tenantId,
      },
      data: { status: 'cancelled' },
    });

    const updated = await prisma.workOrder.findMany({
      where: { id: { in: ids }, tenantId: req.user.tenantId },
      include: workOrderInclude,
    });

    return ok(res, updated.map(serializeWorkOrder));
  }),
);

// POST /work-orders/bulk/delete
router.post(
  '/bulk/delete',
  requireRoles(adminRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { ids } = bulkActionSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const deleted = await prisma.workOrder.deleteMany({
      where: {
        id: { in: ids },
        tenantId: req.user.tenantId,
      },
    });

    return ok(res, { count: deleted.count, ids });
  }),
);

// POST /work-orders/bulk/duplicate
router.post(
  '/bulk/duplicate',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { ids } = bulkActionSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const originals = await prisma.workOrder.findMany({
      where: { id: { in: ids }, tenantId: req.user.tenantId },
    });

    if (originals.length === 0) {
      return ok(res, []);
    }

    const duplicates = await prisma.$transaction(
      originals.map((original) =>
        prisma.workOrder.create({
          data: {
            title: `${original.title} (Copy)`,
            description: original.description ?? undefined,
            status: 'requested',
            priority: original.priority,
            assetId: original.assetId ?? undefined,
            assigneeId: original.assigneeId ?? null,
            category: original.category ?? undefined,
            dueDate: original.dueDate ?? undefined,
            attachments: Array.isArray(original.attachments) ? [...original.attachments] : [],
            tenantId: original.tenantId,
            createdBy: req.user!.id,
          },
          include: workOrderInclude,
        }),
      ),
    );

    return ok(res, duplicates.map(serializeWorkOrder));
  }),
);

// POST /work-orders/import
router.post(
  '/import',
  requireRoles(manageRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { items } = importSchema.parse(req.body);

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.workOrder.create({
          data: {
            title: item.title,
            description: item.description,
            status: (item.status ?? 'requested') as WorkOrderStatus,
            priority: item.priority ?? 'medium',
            assetId: item.assetId ?? undefined,
            assigneeId: item.assigneeId ?? null,
            category: item.category ?? undefined,
            dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
            attachments: item.attachments ?? [],
            tenantId: req.user!.tenantId,
            createdBy: req.user!.id,
          },
          include: workOrderInclude,
        }),
      ),
    );

    return ok(res, created.map(serializeWorkOrder));
  }),
);

// DELETE /work-orders/:id
router.delete(
  '/:id',
  requireRoles(adminRoles),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const existing = await prisma.workOrder.findFirst({ where: { id, tenantId: req.user.tenantId } });

    if (!existing) {
      return fail(res, 404, 'Work order not found');
    }

    await prisma.workOrder.delete({ where: { id } });

    return ok(res, { id });
  }),
);

export default router;

