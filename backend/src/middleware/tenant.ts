import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function tenantScope(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Add tenant filter to all queries
  req.tenantId = req.user.tenantId;
  next();
}

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}