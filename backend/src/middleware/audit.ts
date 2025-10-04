import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';
import { prisma } from '../db';

export const AUDIT_RETENTION_DAYS = 180;
const RETENTION_MS = AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'secret',
  'token',
  'ssn',
  'email',
  'phone',
  'address',
  'birth',
  'name',
];

const MAX_STRING_LENGTH = 512;
const MAX_ARRAY_LENGTH = 25;

function shouldRedact(keyPath: string[], value: unknown): boolean {
  if (typeof value === 'string') {
    if (value.includes('@') && keyPath.some((part) => part.includes('email'))) {
      return true;
    }

    if (/^\d{3}-?\d{2}-?\d{4}$/u.test(value)) {
      return true; // Looks like an SSN
    }
  }

  return keyPath.some((part) =>
    SENSITIVE_KEY_PATTERNS.some((pattern) => part.includes(pattern)),
  );
}

function sanitizeMetadata(value: unknown, keyPath: string[] = []): unknown {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (typeof value === 'string') {
    if (shouldRedact(keyPath, value)) {
      return '[REDACTED]';
    }

    if (value.length > MAX_STRING_LENGTH) {
      return `${value.slice(0, MAX_STRING_LENGTH)}…`;
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_ARRAY_LENGTH);
    return limited.map((item, index) => sanitizeMetadata(item, [...keyPath, `${index}`]));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (typeof nestedValue === 'undefined') {
        continue;
      }

      const normalizedKey = key.toLowerCase();

      if (SENSITIVE_KEY_PATTERNS.some((pattern) => normalizedKey.includes(pattern))) {
        result[key] = '[REDACTED]';
        continue;
      }

      const sanitized = sanitizeMetadata(nestedValue, [...keyPath, normalizedKey]);

      if (typeof sanitized !== 'undefined') {
        result[key] = sanitized;
      }
    }

    return result;
  }

  return undefined;
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }

  const sanitized = sanitizeMetadata(metadata);

  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }

  return undefined;
}

async function writeAuditEvent(
  req: AuthRequest,
  res: Response,
  action: string,
  resource: string,
  occurredAt: Date,
): Promise<void> {
  const tenantId = req.user?.tenantId ?? req.tenantId;

  if (!tenantId) {
    return;
  }

  if (res.statusCode >= 400) {
    return;
  }

  const metadata = normalizeMetadata(res.locals?.auditMetadata);

  const context: Record<string, unknown> = {
    method: req.method,
    path: req.originalUrl ?? req.url,
    statusCode: res.statusCode,
  };

  const requestId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined;

  if (requestId) {
    context.requestId = requestId;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    context.metadata = metadata;
  }

  try {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        userId: req.user?.id ?? null,
        userRole: req.user?.role ?? null,
        action,
        resource,
        context,
        occurredAt,
      },
    });

    if (RETENTION_MS > 0) {
      const cutoff = new Date(occurredAt.getTime() - RETENTION_MS);
      await prisma.auditEvent.deleteMany({
        where: {
          tenantId,
          occurredAt: { lt: cutoff },
        },
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[audit] failed to record event', error);
    }
  }
}

export function auditLog(action: string, resource: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const occurredAt = new Date();

    res.on('finish', () => {
      void writeAuditEvent(req, res, action, resource, occurredAt);
    });

    next();
  };
}

declare global {
  namespace Express {
    interface Locals {
      auditMetadata?: Record<string, unknown>;
    }
  }
}
