import cronParser from 'cron-parser';
import { z } from 'zod';
import { objectIdSchema } from './workOrderValidators';

const ISO_DATE_ERROR = 'Value must be an ISO 8601 date string';
const isoDateSchema = z
  .string({ invalid_type_error: ISO_DATE_ERROR })
  .trim()
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }, ISO_DATE_ERROR);

export const triggerTypeEnum = z.enum(['calendar', 'meter']);

function validateCronExpression(value: unknown, ctx: z.RefinementCtx, timezone?: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'cronExpression must be a non-empty string',
    });
    return;
  }

  try {
    cronParser.parseExpression(value.trim(), {
      tz: timezone || 'UTC',
    });
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid cron expression',
    });
  }
}

export const createProgramValidator = z
  .object({
    name: z
      .string({ required_error: 'Program name is required' })
      .trim()
      .min(3, 'Program name must be at least 3 characters')
      .max(160, 'Program name must be 160 characters or fewer'),
    description: z
      .string({ invalid_type_error: 'Description must be a string' })
      .trim()
      .max(4000, 'Description must be 4000 characters or fewer')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    assetId: z
      .union([objectIdSchema, z.null()])
      .optional()
      .transform((value) => (value === null ? null : value)),
    timezone: z
      .string({ invalid_type_error: 'Timezone must be a string' })
      .trim()
      .min(1, 'Timezone must be provided')
      .max(80, 'Timezone must be 80 characters or fewer')
      .optional()
      .default('UTC'),
    isActive: z.boolean().optional().default(true),
    ownerId: z.union([objectIdSchema, z.null()]).optional().transform((value) => (value === null ? null : value)),
  })
  .strict();

export const updateProgramValidator = createProgramValidator.partial().strict();

export const createTaskValidator = z
  .object({
    title: z
      .string({ required_error: 'Task title is required' })
      .trim()
      .min(3, 'Task title must be at least 3 characters')
      .max(200, 'Task title must be 200 characters or fewer'),
    instructions: z
      .string({ invalid_type_error: 'Instructions must be a string' })
      .trim()
      .max(4000, 'Instructions must be 4000 characters or fewer')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    position: z
      .number({ invalid_type_error: 'position must be a number' })
      .int('position must be an integer')
      .min(0, 'position must be zero or greater')
      .optional(),
    estimatedMinutes: z
      .number({ invalid_type_error: 'estimatedMinutes must be a number' })
      .int('estimatedMinutes must be an integer')
      .min(0, 'estimatedMinutes must be 0 or greater')
      .max(24 * 60, 'estimatedMinutes must be less than 24 hours')
      .optional(),
    requiresSignOff: z.boolean().optional().default(false),
  })
  .strict();

export const updateTaskValidator = createTaskValidator.partial().strict();

const createTriggerBaseSchema = z
  .object({
    type: triggerTypeEnum,
    cronExpression: z.string().optional(),
    intervalDays: z
      .number({ invalid_type_error: 'intervalDays must be a number' })
      .int('intervalDays must be an integer')
      .min(1, 'intervalDays must be at least one day')
      .optional(),
    meterThreshold: z
      .number({ invalid_type_error: 'meterThreshold must be a number' })
      .positive('meterThreshold must be greater than zero')
      .optional(),
    settings: z.record(z.unknown()).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateTriggerBaseSchema = createTriggerBaseSchema.partial();

function validateTriggerRules(
  value: {
    type?: z.infer<typeof triggerTypeEnum>;
    cronExpression?: string;
    meterThreshold?: number | null;
    startDate?: string;
    endDate?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.type === 'calendar') {
    if (!value.cronExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cronExpression is required for calendar triggers',
        path: ['cronExpression'],
      });
    } else {
      validateCronExpression(value.cronExpression, ctx);
    }
  }

  if (value.type === 'meter' && value.meterThreshold == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'meterThreshold is required for meter triggers',
      path: ['meterThreshold'],
    });
  }

  if (value.startDate && value.endDate) {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be after startDate',
        path: ['endDate'],
      });
    }
  }
}

export const createTriggerValidator = createTriggerBaseSchema.superRefine(validateTriggerRules);

export const updateTriggerValidator = updateTriggerBaseSchema.superRefine(validateTriggerRules);

export const programIdParamSchema = objectIdSchema;
export const triggerIdParamSchema = objectIdSchema;
export const taskIdParamSchema = objectIdSchema;

export type CreateProgramInput = z.infer<typeof createProgramValidator>;
export type UpdateProgramInput = z.infer<typeof updateProgramValidator>;
export type CreateTriggerInput = z.infer<typeof createTriggerValidator>;
export type UpdateTriggerInput = z.infer<typeof updateTriggerValidator>;
export type CreateTaskInput = z.infer<typeof createTaskValidator>;
export type UpdateTaskInput = z.infer<typeof updateTaskValidator>;
