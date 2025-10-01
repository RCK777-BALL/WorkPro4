import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

    if (!decoded?.userId || typeof decoded.userId !== 'string') {
      return next();
    }

    req.userId = decoded.userId;

    if (typeof decoded.tenantId === 'string' && decoded.tenantId.trim()) {
      req.tenantId = decoded.tenantId.trim();
    }

    if (typeof decoded.siteId === 'string' && decoded.siteId.trim()) {
      req.siteId = decoded.siteId.trim();
    }

    if (!req.tenantId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
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
      return fail(res, 403, 'Invalid or expired token');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
        },
      });

      if (!user) {
        return fail(res, 403, 'User not found');
      }

      const userSiteId = (user as { siteId?: string | null }).siteId ?? null;
      req.user = { ...user, role: user.role ?? 'user', siteId: userSiteId };
      next();
    } catch (error) {
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
