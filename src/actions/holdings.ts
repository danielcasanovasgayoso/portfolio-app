"use server";

import { revalidatePath } from "next/cache";
import {
  recalculateHolding,
  recalculateAllHoldings,
} from "@/services/holdings.service";
import type { ActionResult } from "@/lib/action-utils";

/**
 * Recalculates holdings for a specific asset
 */
export async function recalculateAssetHolding(
  assetId: string
): Promise<ActionResult<void>> {
  try {
    await recalculateHolding(assetId);
    revalidatePath("/");
    revalidatePath(`/portfolio/${assetId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to recalculate holding",
    };
  }
}

/**
 * Recalculates all holdings
 */
export async function recalculateAllAssetHoldings(): Promise<
  ActionResult<{ recalculated: number; errors: string[] }>
> {
  try {
    const result = await recalculateAllHoldings();
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to recalculate holdings",
    };
  }
}
