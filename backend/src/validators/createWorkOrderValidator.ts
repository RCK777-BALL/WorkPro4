import { z } from 'zod';
import { normalizeToObjectIdString } from '../lib/ids';

function optionalObjectId(field: string) {
  return z
    .string({ invalid_type_error: `${field} must be a string` })
    .trim()
    .refine((value) => value.length > 0, { message: `${field} is required` })
    .transform((value, ctx) => {
      try {
        return normalizeToObjectIdString(value);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid ${field}`,
        });
        return z.NEVER;
      }
    });
}

const attachmentSchema = z.object({
  id: optionalObjectId('attachment id'),
  url: z.string({ invalid_type_error: 'Attachment URL must be a string' }).trim().url('Attachment URL must be valid'),
  filename: z
    .string({ invalid_type_error: 'Attachment filename must be a string' })
    .trim()
    .min(1, 'Attachment filename is required'),
  contentType: z
    .string({ invalid_type_error: 'Attachment contentType must be a string' })
    .trim()
    .min(1, 'Attachment contentType is required'),
  size: z
    .number({ invalid_type_error: 'Attachment size must be a number' })
    .int('Attachment size must be an integer')
    .nonnegative('Attachment size cannot be negative')
    .optional(),
});

export const createWorkOrderValidator = z
  .object({
    title: z
      .string({ invalid_type_error: 'Title must be a string' })
      .trim()
      .min(1, 'Title is required'),
    description: z
      .string({ invalid_type_error: 'Description must be a string' })
      .trim()
      .max(10_000, 'Description is too long')
      .optional(),
    assetId: z
      .string({ invalid_type_error: 'Asset ID must be a string' })
      .trim()
      .min(1, 'Asset ID is required')
      .transform((value, ctx) => {
        try {
          return normalizeToObjectIdString(value);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid assetId',
          });
          return z.NEVER;
        }
      })
      .optional(),
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'], { invalid_type_error: 'Priority must be low, medium, high, or urgent' })
      .optional()
      .default('medium'),
    dueDate: z
      .string({ invalid_type_error: 'dueDate must be a string' })
      .trim()
      .datetime({ message: 'dueDate must be an ISO 8601 date string' })
      .optional(),
    assigneeId: z
      .string({ invalid_type_error: 'assigneeId must be a string' })
      .trim()
      .min(1, 'assigneeId is required')
      .transform((value, ctx) => {
        try {
          return normalizeToObjectIdString(value);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid assigneeId',
          });
          return z.NEVER;
        }
      })
      .optional(),
    category: z
      .string({ invalid_type_error: 'category must be a string' })
      .trim()
      .min(1, 'category is required')
      .optional(),
    attachments: z.array(attachmentSchema).optional().default([]),
  })
  .strict();

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderValidator>;
