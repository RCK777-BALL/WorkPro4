import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';

export function tenantScope(_req: AuthRequest, _res: Response, next: NextFunction) {
  next();
}
