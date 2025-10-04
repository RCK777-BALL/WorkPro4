import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { ok, fail, asyncHandler } from '../../utils/response';
import { prisma } from '../../db';
import { AuthRequest } from '../../middleware/auth';
import {
  createProgramValidator,
  updateProgramValidator,
  createTaskValidator,
  updateTaskValidator,
  createTriggerValidator,
  updateTriggerValidator,
  programIdParamSchema,
  taskIdParamSchema,
  triggerIdParamSchema,
} from '../../validators/pmValidators';
import { calculateNextRun } from '../../lib/pm/scheduling';

const router = Router();

const programInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  tasks: {
    orderBy: { position: 'asc' },
  },
  triggers: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.PmProgramInclude;

type ProgramPayload = Prisma.PmProgramGetPayload<{ include: typeof programInclude }>;

type TriggerPayload = Prisma.PmTriggerGetPayload<{}>;

type TaskPayload = Prisma.PmTaskGetPayload<{}>;

function serializeTask(task: TaskPayload) {
  return {
    id: task.id,
    programId: task.programId,
    title: task.title,
    instructions: task.instructions ?? null,
    position: task.position,
    estimatedMinutes: task.estimatedMinutes ?? null,
    requiresSignOff: task.requiresSignOff,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function serializeTrigger(trigger: TriggerPayload) {
  return {
    id: trigger.id,
    programId: trigger.programId,
    type: trigger.type,
    cronExpression: trigger.cronExpression ?? null,
    intervalDays: trigger.intervalDays ?? null,
    meterThreshold: trigger.meterThreshold ?? null,
    settings: trigger.settings ?? null,
    startDate: trigger.startDate ? trigger.startDate.toISOString() : null,
    endDate: trigger.endDate ? trigger.endDate.toISOString() : null,
    lastRunAt: trigger.lastRunAt ? trigger.lastRunAt.toISOString() : null,
    nextRunAt: trigger.nextRunAt ? trigger.nextRunAt.toISOString() : null,
    isActive: trigger.isActive,
    createdAt: trigger.createdAt.toISOString(),
    updatedAt: trigger.updatedAt.toISOString(),
  };
}

function serializeProgram(program: ProgramPayload) {
  return {
    id: program.id,
    tenantId: program.tenantId,
    ownerId: program.ownerId,
    name: program.name,
    description: program.description ?? null,
    assetId: program.assetId ?? null,
    timezone: program.timezone,
    isActive: program.isActive,
    lastGeneratedAt: program.lastGeneratedAt ? program.lastGeneratedAt.toISOString() : null,
    owner: program.owner
      ? {
          id: program.owner.id,
          name: program.owner.name,
          email: program.owner.email,
        }
      : null,
    tasks: program.tasks.map(serializeTask),
    triggers: program.triggers.map(serializeTrigger),
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

async function findProgram(programId: string, tenantId: string) {
  return prisma.pmProgram.findFirst({
    where: { id: programId, tenantId },
    include: programInclude,
  });
}

async function validateOwner(tenantId: string, ownerId: string | null | undefined) {
  if (!ownerId) {
    return false;
  }

  const owner = await prisma.user.findFirst({ where: { id: ownerId, tenantId } });
  return owner != null;
}

async function validateAsset(tenantId: string, assetId: string | null | undefined) {
  if (!assetId) {
    return true;
  }

  const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId } });
  return asset != null;
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const programs = await prisma.pmProgram.findMany({
      where: { tenantId: req.user!.tenantId },
      include: programInclude,
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, programs.map(serializeProgram));
  }),
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const payload = createProgramValidator.parse(req.body);
    const ownerId = payload.ownerId ?? req.user!.id;

    const ownerValid = await validateOwner(req.user!.tenantId, ownerId);

    if (!ownerValid) {
      return fail(res, 400, 'ownerId must reference a user in the same tenant');
    }

    if (payload.assetId) {
      const assetValid = await validateAsset(req.user!.tenantId, payload.assetId);

      if (!assetValid) {
        return fail(res, 400, 'assetId must reference an asset in the same tenant');
      }
    }

    const program = await prisma.pmProgram.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        assetId: payload.assetId ?? null,
        timezone: payload.timezone ?? 'UTC',
        isActive: payload.isActive ?? true,
        tenantId: req.user!.tenantId,
        ownerId,
      },
      include: programInclude,
    });

    return ok(res, serializeProgram(program));
  }),
);

