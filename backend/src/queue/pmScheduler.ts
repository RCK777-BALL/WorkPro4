import { Queue, Worker } from 'bullmq';
import { PmTriggerRunStatus, PmTriggerType, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { prisma } from '../db';
import { getRedisConnection, getRedisUrl } from '../lib/redis';
import { calculateNextRun } from '../lib/pm/scheduling';

const QUEUE_NAME = 'pm-scheduler';
const TICK_JOB_NAME = 'pm-scheduler:tick';
const DEFAULT_REPEAT_MS = 60_000; // 1 minute cadence

let queue: Queue | null = null;
let worker: Worker | null = null;
let initializing = false;

function getScheduledFor(trigger: { nextRunAt: Date | null; startDate: Date | null }): Date {
  if (trigger.nextRunAt) {
    return trigger.nextRunAt;
  }

  if (trigger.startDate) {
    return trigger.startDate;
  }

  return new Date();
}

async function ensureTickJob(): Promise<void> {
  if (!queue) {
    return;
  }

  const existing = await queue.getRepeatableJobs();
  const hasTick = existing.some((job) => job.name === TICK_JOB_NAME);

  if (!hasTick) {
    await queue.add(TICK_JOB_NAME, {}, {
      repeat: { every: DEFAULT_REPEAT_MS },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}

async function runSchedulerTick(): Promise<void> {
  const now = new Date();

  const triggers = await prisma.pmTrigger.findMany({
    where: {
      isActive: true,
      program: { isActive: true },
      OR: [
        { nextRunAt: { lte: now } },
        { nextRunAt: null, startDate: { lte: now } },
      ],
      type: PmTriggerType.calendar,
    },
    include: {
      program: {
        include: {
          tasks: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
    orderBy: { nextRunAt: 'asc' },
    take: 25,
  });

  for (const trigger of triggers) {
    if (!trigger.program) {
      continue;
    }

    const program = trigger.program;
    const scheduledFor = getScheduledFor({ nextRunAt: trigger.nextRunAt, startDate: trigger.startDate });

    const nextRun = calculateNextRun({
      type: trigger.type,
      cronExpression: trigger.cronExpression ?? undefined,
      timezone: program.timezone,
      startDate: trigger.startDate,
      endDate: trigger.endDate,
      from: now,
    });

    const baseRunData = {
      triggerId: trigger.id,
      runAt: now,
      scheduledFor,
      details: {
        program: {
          id: program.id,
          name: program.name,
        },
        tasks: program.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          requiresSignOff: task.requiresSignOff,
          estimatedMinutes: task.estimatedMinutes ?? null,
        })),
      },
    };

    try {
      await prisma.$transaction(async (tx) => {
        const workOrder = await tx.workOrder.create({
          data: {
            tenantId: program.tenantId,
            title: program.name,
            description:
              program.description ?? `Preventive maintenance generated from program ${program.name}`,
            status: WorkOrderStatus.requested,
            priority: WorkOrderPriority.medium,
            assetId: program.assetId ?? undefined,
            assigneeId: null,
            category: 'preventive_maintenance',
            dueDate: scheduledFor,
            attachments: [],
            pmProgramId: program.id,
            pmTriggerId: trigger.id,
            createdBy: program.ownerId,
            isPreventive: true,
          },
        });

        await tx.pmTriggerRun.create({
          data: {
            ...baseRunData,
            status: PmTriggerRunStatus.success,
            workOrderId: workOrder.id,
          },
        });

        await tx.pmTrigger.update({
          where: { id: trigger.id },
          data: {
            lastRunAt: now,
            nextRunAt: nextRun,
          },
        });

        await tx.pmProgram.update({
          where: { id: program.id },
          data: {
            lastGeneratedAt: now,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduler error';

      await prisma.$transaction([
        prisma.pmTriggerRun.create({
          data: {
            ...baseRunData,
            status: PmTriggerRunStatus.failed,
            error: message,
          },
        }),
        prisma.pmTrigger.update({
          where: { id: trigger.id },
          data: {
            lastRunAt: now,
            nextRunAt: nextRun,
          },
        }),
      ]);

      console.error('[pmScheduler] Failed to materialize work order', {
        triggerId: trigger.id,
        programId: program.id,
        error: message,
      });
    }
  }
}

export async function initializePmScheduler(): Promise<void> {
  if (initializing || worker) {
    return;
  }

  initializing = true;

  const connection = getRedisConnection();

  if (!connection) {
    console.warn('[pmScheduler] Redis URL not configured. Scheduler disabled.');
    initializing = false;
    return;
  }

  try {
    queue = new Queue(QUEUE_NAME, { connection });
    await queue.waitUntilReady();
    await ensureTickJob();

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (job.name === TICK_JOB_NAME) {
          await runSchedulerTick();
        }
      },
      { connection },
    );

    worker.on('failed', (job, error) => {
      console.error('[pmScheduler] Job failed', { jobId: job?.id, error });
    });

    console.log(`[pmScheduler] Initialized queue using Redis ${getRedisUrl()}`);
  } catch (error) {
    console.error('[pmScheduler] Failed to initialize queue', error);
  } finally {
    initializing = false;
  }
}
