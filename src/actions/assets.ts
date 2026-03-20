"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-utils";
import type { AssetCategory } from "@prisma/client";
import { getUserId } from "@/lib/auth";

/**
 * Update a single asset's category
 */
export async function updateAssetCategory(
  assetId: string,
  category: AssetCategory
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

    await db.asset.update({
      where: { id: assetId },
      data: { category },
    });

    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update asset category",
    };
  }
}
