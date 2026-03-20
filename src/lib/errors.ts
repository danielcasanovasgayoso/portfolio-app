/**
 * Custom error classes for better error handling and debugging
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PRICE_SERVICE_ERROR"
  | "IMPORT_ERROR"
  | "GMAIL_ERROR"
  | "DATABASE_ERROR"
  | "EXTERNAL_API_ERROR"
  | "CONFIGURATION_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly timestamp: Date;

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      meta: this.meta,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Validation errors (invalid input data)
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR", 400, { field });
    this.name = "ValidationError";
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? `: ${id}` : ""}`, "NOT_FOUND", 404, {
      resource,
      id,
    });
    this.name = "NotFoundError";
  }
}

/**
 * Price service errors (EODHD API issues)
 */
export class PriceServiceError extends AppError {
  constructor(message: string, ticker?: string, originalError?: Error) {
    super(message, "PRICE_SERVICE_ERROR", 500, {
      ticker,
      originalError: originalError?.message,
    });
    this.name = "PriceServiceError";
  }
}

/**
 * Gmail import errors
 */
export class GmailError extends AppError {
  constructor(message: string, meta?: { emailId?: string; query?: string }) {
    super(message, "GMAIL_ERROR", 500, meta);
    this.name = "GmailError";
  }
}

/**
 * Import/parsing errors
 */
export class ImportError extends AppError {
  constructor(
    message: string,
    meta?: { emailId?: string; subject?: string; batchId?: string }
  ) {
    super(message, "IMPORT_ERROR", 400, meta);
    this.name = "ImportError";
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, originalError?: Error) {
    super(message, "DATABASE_ERROR", 500, {
      operation,
      originalError: originalError?.message,
    });
    this.name = "DatabaseError";
  }
}

/**
 * Configuration errors (missing API keys, invalid settings)
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    super(message, "CONFIGURATION_ERROR", 500, { configKey });
    this.name = "ConfigurationError";
  }
}

/**
 * External API errors (non-EODHD)
 */
export class ExternalApiError extends AppError {
  constructor(
    message: string,
    service: string,
    statusCode?: number,
    originalError?: Error
  ) {
    super(message, "EXTERNAL_API_ERROR", statusCode || 502, {
      service,
      originalError: originalError?.message,
    });
    this.name = "ExternalApiError";
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Wrap unknown errors into AppError
 */
export function wrapError(error: unknown, fallbackMessage?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = getErrorMessage(error) || fallbackMessage || "Unknown error";
  return new AppError(message, "UNKNOWN_ERROR", 500, {
    originalError: error instanceof Error ? error.message : String(error),
  });
}
