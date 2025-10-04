import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import {
  type CreateIntegrationApiKeyPayload,
  type IntegrationApiKeySummary,
  type IntegrationApiKeyWithSecret,
  type TenantWebhookConfig,
  type UpdateWebhookPayload,
} from '../../../shared/types/integration';
import { prisma } from '../db';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';
import { generateApiKey, hashApiKey } from '../lib/apiKeys';
import { resolveTenantId } from '../lib/tenantContext';
import { normalizeObjectId } from '../lib/normalizeObjectId';
import {
  createApiKeySchema,
  updateApiKeySchema,
  createWebhookSchema,
  updateWebhookSchema,
} from '../validators/integrationValidators';
import { emitTenantWebhookEvent } from '../lib/webhookDispatcher';
import type { IntegrationEvent } from '../../../shared/types/integration';

const router = Router();

router.use(authenticateToken);

function mapApiKey(record: Prisma.IntegrationApiKeyGetPayload<unknown>): IntegrationApiKeySummary {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    prefix: record.prefix,
    lastFour: record.lastFour,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
  } satisfies IntegrationApiKeySummary;
}

function mapWebhook(record: Prisma.TenantWebhookGetPayload<unknown>): TenantWebhookConfig {
  const headers: Record<string, string> = {};

  if (record.headers && typeof record.headers === 'object') {
    const entries = Object.entries(record.headers as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }
  }

  return {
    id: record.id,
    name: record.name,
    url: record.url,
    events: (record.events as IntegrationEvent[]) ?? [],
    active: record.active,
    secretSet: Boolean(record.secretHash),
    headers,
    retryCount: record.retryCount ?? 0,
    lastAttemptAt: record.lastAttemptAt ? record.lastAttemptAt.toISOString() : null,
    lastSuccessAt: record.lastSuccessAt ? record.lastSuccessAt.toISOString() : null,
    lastErrorMessage: record.lastErrorMessage ?? null,
    nextRetryAt: record.nextRetryAt ? record.nextRetryAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } satisfies TenantWebhookConfig;
}

async function resolveTenantFromRequest(req: AuthRequest): Promise<string> {
  return resolveTenantId(req.user?.tenantId ?? null);
}

/**
 * @openapi
 * /api/integrations/api-keys:
 *   get:
 *     summary: List integration API keys
 *     tags:
 *       - Integrations
 *     responses:
 *       '200':
 *         description: A list of API keys for the tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IntegrationApiKeySummary'
 *                 error:
 *                   nullable: true
 *                   type: object
 *       '401':
 *         description: Unauthorized
 */
router.get(
  '/api-keys',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenantFromRequest(req);

    const keys = await prisma.integrationApiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, keys.map(mapApiKey));
  }),
);

/**
 * @openapi
 * /api/integrations/api-keys:
 *   post:
 *     summary: Create a new integration API key
 *     tags:
 *       - Integrations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateIntegrationApiKeyPayload'
 *     responses:
 *       '200':
 *         description: The created API key (token returned once)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationApiKeyWithSecret'
 *                 error:
 *                   nullable: true
 *                   type: object
 *       '400':
 *         description: Invalid payload
 *       '401':
 *         description: Unauthorized
 */
router.post(
  '/api-keys',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = createApiKeySchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenantFromRequest(req);
    const payload = parseResult.data satisfies CreateIntegrationApiKeyPayload;
    const generated = generateApiKey();

    const record = await prisma.integrationApiKey.create({
      data: {
        tenantId,
        name: payload.name,
        description: payload.description,
        hash: generated.hash,
        prefix: generated.prefix,
        lastFour: generated.lastFour,
      },
    });

    const summary = mapApiKey(record);

    const response: IntegrationApiKeyWithSecret = {
      ...summary,
      token: generated.token,
    };

    return ok(res, response);
  }),
);

/**
 * @openapi
 * /api/integrations/api-keys/{id}:
 *   patch:
 *     summary: Update an existing API key's metadata
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateIntegrationApiKeyPayload'
 *     responses:
 *       '200':
 *         description: Updated API key summary
 *       '400':
 *         description: Invalid payload
 *       '404':
 *         description: API key not found
 */
router.patch(
  '/api-keys/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = updateApiKeySchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenantFromRequest(req);
    const apiKeyId = normalizeObjectId(req.params.id, 'apiKeyId');

    const existing = await prisma.integrationApiKey.findFirst({
      where: { id: apiKeyId, tenantId },
    });

    if (!existing) {
      return fail(res, 404, 'API key not found');
    }

    const updated = await prisma.integrationApiKey.update({
      where: { id: apiKeyId },
      data: {
        name: parseResult.data.name ?? existing.name,
        description:
          parseResult.data.description === undefined
            ? existing.description
            : parseResult.data.description,
      },
    });

    return ok(res, mapApiKey(updated));
  }),
);

