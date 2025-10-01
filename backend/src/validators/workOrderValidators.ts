import { z } from 'zod';
import { normalizeToObjectIdString } from '../lib/ids';

const OBJECT_ID_ERROR = 'Value must be a valid ObjectId string';
const ISO_8601_REGEX = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|([+-]\d{2}:\d{2})))?$/;

function validateObjectId(value: string, ctx: z.RefinementCtx) {
  try {
    normalizeToObjectIdString(value);
  } catch (error) {
    if (error instanceof TypeError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: OBJECT_ID_ERROR,
      });
      return;
    }

    throw error;
  }
}

export const objectIdSchema = z
  .string({ required_error: OBJECT_ID_ERROR, invalid_type_error: OBJECT_ID_ERROR })
  .trim()
  .min(1, { message: OBJECT_ID_ERROR })
  .superRefine(validateObjectId)
  .transform((value) => normalizeToObjectIdString(value));

const isoDateSchema = z
  .string({ invalid_type_error: 'dueDate must be an ISO 8601 date string' })
  .trim()
  .refine((value) => ISO_8601_REGEX.test(value), {
    message: 'dueDate must be an ISO 8601 date string',
  })
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }, {
    message: 'dueDate must be an ISO 8601 date string',
  });

export const statusEnum = z.enum(['requested', 'assigned', 'in_progress', 'completed', 'cancelled']);
export const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

export const createWorkOrderValidator = z
  .object({
    title: z
      .string({ required_error: 'Title is required', invalid_type_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters long')
      .max(120, 'Title must be 120 characters or fewer'),
    description: z
      .string({ invalid_type_error: 'Description must be a string' })
      .trim()
      .max(4000, 'Description must be 4000 characters or fewer')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assetId: objectIdSchema.optional(),
    assigneeId: z.union([objectIdSchema, z.null()]).optional(),
    category: z
      .string({ invalid_type_error: 'Category must be a string' })
      .trim()
      .max(120, 'Category must be 120 characters or fewer')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    dueDate: isoDateSchema.optional(),
    attachments: z
      .array(objectIdSchema, {
        invalid_type_error: 'attachments must be an array of ObjectId strings',
      })
      .optional()
      .transform((value) => (value ? Array.from(new Set(value)) : [])),
  })
  .strict()
  .transform((value) => ({
    ...value,
    attachments: value.attachments ?? [],
  }));

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderValidator>;
