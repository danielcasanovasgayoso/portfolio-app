"use server";

import { revalidatePath } from "next/cache";
import {
  recalculateHolding,
  recalculateAllHoldings,
} from "@/services/holdings.service";
import type { ActionResult } from "@/lib/action-utils";
import { getUserId } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Recalculates holdings for a specific asset
 */
export async function recalculateAssetHolding(
  assetId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();

    // Verify asset belongs to user
    const asset = await db.asset.findFirst({
      where: { id: assetId, userId },
    });
    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    await recalculateHolding(userId, assetId);
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
 * Recalculates all holdings for the current user
 */
export async function recalculateAllAssetHoldings(): Promise<
  ActionResult<{ recalculated: number; errors: string[] }>
> {
  try {
    const userId = await getUserId();
    const result = await recalculateAllHoldings(userId);
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
