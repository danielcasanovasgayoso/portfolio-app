"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionResult } from "@/types/transaction";
import type { AssetCategory } from "@prisma/client";

/**
 * Update a single asset's category
 */
export async function updateAssetCategory(
  assetId: string,
  category: AssetCategory
): Promise<ActionResult<void>> {
  try {
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
