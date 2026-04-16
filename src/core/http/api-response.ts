export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
  requestId?: string;
};

export const successResponse = <T>(
  message: string,
  data: T,
  meta?: Record<string, unknown>,
  requestId?: string,
): ApiSuccessResponse<T> => ({
  success: true as const,
  message,
  data,
  ...(meta ? { meta } : {}),
  ...(requestId ? { requestId } : {}),
});

export const errorResponse = (
  message: string,
  errorCode: string,
  details?: unknown,
  requestId?: string,
): ApiErrorResponse => ({
  success: false as const,
  message,
  errorCode,
  ...(details ? { details } : {}),
  ...(requestId ? { requestId } : {}),
});
