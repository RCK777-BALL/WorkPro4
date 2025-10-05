import type { ApiError, ApiResponse } from '../../shared/types/http';

export class ApiRequestError extends Error {
  readonly code: number;
  readonly offline: boolean;
  readonly details?: unknown;
  readonly data: null;
  readonly error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.offline = Boolean(error.offline);
    this.details = error.details;
    this.data = null;
    this.error = error;
  }
}

export function normalizeApiError(
  error: Partial<ApiError> | null | undefined,
  fallbackStatus: number,
  fallbackMessage = 'Request failed',
): ApiError {
  const message = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : fallbackMessage;
  const code = typeof error?.code === 'number' && Number.isFinite(error.code) ? error.code : fallbackStatus;

  const normalized: ApiError = {
    code,
    message,
    details: error?.details,
  };

  if (typeof error?.offline === 'boolean') {
    normalized.offline = error.offline;
  }

  return normalized;
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return Boolean(value) && typeof value === 'object' && 'data' in value && 'error' in value;
}

export function isApiErrorResponse(value: unknown): value is ApiResponse<ApiError> {
  return isApiResponse(value) && value.error != null;
}

export function toApiRequestError(
  error: Partial<ApiError> | null | undefined,
  fallbackStatus: number,
  fallbackMessage?: string,
  options?: { offline?: boolean; details?: unknown },
): ApiRequestError {
  const normalized = normalizeApiError(
    { ...error, details: options?.details ?? error?.details },
    fallbackStatus,
    fallbackMessage,
  );

  if (options?.offline) {
    normalized.offline = true;
  }

  return new ApiRequestError(normalized);
}

export function toApiErrorResponse(error: ApiError): ApiResponse<never> {
  return { data: null, error } satisfies ApiResponse<never>;
}
