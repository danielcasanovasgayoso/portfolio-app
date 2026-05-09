"use client";

import { useTranslations } from "next-intl";
import type { ErrorCode } from "./errors";

interface ActionFailureLike {
  error: string;
  code?: ErrorCode;
}

/**
 * Returns a translator that converts an action-failure result into a
 * localized message. Falls back to the action's raw `error` string when
 * no `code` is set or the code is missing from the i18n catalog.
 */
export function useActionError() {
  const t = useTranslations("errors");
  return (result: ActionFailureLike): string => {
    if (result.code && t.has(result.code)) {
      return t(result.code);
    }
    return result.error;
  };
}
