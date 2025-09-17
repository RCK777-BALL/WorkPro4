import { Response } from 'express';
import { ApiResult } from '../../../shared/types/http';

export function ok<T>(res: Response, data: T): Response<ApiResult<T>> {
  return res.json({
    data,
    error: null,
  });
}

export function fail(
  res: Response,
  code: number,
  message: string,
  details?: unknown
): Response<ApiResult<null>> {
  return res.status(code).json({
    data: null,
    error: {
      code,
      message,
      details,
    },
  });
}

export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}