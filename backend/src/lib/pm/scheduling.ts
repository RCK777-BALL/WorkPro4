import cronParser from 'cron-parser';
import { PmTriggerType } from '@prisma/client';

type CalculateNextRunOptions = {
  type: PmTriggerType;
  cronExpression?: string | null;
  timezone?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  from?: Date;
};

export function calculateNextRun({
  type,
  cronExpression,
  timezone,
  startDate,
  endDate,
  from,
}: CalculateNextRunOptions): Date | null {
  if (type !== 'calendar') {
    return null;
  }

  if (!cronExpression) {
    return null;
  }

  const current = from ?? new Date();
  const boundaryStart = startDate ?? undefined;
  const boundaryEnd = endDate ?? undefined;

  try {
    const iterator = cronParser.parseExpression(cronExpression, {
      tz: timezone ?? 'UTC',
      currentDate: current,
      startDate: boundaryStart,
      endDate: boundaryEnd,
    });

    const next = iterator.next().toDate();

    if (boundaryEnd && next > boundaryEnd) {
      return null;
    }

    if (boundaryStart && next < boundaryStart) {
      // Advance until we reach a slot within bounds
      let candidate = next;
      while (candidate < boundaryStart) {
        candidate = iterator.next().toDate();
        if (boundaryEnd && candidate > boundaryEnd) {
          return null;
        }
      }
      return candidate;
    }

    return next;
  } catch (error) {
    console.error('[pmScheduler] Failed to calculate next run:', error);
    return null;
  }
}
