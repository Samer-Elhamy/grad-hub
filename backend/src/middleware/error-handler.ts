import type { Request, Response, NextFunction } from 'express';

/**
 * Parameters for creating an operational AppError.
 */
export interface AppErrorParams {
  message: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Operational error class for expected error scenarios.
 * Non-operational errors (programmer bugs) are treated as 500 Internal Server Error.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor({ message, statusCode = 500, details }: AppErrorParams) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler.
 * Returns consistent JSON: { success: false, error: string }
 * Never exposes internal error details to the client on 500 errors.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const message = isOperational ? err.message : 'Internal server error';

  // Log all 500 errors (unexpected) with full context
  if (statusCode >= 500) {
    console.error('Unhandled error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
