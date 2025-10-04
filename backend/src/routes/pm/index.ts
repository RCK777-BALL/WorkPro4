import { Router } from 'express';
import programsRouter from './programs';
import { asyncHandler, ok } from '../../utils/response';
import { prisma } from '../../db';
import { AuthRequest, authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use('/programs', programsRouter);

router.get(
  '/overview',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = req.user!.tenantId;
    const now = new Date();

    const programs = await prisma.pmProgram.findMany({
      where: { tenantId },
      include: {
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
          orderBy: { nextRunAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const triggerRuns = await prisma.pmTriggerRun.findMany({
      where: { trigger: { program: { tenantId } } },
      orderBy: { runAt: 'desc' },
      take: 20,
      include: {
        trigger: {
          select: {
            id: true,
            programId: true,
            program: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const serializedPrograms = programs.map((program) => ({
      id: program.id,
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
      tasks: program.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        instructions: task.instructions ?? null,
        position: task.position,
        estimatedMinutes: task.estimatedMinutes ?? null,
        requiresSignOff: task.requiresSignOff,
      })),
      triggers: program.triggers.map((trigger) => ({
        id: trigger.id,
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
      })),
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    }));

    const upcomingEvents = programs
      .flatMap((program) =>
        program.triggers
          .filter((trigger) => trigger.isActive && trigger.nextRunAt)
          .map((trigger) => ({
            id: `${trigger.id}:${program.id}`,
            programId: program.id,
            programName: program.name,
            triggerId: trigger.id,
            scheduledFor: trigger.nextRunAt!.toISOString(),
            overdue: trigger.nextRunAt! < now,
          })),
      )
      .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1))
      .slice(0, 50);

    const stats = {
      activePrograms: programs.filter((program) => program.isActive).length,
      overdueTriggers: programs.reduce((count, program) => {
        return (
          count +
          program.triggers.filter((trigger) => trigger.nextRunAt && trigger.nextRunAt < now).length
        );
      }, 0),
      upcomingWeek: programs.reduce((count, program) => {
        return (
          count +
          program.triggers.filter((trigger) => {
            if (!trigger.nextRunAt) {
              return false;
            }

            const diff = trigger.nextRunAt.getTime() - now.getTime();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            return diff >= 0 && diff <= sevenDays;
          }).length
        );
      }, 0),
      totalTasks: programs.reduce((sum, program) => sum + program.tasks.length, 0),
    };

    const runs = triggerRuns.map((run) => ({
      id: run.id,
      triggerId: run.triggerId,
      programId: run.trigger.programId,
      programName: run.trigger.program.name,
      status: run.status,
      runAt: run.runAt.toISOString(),
      scheduledFor: run.scheduledFor ? run.scheduledFor.toISOString() : null,
      workOrderId: run.workOrderId ?? null,
      error: run.error ?? null,
      details: run.details ?? null,
    }));

    return ok(res, {
      stats,
      programs: serializedPrograms,
      upcomingEvents,
      runs,
    });
  }),
);

export default router;
