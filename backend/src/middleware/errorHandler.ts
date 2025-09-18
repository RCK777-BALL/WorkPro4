import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { fail } from '../utils/response';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);

  if (error instanceof ZodError) {
    return fail(res, 400, 'Validation error', error.errors);
  }

  if (error.code === 'P2002') {
    return fail(res, 409, 'Unique constraint violation');
  }

  if (error.code === 'P2025') {
    return fail(res, 404, 'Record not found');
  }

  return fail(res, 500, 'Internal server error');
}