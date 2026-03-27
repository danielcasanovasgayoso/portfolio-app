"use server";

import { db } from "@/lib/db";
import { testApiKey } from "@/lib/eodhd";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import { setUserLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";
import { z } from "zod";
import { encryptIfConfigured } from "@/lib/crypto";

export interface SettingsData {
  eodhdApiKey: string | null;
  priceUpdateEnabled: boolean;
  priceCacheDurationMin: number;
  theme: string;
  locale: string;
  gmailConnected: boolean;
  lastGmailImport: string | null;
}

export async function getSettings(): Promise<SettingsData> {
  const userId = await getUserId();

  const settings = await db.settings.findUnique({
    where: { userId },
  });

  if (!settings) {
    // Create default settings if none exist
    const newSettings = await db.settings.create({
      data: { userId },
    });

    return {
      eodhdApiKey: null,
      priceUpdateEnabled: newSettings.priceUpdateEnabled,
      priceCacheDurationMin: newSettings.priceCacheDurationMin,
      theme: newSettings.theme,
      locale: newSettings.locale,
      gmailConnected: newSettings.gmailConnected,
      lastGmailImport: null,
    };
  }

  return {
    // Mask API key for security (only show last 4 chars)
    eodhdApiKey: settings.eodhdApiKey
      ? `${"•".repeat(20)}${settings.eodhdApiKey.slice(-4)}`
      : null,
    priceUpdateEnabled: settings.priceUpdateEnabled,
    priceCacheDurationMin: settings.priceCacheDurationMin,
    theme: settings.theme,
    locale: settings.locale,
    gmailConnected: settings.gmailConnected,
    lastGmailImport: settings.lastGmailImport?.toISOString() || null,
  };
}

export async function updateApiKey(
  type: "primary",
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();

    // Test the API key before saving
    const isValid = await testApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key" };
    }

    await db.settings.upsert({
      where: { userId },
      update: { eodhdApiKey: encryptIfConfigured(apiKey) },
      create: { userId, eodhdApiKey: encryptIfConfigured(apiKey) },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update API key",
    };
  }
}

export async function removeApiKey(
  type: "primary"
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();

    await db.settings.update({
      where: { userId },
      data: { eodhdApiKey: null },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove API key",
    };
  }
}

export async function updateTheme(
  theme: "light" | "dark" | "system"
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();

    await db.settings.upsert({
      where: { userId },
      update: { theme },
      create: { userId, theme },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update theme:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update theme",
    };
  }
}

export async function updateLocale(
  locale: Locale
): Promise<{ success: boolean; error?: string }> {
  try {
    await setUserLocale(locale);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update locale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update locale",
    };
  }
}

const CACHE_DURATION_MIN = 1;
const CACHE_DURATION_MAX = 1440; // 24 hours

export async function updatePriceSettings(
  enabled: boolean,
  cacheDurationMin: number
): Promise<{ success: boolean; error?: string }> {
  if (
    !Number.isInteger(cacheDurationMin) ||
    cacheDurationMin < CACHE_DURATION_MIN ||
    cacheDurationMin > CACHE_DURATION_MAX
  ) {
    return {
      success: false,
      error: `Cache duration must be between ${CACHE_DURATION_MIN} and ${CACHE_DURATION_MAX} minutes`,
    };
  }

  try {
    const userId = await getUserId();

    await db.settings.upsert({
      where: { userId },
      update: {
        priceUpdateEnabled: enabled,
        priceCacheDurationMin: cacheDurationMin,
      },
      create: {
        userId,
        priceUpdateEnabled: enabled,
        priceCacheDurationMin: cacheDurationMin,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update price settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

export async function resetDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await getUserId();

    // Get user's assets before deleting (needed for price/cache cleanup)
    const userAssets = await db.asset.findMany({
      where: { userId },
      select: { id: true, ticker: true },
    });
    const assetIds = userAssets.map((a) => a.id);
    const tickers = userAssets.map((a) => a.ticker).filter(Boolean) as string[];

    // Delete in order respecting foreign keys:
    // 1. Transactions (reference assets and importBatches)
    await db.transaction.deleteMany({ where: { userId } });
    // 2. Holdings (reference assets)
    await db.holding.deleteMany({ where: { userId } });
    // 3. Prices and PriceCache (reference assets/tickers)
    if (assetIds.length > 0) {
      await db.price.deleteMany({ where: { assetId: { in: assetIds } } });
    }
    if (tickers.length > 0) {
      await db.priceCache.deleteMany({ where: { ticker: { in: tickers } } });
    }
    // 4. Assets
    await db.asset.deleteMany({ where: { userId } });
    // 5. Import batches (now safe since transactions are deleted)
    await db.importBatch.deleteMany({ where: { userId } });

    // Reset Gmail connection in settings
    await db.settings.update({
      where: { userId },
      data: {
        gmailConnected: false,
        gmailRefreshToken: null,
        lastGmailImport: null,
      },
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/import");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to reset database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset database",
    };
  }
}

export async function exportPortfolioData(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const userId = await getUserId();

    // Fetch all user's data
    const [assets, transactions] = await Promise.all([
      db.asset.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        include: { asset: { select: { name: true, isin: true } } },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalAssets: assets.length,
        totalTransactions: transactions.length,
      },
      assets: assets.map((a) => ({
        isin: a.isin,
        ticker: a.ticker,
        name: a.name,
        category: a.category,
        currency: a.currency,
        manualPricing: a.manualPricing || undefined,
      })),
      transactions: transactions.map((t) => ({
        date: t.date.toISOString().split("T")[0],
        asset: t.asset.name,
        isin: t.asset.isin,
        type: t.type,
        transferType: t.transferType,
        shares: Number(t.shares),
        pricePerShare: t.pricePerShare ? Number(t.pricePerShare) : null,
        totalAmount: Number(t.totalAmount),
        fees: t.fees ? Number(t.fees) : 0,
      })),
    };

    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
    };
  } catch (error) {
    console.error("Failed to export data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export data",
    };
  }
}

// Zod schemas for import validation
const ImportAssetSchema = z.object({
  isin: z.string().min(1).max(20),
  ticker: z.string().max(20).nullable().optional(),
  name: z.string().min(1).max(200),
  category: z.enum(["FUNDS", "STOCKS", "PP", "OTHERS"]).optional(),
  currency: z.string().length(3).optional(),
  manualPricing: z.boolean().optional(),
});

const ImportTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  asset: z.string().optional(),
  isin: z.string().min(1).max(20),
  type: z.enum(["BUY", "SELL", "DIVIDEND", "FEE", "TRANSFER"]),
  transferType: z.enum(["IN", "OUT"]).nullable().optional(),
  shares: z.number().finite(),
  pricePerShare: z.number().finite().nullable().optional(),
  totalAmount: z.number().finite(),
  fees: z.number().finite().min(0).optional(),
});

