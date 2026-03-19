"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionResult } from "@/types/transaction";
import type { AssetCategory } from "@prisma/client";

/**
 * Determines the asset category based on the name
 */
function determineAssetCategory(name: string): AssetCategory {
  const nameLower = name.toLowerCase();

  // Pension plans (PP)
  if (
    nameLower.includes("p.p.") ||
    nameLower.includes("plan de pensiones") ||
    nameLower.includes("pension")
  ) {
    return "PP";
  }

  // Stocks/ETFs/ETCs
  if (
    nameLower.includes(" etf") ||
    nameLower.includes(" etc") ||
    nameLower.includes("ishares") ||
    nameLower.includes("invesco") ||
    nameLower.includes("xtrackers") ||
    nameLower.includes("lyxor") ||
    nameLower.includes("amundi etf") ||
    nameLower.includes("physical gold") ||
    nameLower.includes("physical silver")
  ) {
    return "STOCKS";
  }

  // Investment funds (Spanish S.A. funds, Vanguard funds, etc.)
  if (
    nameLower.startsWith("s.a.") ||
    nameLower.includes("fondo") ||
    (nameLower.includes("vanguard") && !nameLower.includes("etf")) ||
    (nameLower.includes("amundi") && !nameLower.includes("etf")) ||
    (nameLower.includes("blackrock") && !nameLower.includes("etf")) ||
    nameLower.includes("fidelity") ||
    nameLower.includes("indexa") ||
    nameLower.includes("myinvestor")
  ) {
    return "FUNDS";
  }

  return "OTHERS";
}

/**
 * Recategorize all assets based on their names
 */
export async function recategorizeAllAssets(): Promise<
  ActionResult<{ updated: number; details: { name: string; from: string; to: string }[] }>
> {
  try {
    const assets = await db.asset.findMany();
    const details: { name: string; from: string; to: string }[] = [];

    for (const asset of assets) {
      const newCategory = determineAssetCategory(asset.name);

      if (asset.category !== newCategory) {
        await db.asset.update({
          where: { id: asset.id },
          data: { category: newCategory },
        });

        details.push({
          name: asset.name,
          from: asset.category,
          to: newCategory,
        });
      }
    }

    revalidatePath("/");

    return {
      success: true,
      data: { updated: details.length, details },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to recategorize assets",
    };
  }
}

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
