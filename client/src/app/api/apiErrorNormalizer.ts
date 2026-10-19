export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  error?: any;
  code?: string;
  details?: unknown;
}

export interface NormalizedError {
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Normalizes an API error from Axios into a clean, predictable NormalizedError object.
 *
 * Precedence for message extraction:
 * 1. Non-empty responseData.message (string)
 * 2. Non-empty responseData.error when error is a string
 * 3. Non-empty responseData.error.message when error is an object
 * 4. Non-empty error.message (Axios error message)
 * 5. Safe fallback: 'An unexpected error occurred'
 */
export function normalizeApiError(
  error: {
    message?: string;
    response?: {
      status?: number;
      data?: any;
    };
  }
): NormalizedError {
  const status = error.response?.status;
  const responseData = error.response?.data;

  let message: string;

  if (typeof responseData?.message === 'string' && responseData.message.trim().length > 0) {
    message = responseData.message.trim();
  } else if (typeof responseData?.error === 'string' && responseData.error.trim().length > 0) {
    message = responseData.error.trim();
  } else if (
    typeof responseData?.error === 'object' &&
    responseData?.error !== null &&
    typeof responseData.error.message === 'string' &&
    responseData.error.message.trim().length > 0
  ) {
    message = responseData.error.message.trim();
  } else if (typeof error.message === 'string' && error.message.trim().length > 0) {
    message = error.message.trim();
  } else {
    message = 'An unexpected error occurred';
  }

  let code = 'NETWORK_ERROR';
  if (
    typeof responseData?.error === 'object' &&
    responseData?.error !== null &&
    typeof responseData.error.code === 'string' &&
    responseData.error.code.trim().length > 0
  ) {
    code = responseData.error.code.trim();
  } else if (typeof responseData?.code === 'string' && responseData.code.trim().length > 0) {
    code = responseData.code.trim();
  } else if (status) {
    code = `HTTP_${status}`;
  }

  const details =
    (typeof responseData?.error === 'object' && responseData?.error !== null
      ? responseData.error.details
      : undefined) ?? responseData?.details;

  return {
    message,
    code,
    statusCode: status,
    details,
  };
}