const ImportDataSchema = z.object({
  exportedAt: z.string().optional(),
  assets: z.array(ImportAssetSchema).max(5000),
  transactions: z.array(ImportTransactionSchema).max(50000),
});

type ImportData = z.infer<typeof ImportDataSchema>;

export async function importPortfolioData(jsonData: string): Promise<{
  success: boolean;
  data?: {
    assetsImported: number;
    transactionsImported: number;
    assetsSkipped: number;
    transactionsSkipped: number;
  };
  error?: string;
}> {
  try {
    const userId = await getUserId();

    // Parse JSON
    let raw: unknown;
    try {
      raw = JSON.parse(jsonData);
    } catch {
      return { success: false, error: "Invalid JSON format" };
    }

    // Validate structure with Zod
    const parseResult = ImportDataSchema.safeParse(raw);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return {
        success: false,
        error: `Invalid import data: ${firstError.path.join(".")} — ${firstError.message}`,
      };
    }

    const data: ImportData = parseResult.data;

    let assetsImported = 0;
    let assetsSkipped = 0;
    let transactionsImported = 0;
    let transactionsSkipped = 0;

    // Map to track ISIN -> assetId for transaction creation
    const isinToAssetId = new Map<string, string>();

    // Get existing assets for this user
    const existingAssets = await db.asset.findMany({
      where: { userId },
      select: { id: true, isin: true },
    });
    for (const asset of existingAssets) {
      isinToAssetId.set(asset.isin, asset.id);
    }

    // Import assets (skip if ISIN already exists for this user)
    for (const asset of data.assets) {
      if (!asset.isin || !asset.name) {
        assetsSkipped++;
        continue;
      }

      if (isinToAssetId.has(asset.isin)) {
        assetsSkipped++;
        continue;
      }

      try {
        const created = await db.asset.create({
          data: {
            userId,
            isin: asset.isin,
            ticker: asset.ticker || null,
            name: asset.name,
            category: asset.category || "OTHERS",
            currency: asset.currency || "EUR",
            manualPricing: asset.manualPricing || false,
          },
        });
        isinToAssetId.set(asset.isin, created.id);
        assetsImported++;
      } catch (error) {
        console.error(`Failed to import asset ${asset.isin}:`, error);
        assetsSkipped++;
      }
    }

    // Import transactions
    for (const txn of data.transactions) {
      if (!txn.isin || !txn.date || !txn.type) {
        transactionsSkipped++;
        continue;
      }

      const assetId = isinToAssetId.get(txn.isin);
      if (!assetId) {
        console.warn(`Asset not found for ISIN ${txn.isin}, skipping transaction`);
        transactionsSkipped++;
        continue;
      }

      try {
        await db.transaction.create({
          data: {
            userId,
            assetId,
            type: txn.type,
            transferType: txn.transferType || null,
            date: new Date(txn.date),
            shares: txn.shares,
            pricePerShare: txn.pricePerShare ?? null,
            totalAmount: txn.totalAmount,
            fees: txn.fees ?? 0,
          },
        });
        transactionsImported++;
      } catch (error) {
        console.error(`Failed to import transaction for ${txn.isin}:`, error);
        transactionsSkipped++;
      }
    }

    // Recalculate holdings for all affected assets
    const { recalculateAllHoldings } = await import("@/services/holdings.service");
    await recalculateAllHoldings(userId);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/settings");

    return {
      success: true,
      data: {
        assetsImported,
        transactionsImported,
        assetsSkipped,
        transactionsSkipped,
      },
    };
  } catch (error) {
    console.error("Failed to import data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import data",
    };
  }
}
