"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { scopedDb } from "@/lib/scoped-db";
import type { ActionResult } from "@/lib/action-utils";
import type { AssetClass } from "@prisma/client";
import { getUserId } from "@/lib/auth";
import { refreshAssetPrice } from "@/services/price.service";

/**
 * Update a single asset's class (e.g. reclassify a STOCK as an ETF)
 */
export async function updateAssetCategory(
  assetId: string,
  category: AssetClass
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();

    // Verify asset belongs to user; update-by-id then runs on the raw client.
    const asset = await scopedDb(userId).asset.findFirst({
      where: { id: assetId },
    });
    if (!asset) {
      return { success: false, error: "Asset not found", code: "ASSET_NOT_FOUND" };
    }

    await db.asset.update({
      where: { id: assetId },
      data: { category },
    });

    revalidatePath("/investments");
    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update asset category",
    };
  }
}

/**
 * Refresh the latest price for a single externally-priced asset.
 */
export async function refreshSingleAssetPrice(
  assetId: string
): Promise<ActionResult<{ price?: number }>> {
  try {
    const userId = await getUserId();

    const asset = await scopedDb(userId).asset.findFirst({
      where: { id: assetId },
      select: { id: true, ticker: true, manualPricing: true },
    });

    if (!asset) {
      return { success: false, error: "Asset not found", code: "ASSET_NOT_FOUND" };
    }

    if (asset.manualPricing || !asset.ticker) {
      return { success: false, error: "Asset has no external pricing", code: "ASSET_NO_EXTERNAL_PRICING" };
    }

    const result = await refreshAssetPrice(userId, assetId, asset.ticker);

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to refresh price", code: "PRICE_SERVICE_ERROR" };
    }

    revalidatePath(`/investments/assets/${assetId}`);
    revalidatePath("/investments");
    revalidatePath("/");

    return { success: true, data: { price: result.price } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh asset price",
    };
  }
}
