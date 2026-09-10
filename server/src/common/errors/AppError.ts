export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown, errorCode = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Unauthorized access', errorCode = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = 'Forbidden resource', errorCode = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message: string, errorCode = 'CONFLICT'): AppError {
    return new AppError(message, 409, errorCode);
  }

  static internal(message = 'Internal server error', details?: unknown): AppError {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
  }
}
