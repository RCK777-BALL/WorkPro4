import { z } from 'zod';
import { INTEGRATION_EVENTS } from '../../../shared/types/integration';

const eventEnum = z.enum(INTEGRATION_EVENTS as [string, ...string[]]);

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(255).optional(),
});

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  events: z.array(eventEnum).min(1),
  secret: z.string().min(8).max(128).optional(),
  headers: z
    .record(z.string(), z.string().min(1).max(200))
    .optional()
    .default({}),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
  events: z.array(eventEnum).min(1).optional(),
  secret: z.string().min(8).max(128).nullable().optional(),
  headers: z.record(z.string(), z.string().min(1).max(200)).optional(),
  active: z.boolean().optional(),
});
