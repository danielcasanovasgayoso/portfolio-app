"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/client";
import { db } from "@/lib/db";
import { scopedDb } from "@/lib/scoped-db";
import type { ActionResult } from "@/lib/action-utils";
import type { AssetCategory } from "@prisma/client";
import { getUserId } from "@/lib/auth";
import { refreshAssetPrice } from "@/services/price.service";

/**
 * Update a single asset's category
 */
export async function updateAssetCategory(
  assetId: string,
  category: AssetCategory
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
 * Create a manual asset with a holding (no transactions needed)
 */
export async function createManualAsset(data: {
  name: string;
  category: AssetCategory;
  value: number;
}): Promise<ActionResult<{ assetId: string }>> {
  try {
    const userId = await getUserId();
    const isin = `MANUAL-${crypto.randomUUID()}`;
    const value = new Decimal(data.value);

    // Nested create (asset + holding): scopedDb only injects userId at the top
    // level, so both levels set userId explicitly on the raw client.
    const asset = await db.asset.create({
      data: {
        userId,
        isin,
        ticker: null,
        name: data.name,
        category: data.category,
        manualPricing: true,
        holding: {
          create: {
            userId,
            shares: new Decimal(1),
            costBasis: value,
            avgPrice: value,
            marketValue: value,
            unrealizedGain: new Decimal(0),
          },
        },
      },
    });

    revalidatePath("/");

    return { success: true, data: { assetId: asset.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create manual asset",
    };
  }
}

/**
 * Update a manual asset's name, category, and/or value
 */
export async function updateManualAsset(
  assetId: string,
  data: { name?: string; category?: AssetCategory; value?: number }
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();

    const asset = await scopedDb(userId).asset.findFirst({
      where: { id: assetId, manualPricing: true },
    });
    if (!asset) {
      return { success: false, error: "Manual asset not found", code: "MANUAL_ASSET_NOT_FOUND" };
    }

    // Update asset fields
    const assetUpdate: { name?: string; category?: AssetCategory } = {};
    if (data.name !== undefined) assetUpdate.name = data.name;
    if (data.category !== undefined) assetUpdate.category = data.category;

    if (Object.keys(assetUpdate).length > 0) {
      await db.asset.update({
        where: { id: assetId },
        data: assetUpdate,
      });
    }

    // Update holding value
    if (data.value !== undefined) {
      const value = new Decimal(data.value);
      await scopedDb(userId).holding.updateMany({
        where: { assetId },
        data: {
          costBasis: value,
          avgPrice: value,
          marketValue: value,
          unrealizedGain: new Decimal(0),
        },
      });
    }

    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update manual asset",
    };
  }
}

/**
 * Delete a manual asset and its holding
 */
export async function deleteManualAsset(
  assetId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();

    const asset = await scopedDb(userId).asset.findFirst({
      where: { id: assetId, manualPricing: true },
    });
    if (!asset) {
      return { success: false, error: "Manual asset not found", code: "MANUAL_ASSET_NOT_FOUND" };
    }

    // Cascade delete will remove the holding too; delete-by-id on the raw client.
    await db.asset.delete({ where: { id: assetId } });

    revalidatePath("/");

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete manual asset",
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

    revalidatePath(`/portfolio/${assetId}`);
    revalidatePath("/");

    return { success: true, data: { price: result.price } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh asset price",
    };
  }
}
