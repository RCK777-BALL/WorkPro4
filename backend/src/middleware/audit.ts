import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export async function auditLog(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  beforeData?: any,
  afterData?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        beforeJson: beforeData || null,
        afterJson: afterData || null,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}