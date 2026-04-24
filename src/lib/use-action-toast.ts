"use client";

import { toast } from "sonner";
import type { ActionResult } from "./action-utils";

/**
 * Show a toast reflecting the outcome of a server action.
 * Returns the `ActionResult` untouched so callers can keep chaining:
 *
 *   const res = reportAction(await createTransaction(data), { success: "Saved" });
 *   if (res.success) router.push(...);
 */
export function reportAction<T>(
  result: ActionResult<T>,
  messages: { success?: string; error?: string } = {}
): ActionResult<T> {
  if (result.success) {
    if (messages.success) toast.success(messages.success);
  } else {
    toast.error(messages.error ?? result.error);
  }
  return result;
}

export { toast };
