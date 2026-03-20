/**
 * Utilities for server actions
 * Provides consistent error handling and response formatting
 */

import { ZodError } from "zod";
import {
  AppError,
  isAppError,
  getErrorMessage,
  type ErrorCode,
} from "./errors";

/**
 * Standard action result type
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ErrorCode };

/**
 * Wrap an async function with standardized error handling
 * Reduces boilerplate try/catch in server actions
 *
 * @example
 * // Before
 * export async function createTransaction(data) {
 *   try {
 *     const validated = TransactionCreateSchema.parse(data);
 *     const result = await db.transaction.create({ ... });
 *     return { success: true, data: result };
 *   } catch (error) {
 *     if (error instanceof Error) {
 *       return { success: false, error: error.message };
 *     }
 *     return { success: false, error: 'Failed to create transaction' };
 *   }
 * }
 *
 * // After
 * export const createTransaction = withAction(
 *   async (data) => {
 *     const validated = TransactionCreateSchema.parse(data);
 *     return db.transaction.create({ ... });
 *   },
 *   'Failed to create transaction'
 * );
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
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const message = firstIssue
          ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
          : "Validation failed";
        return { success: false, error: message, code: "VALIDATION_ERROR" };
      }

      // Handle custom app errors
      if (isAppError(error)) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      // Handle generic errors
      const message = getErrorMessage(error);
      console.error(`Action error: ${message}`, error);

      return {
        success: false,
        error: message || fallbackMessage,
      };
    }
  };
}

/**
 * Create a validated action that parses input with a Zod schema
 *
 * @example
 * const createTransaction = withValidatedAction(
 *   TransactionCreateSchema,
 *   async (validated) => {
 *     return db.transaction.create({ data: validated });
 *   }
 * );
 */
export function withValidatedAction<TInput, TOutput, TSchema>(
  schema: { parse: (input: TInput) => TSchema },
  fn: (validated: TSchema) => Promise<TOutput>,
  fallbackMessage = "An error occurred"
): (input: TInput) => Promise<ActionResult<TOutput>> {
  return withAction(async (input: TInput) => {
    const validated = schema.parse(input);
    return fn(validated);
  }, fallbackMessage);
}

/**
 * Combine multiple action results into one
 * Useful for batch operations
 */
export function combineActionResults<T>(
  results: ActionResult<T>[]
): ActionResult<T[]> {
  const errors: string[] = [];
  const data: T[] = [];

  for (const result of results) {
    if (result.success) {
      data.push(result.data);
    } else {
      errors.push(result.error);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join("; "),
    };
  }

  return { success: true, data };
}

/**
 * Execute an action and throw if it fails
 * Useful when you need to chain actions
 */
export async function unwrapAction<T>(
  actionResult: Promise<ActionResult<T>>
): Promise<T> {
  const result = await actionResult;
  if (!result.success) {
    throw new AppError(result.error, result.code || "UNKNOWN_ERROR");
  }
  return result.data;
}