router.get(
  '/:programId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    return ok(res, serializeProgram(program));
  }),
);

router.put(
  '/:programId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const payload = updateProgramValidator.parse(req.body);

    const existing = await findProgram(programId, req.user!.tenantId);

    if (!existing) {
      return fail(res, 404, 'Program not found');
    }

    let ownerIdToApply = existing.ownerId;

    if (payload.ownerId !== undefined) {
      if (!payload.ownerId) {
        return fail(res, 400, 'ownerId is required');
      }

      const ownerValid = await validateOwner(req.user!.tenantId, payload.ownerId);

      if (!ownerValid) {
        return fail(res, 400, 'ownerId must reference a user in the same tenant');
      }

      ownerIdToApply = payload.ownerId;
    }

    let assetIdToApply = existing.assetId;

    if (payload.assetId !== undefined) {
      if (payload.assetId === null) {
        assetIdToApply = null;
      } else {
        const assetValid = await validateAsset(req.user!.tenantId, payload.assetId);

        if (!assetValid) {
          return fail(res, 400, 'assetId must reference an asset in the same tenant');
        }

        assetIdToApply = payload.assetId;
      }
    }

    const program = await prisma.pmProgram.update({
      where: { id: programId },
      data: {
        name: payload.name ?? existing.name,
        description: payload.description ?? existing.description,
        assetId: assetIdToApply,
        timezone: payload.timezone ?? existing.timezone,
        isActive: payload.isActive ?? existing.isActive,
        ownerId: ownerIdToApply,
      },
      include: programInclude,
    });

    return ok(res, serializeProgram(program));
  }),
);

router.delete(
  '/:programId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);

    const existing = await findProgram(programId, req.user!.tenantId);

    if (!existing) {
      return fail(res, 404, 'Program not found');
    }

    await prisma.pmProgram.delete({ where: { id: programId } });

    return ok(res, { deleted: true });
  }),
);

router.get(
  '/:programId/tasks',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const tasks = await prisma.pmTask.findMany({
      where: { programId },
      orderBy: { position: 'asc' },
    });

    return ok(res, tasks.map(serializeTask));
  }),
);

router.post(
  '/:programId/tasks',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const payload = createTaskValidator.parse(req.body);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const nextPosition =
      payload.position ??
      (await prisma.pmTask.count({
        where: { programId },
      }));

    const task = await prisma.pmTask.create({
      data: {
        programId,
        title: payload.title,
        instructions: payload.instructions ?? null,
        position: nextPosition,
        estimatedMinutes: payload.estimatedMinutes ?? null,
        requiresSignOff: payload.requiresSignOff ?? false,
      },
    });

    return ok(res, serializeTask(task));
  }),
);

router.put(
  '/:programId/tasks/:taskId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const taskId = taskIdParamSchema.parse(req.params.taskId);
    const payload = updateTaskValidator.parse(req.body);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const existing = await prisma.pmTask.findFirst({ where: { id: taskId, programId } });

    if (!existing) {
      return fail(res, 404, 'Task not found');
    }

    const task = await prisma.pmTask.update({
      where: { id: taskId },
      data: {
        title: payload.title ?? existing.title,
        instructions: payload.instructions ?? existing.instructions,
        position: payload.position ?? existing.position,
        estimatedMinutes: payload.estimatedMinutes ?? existing.estimatedMinutes,
        requiresSignOff: payload.requiresSignOff ?? existing.requiresSignOff,
      },
    });

    return ok(res, serializeTask(task));
  }),
);

router.delete(
  '/:programId/tasks/:taskId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const taskId = taskIdParamSchema.parse(req.params.taskId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const existing = await prisma.pmTask.findFirst({ where: { id: taskId, programId } });

    if (!existing) {
      return fail(res, 404, 'Task not found');
    }

    await prisma.pmTask.delete({ where: { id: taskId } });

    return ok(res, { deleted: true });
  }),
);

router.get(
  '/:programId/triggers',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const triggers = await prisma.pmTrigger.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, triggers.map(serializeTrigger));
  }),
);

