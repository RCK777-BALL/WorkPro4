import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requestLogger(req: AuthRequest, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.id || 'anonymous';
    const tenantId = req.user?.tenantId || 'none';
    
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms userId:${userId} tenantId:${tenantId}`
    );
  });

  next();
}