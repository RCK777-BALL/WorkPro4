import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { fail } from '../utils/response';
import { getJwtSecret } from '../config/auth';
import { prisma } from '../db';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    tenantId?: string;
    siteId?: string;
  }
}

type DecodedToken = {
  userId?: string;
  tenantId?: string;
  siteId?: string;
  [key: string]: unknown;
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    siteId?: string | null;
  };
}

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!OBJECT_ID_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export async function authOptional(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers?.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
    const userId = normalizeUserId(decoded?.userId);

    if (!userId) {
      return next();
    }

    req.userId = userId;

    if (typeof decoded.tenantId === 'string' && decoded.tenantId.trim()) {
      req.tenantId = decoded.tenantId.trim();
    }

    if (typeof decoded.siteId === 'string' && decoded.siteId.trim()) {
      req.siteId = decoded.siteId.trim();
    }

    if (!req.tenantId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });

      if (user?.tenantId) {
        req.tenantId = user.tenantId;
      }
    }
  } catch (error) {
    // Ignore token errors for optional auth and fall through without context
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[authOptional] Failed to decode token:', error);
    }
  }

  next();
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return fail(res, 401, 'Access token required');
  }

  jwt.verify(token, getJwtSecret(), async (err: any, decoded: any) => {
    if (err) {
      return fail(res, 401, 'Invalid or expired token');
    }

    const decodedToken = decoded as DecodedToken;
    const userId = normalizeUserId(decodedToken?.userId);

    if (!userId) {
      return fail(res, 401, 'Invalid or expired token');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
        },
      });

      if (!user) {
        return fail(res, 401, 'Invalid or expired token');
      }

      const userSiteId = (user as { siteId?: string | null }).siteId ?? null;
      req.user = { ...user, role: user.role ?? 'user', siteId: userSiteId };
      next();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2023' || error.code === 'P2009')
      ) {
        return fail(res, 401, 'Invalid or expired token');
      }

      return fail(res, 500, 'Authentication error');
    }
  });
}

export function requireRoles(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      return fail(res, 403, `Requires one of the following roles: ${roles.join(', ')}`);
    }

    next();
  };
}
