"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/client";
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

    const asset = await db.asset.findFirst({
      where: { id: assetId, userId, manualPricing: true },
    });
    if (!asset) {
      return { success: false, error: "Manual asset not found" };
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
      await db.holding.updateMany({
        where: { assetId, userId },
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

    const asset = await db.asset.findFirst({
      where: { id: assetId, userId, manualPricing: true },
    });
    if (!asset) {
      return { success: false, error: "Manual asset not found" };
    }

    // Cascade delete will remove the holding too
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
