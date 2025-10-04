import crypto from 'crypto';
import { prisma } from '../db';
import type { IntegrationEvent } from '../../../shared/types/integration';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 5_000, 15_000];

interface DispatchPayload {
  event: IntegrationEvent;
  tenantId: string;
  data: Record<string, unknown>;
}

interface TenantWebhookRecord {
  id: string;
  tenantId: string;
  url: string;
  name: string;
  events: string[];
  active: boolean;
  secretHash: string | null;
  headers: Record<string, string> | null;
}

async function sendWebhook(
  webhook: TenantWebhookRecord,
  payload: DispatchPayload,
  attempt: number,
): Promise<void> {
  const body = JSON.stringify({
    id: crypto.randomUUID(),
    event: payload.event,
    tenantId: payload.tenantId,
    data: payload.data,
    timestamp: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'WorkPro4 Webhook Dispatcher',
    'X-Webhook-Event': payload.event,
  };

  if (webhook.headers) {
    for (const [key, value] of Object.entries(webhook.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }
  }

  if (webhook.secretHash) {
    const signature = crypto.createHmac('sha256', webhook.secretHash).update(body).digest('hex');
    headers['X-Webhook-Signature'] = signature;
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }

    await prisma.tenantWebhook.update({
      where: { id: webhook.id },
      data: {
        retryCount: 0,
        lastAttemptAt: new Date(),
        lastSuccessAt: new Date(),
        lastErrorMessage: null,
        nextRetryAt: null,
      },
    });
  } catch (error) {
    const nextAttempt = attempt + 1;
    const delay = RETRY_DELAYS_MS[Math.min(nextAttempt - 1, RETRY_DELAYS_MS.length - 1)];

    await prisma.tenantWebhook.update({
      where: { id: webhook.id },
      data: {
        retryCount: nextAttempt,
        lastAttemptAt: new Date(),
        lastErrorMessage: error instanceof Error ? error.message : 'Unknown webhook error',
        nextRetryAt: nextAttempt < MAX_RETRY_ATTEMPTS ? new Date(Date.now() + delay) : null,
      },
    });

    if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    setTimeout(() => {
      void sendWebhook(webhook, payload, nextAttempt).catch((err) => {
        console.error('[webhookDispatcher] Final attempt failed', err);
      });
    }, delay);
  }
}

export async function emitTenantWebhookEvent(
  tenantId: string,
  event: IntegrationEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.tenantWebhook.findMany({
    where: {
      tenantId,
      active: true,
      events: { has: event },
    },
    select: {
      id: true,
      tenantId: true,
      url: true,
      name: true,
      events: true,
      active: true,
      secretHash: true,
      headers: true,
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  const payload: DispatchPayload = { tenantId, event, data };

  for (const webhook of webhooks) {
    void sendWebhook(webhook as TenantWebhookRecord, payload, 0).catch((error) => {
      console.error('[webhookDispatcher] Failed to dispatch webhook', webhook.id, error);
    });
  }
}