router.post(
  '/:programId/triggers',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const payload = createTriggerValidator.parse(req.body);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const startDate = payload.startDate ? new Date(payload.startDate) : null;
    const endDate = payload.endDate ? new Date(payload.endDate) : null;

    const nextRun = calculateNextRun({
      type: payload.type,
      cronExpression: payload.cronExpression ?? null,
      timezone: program.timezone,
      startDate,
      endDate,
    });

    const trigger = await prisma.pmTrigger.create({
      data: {
        programId,
        type: payload.type,
        cronExpression: payload.cronExpression ?? null,
        intervalDays: payload.intervalDays ?? null,
        meterThreshold: payload.meterThreshold ?? null,
        settings: payload.settings !== undefined ? (payload.settings as Prisma.InputJsonValue) : undefined,
        startDate,
        endDate,
        isActive: payload.isActive ?? true,
        nextRunAt: nextRun,
      },
    });

    return ok(res, serializeTrigger(trigger));
  }),
);

router.put(
  '/:programId/triggers/:triggerId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const triggerId = triggerIdParamSchema.parse(req.params.triggerId);
    const payload = updateTriggerValidator.parse(req.body);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const existing = await prisma.pmTrigger.findFirst({ where: { id: triggerId, programId } });

    if (!existing) {
      return fail(res, 404, 'Trigger not found');
    }

    const type = payload.type ?? existing.type;
    const cronExpression =
      payload.cronExpression !== undefined ? payload.cronExpression : existing.cronExpression;
    const intervalDays =
      payload.intervalDays !== undefined ? payload.intervalDays : existing.intervalDays;
    const meterThreshold =
      payload.meterThreshold !== undefined ? payload.meterThreshold : existing.meterThreshold;
    const settings =
      payload.settings !== undefined
        ? (payload.settings as Prisma.InputJsonValue | null)
        : ((existing.settings ?? null) as Prisma.InputJsonValue | null);
    const startDate =
      payload.startDate !== undefined
        ? payload.startDate
          ? new Date(payload.startDate)
          : null
        : existing.startDate;
    const endDate =
      payload.endDate !== undefined
        ? payload.endDate
          ? new Date(payload.endDate)
          : null
        : existing.endDate;

    const nextRun = calculateNextRun({
      type,
      cronExpression: cronExpression ?? null,
      timezone: program.timezone,
      startDate,
      endDate,
    });

    const trigger = await prisma.pmTrigger.update({
      where: { id: triggerId },
      data: {
        type,
        cronExpression,
        intervalDays,
        meterThreshold,
        settings,
        startDate,
        endDate,
        isActive: payload.isActive ?? existing.isActive,
        nextRunAt: nextRun,
      },
    });

    return ok(res, serializeTrigger(trigger));
  }),
);

router.delete(
  '/:programId/triggers/:triggerId',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const triggerId = triggerIdParamSchema.parse(req.params.triggerId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const existing = await prisma.pmTrigger.findFirst({ where: { id: triggerId, programId } });

    if (!existing) {
      return fail(res, 404, 'Trigger not found');
    }

    await prisma.pmTrigger.delete({ where: { id: triggerId } });

    return ok(res, { deleted: true });
  }),
);

router.get(
  '/:programId/triggers/:triggerId/runs',
  asyncHandler(async (req: AuthRequest, res) => {
    const programId = programIdParamSchema.parse(req.params.programId);
    const triggerId = triggerIdParamSchema.parse(req.params.triggerId);

    const program = await findProgram(programId, req.user!.tenantId);

    if (!program) {
      return fail(res, 404, 'Program not found');
    }

    const runs = await prisma.pmTriggerRun.findMany({
      where: { triggerId },
      orderBy: { runAt: 'desc' },
      take: 50,
    });

    const serialized = runs.map((run) => ({
      id: run.id,
      triggerId: run.triggerId,
      status: run.status,
      runAt: run.runAt.toISOString(),
      scheduledFor: run.scheduledFor ? run.scheduledFor.toISOString() : null,
      workOrderId: run.workOrderId ?? null,
      details: run.details ?? null,
      error: run.error ?? null,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    }));

    return ok(res, serialized);
  }),
);

export default router;
