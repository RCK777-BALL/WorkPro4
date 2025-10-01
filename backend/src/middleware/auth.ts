import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { fail } from '../utils/response';
import { getJwtSecret } from '../config/auth';
import { prisma } from '../db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
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

      req.user = { ...user, role: user.role ?? 'user' };
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
