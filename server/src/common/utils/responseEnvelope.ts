import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message: string = 'Success',
  meta?: Record<string, unknown>
): Response => {
  const responseBody: ApiResponse<T> = {
    success: true,
    data,
    message,
    ...(meta ? { meta } : {}),
  };

  return res.status(statusCode).json(responseBody);
};
