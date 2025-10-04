export type IntegrationEvent =
  | 'work-order.created'
  | 'work-order.updated'
  | 'inventory.level_changed'
  | 'inventory.part_created';

export const INTEGRATION_EVENTS: IntegrationEvent[] = [
  'work-order.created',
  'work-order.updated',
  'inventory.level_changed',
  'inventory.part_created',
];

export interface IntegrationApiKeySummary {
  id: string;
  name: string;
  description?: string | null;
  prefix: string;
  lastFour: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface IntegrationApiKeyWithSecret extends IntegrationApiKeySummary {
  token: string;
}

export interface TenantWebhookConfig {
  id: string;
  name: string;
  url: string;
  events: IntegrationEvent[];
  active: boolean;
  secretSet: boolean;
  headers: Record<string, string>;
  retryCount: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationApiKeyPayload {
  name: string;
  description?: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: IntegrationEvent[];
  secret?: string;
  headers?: Record<string, string>;
  active?: boolean;
}

export interface UpdateWebhookPayload {
  name?: string;
  url?: string;
  events?: IntegrationEvent[];
  secret?: string | null;
  headers?: Record<string, string>;
  active?: boolean;
}
