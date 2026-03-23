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
 * Configuration errors (missing API keys, invalid settings)
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    super(message, "CONFIGURATION_ERROR", 500, { configKey });
    this.name = "ConfigurationError";
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
