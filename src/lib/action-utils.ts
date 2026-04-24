/**
 * Utilities for server actions
 * Provides consistent error handling and response formatting
 */

import { ZodError } from "zod";
import { isAppError, getErrorMessage, type ErrorCode } from "./errors";

/**
 * Standard action result type
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ErrorCode };

/**
 * Wrap an async function with standardized error handling
 * Reduces boilerplate try/catch in server actions
 */
export function withAction<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
  fallbackMessage = "An error occurred"
): (...args: A) => Promise<ActionResult<T>> {
  return async (...args: A): Promise<ActionResult<T>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const message = firstIssue
          ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
          : "Validation failed";
        return { success: false, error: message, code: "VALIDATION_ERROR" };
      }

      if (isAppError(error)) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      const message = getErrorMessage(error);
      console.error(`Action error: ${message}`, error);

      return {
        success: false,
        error: message || fallbackMessage,
      };
    }
  };
}