/**
 * @openapi
 * /api/integrations/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Revoked API key summary
 *       '404':
 *         description: API key not found
 */
router.delete(
  '/api-keys/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenantFromRequest(req);
    const apiKeyId = normalizeObjectId(req.params.id, 'apiKeyId');

    const existing = await prisma.integrationApiKey.findFirst({
      where: { id: apiKeyId, tenantId },
    });

    if (!existing) {
      return fail(res, 404, 'API key not found');
    }

    const revoked = await prisma.integrationApiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    });

    return ok(res, mapApiKey(revoked));
  }),
);

/**
 * @openapi
 * /api/integrations/webhooks:
 *   get:
 *     summary: List tenant webhook configurations
 *     tags:
 *       - Integrations
 *     responses:
 *       '200':
 *         description: Webhook configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TenantWebhookConfig'
 *                 error:
 *                   nullable: true
 *                   type: object
 */
router.get(
  '/webhooks',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenantFromRequest(req);

    const webhooks = await prisma.tenantWebhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, webhooks.map(mapWebhook));
  }),
);

/**
 * @openapi
 * /api/integrations/webhooks:
 *   post:
 *     summary: Create a new webhook subscription
 *     tags:
 *       - Integrations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWebhookPayload'
 *     responses:
 *       '200':
 *         description: Created webhook configuration
 *       '400':
 *         description: Invalid payload
 */
router.post(
  '/webhooks',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = createWebhookSchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenantFromRequest(req);
    const payload = parseResult.data;

    const created = await prisma.tenantWebhook.create({
      data: {
        tenantId,
        name: payload.name,
        url: payload.url,
        events: payload.events,
        active: payload.active ?? true,
        secretHash: payload.secret ? hashApiKey(payload.secret) : null,
        headers: payload.headers ?? {},
      },
    });

    return ok(res, mapWebhook(created));
  }),
);

/**
 * @openapi
 * /api/integrations/webhooks/{id}:
 *   patch:
 *     summary: Update a webhook configuration
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWebhookPayload'
 *     responses:
 *       '200':
 *         description: Updated webhook configuration
 *       '404':
 *         description: Webhook not found
 */
router.patch(
  '/webhooks/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const parseResult = updateWebhookSchema.safeParse(req.body);

    if (!parseResult.success) {
      return fail(res, 400, 'Invalid payload', parseResult.error.flatten());
    }

    const tenantId = await resolveTenantFromRequest(req);
    const webhookId = normalizeObjectId(req.params.id, 'webhookId');

    const existing = await prisma.tenantWebhook.findFirst({
      where: { id: webhookId, tenantId },
    });

    if (!existing) {
      return fail(res, 404, 'Webhook not found');
    }

    const payload: UpdateWebhookPayload = parseResult.data;

    const updated = await prisma.tenantWebhook.update({
      where: { id: webhookId },
      data: {
        name: payload.name ?? existing.name,
        url: payload.url ?? existing.url,
        events: payload.events ?? existing.events,
        active: payload.active ?? existing.active,
        secretHash:
          payload.secret === undefined
            ? existing.secretHash
            : payload.secret === null
            ? null
            : hashApiKey(payload.secret),
        headers: payload.headers ?? ((existing.headers as Prisma.JsonObject | null | undefined) ?? {}),
      },
    });

    return ok(res, mapWebhook(updated));
  }),
);

/**
 * @openapi
 * /api/integrations/webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook configuration
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Deleted webhook configuration
 *       '404':
 *         description: Webhook not found
 */
router.delete(
  '/webhooks/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenantFromRequest(req);
    const webhookId = normalizeObjectId(req.params.id, 'webhookId');

    const existing = await prisma.tenantWebhook.findFirst({
      where: { id: webhookId, tenantId },
    });

    if (!existing) {
      return fail(res, 404, 'Webhook not found');
    }

    const deleted = await prisma.tenantWebhook.delete({
      where: { id: webhookId },
    });

    return ok(res, mapWebhook(deleted));
  }),
);

/**
 * @openapi
 * /api/integrations/webhooks/{id}/test:
 *   post:
 *     summary: Trigger a test event for a webhook
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Dispatch scheduled
 *       '404':
 *         description: Webhook not found
 */
router.post(
  '/webhooks/:id/test',
  asyncHandler(async (req: AuthRequest, res) => {
    const tenantId = await resolveTenantFromRequest(req);
    const webhookId = normalizeObjectId(req.params.id, 'webhookId');

    const webhook = await prisma.tenantWebhook.findFirst({
      where: { id: webhookId, tenantId },
    });

    if (!webhook) {
      return fail(res, 404, 'Webhook not found');
    }

    await emitTenantWebhookEvent(tenantId, 'work-order.updated', {
      message: 'Test webhook event',
      sample: {
        id: 'test-work-order',
        status: 'completed',
      },
    });

    return ok(res, { dispatched: true });
  }),
);

export default router;
