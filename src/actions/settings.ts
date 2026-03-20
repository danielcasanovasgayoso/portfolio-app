"use server";

import { db } from "@/lib/db";
import { testApiKey } from "@/lib/eodhd";
import { revalidatePath } from "next/cache";

export interface SettingsData {
  eodhdApiKey: string | null;
  eodhdBackupKey: string | null;
  priceUpdateEnabled: boolean;
  priceCacheDurationMin: number;
  theme: string;
  locale: string;
  gmailConnected: boolean;
  lastGmailImport: string | null;
}

export async function getSettings(): Promise<SettingsData> {
  const settings = await db.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    // Create default settings if none exist
    const newSettings = await db.settings.create({
      data: { id: "default" },
    });

    return {
      eodhdApiKey: null,
      eodhdBackupKey: null,
      priceUpdateEnabled: newSettings.priceUpdateEnabled,
      priceCacheDurationMin: newSettings.priceCacheDurationMin,
      theme: newSettings.theme,
      locale: newSettings.locale,
      gmailConnected: newSettings.gmailConnected,
      lastGmailImport: null,
    };
  }

  return {
    // Mask API keys for security (only show last 4 chars)
    eodhdApiKey: settings.eodhdApiKey
      ? `${"•".repeat(20)}${settings.eodhdApiKey.slice(-4)}`
      : null,
    eodhdBackupKey: settings.eodhdBackupKey
      ? `${"•".repeat(20)}${settings.eodhdBackupKey.slice(-4)}`
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
  type: "primary" | "backup",
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Test the API key before saving
    const isValid = await testApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key" };
    }

    const field = type === "primary" ? "eodhdApiKey" : "eodhdBackupKey";

    await db.settings.upsert({
      where: { id: "default" },
      update: { [field]: apiKey },
      create: { id: "default", [field]: apiKey },
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
  type: "primary" | "backup"
): Promise<{ success: boolean; error?: string }> {
  try {
    const field = type === "primary" ? "eodhdApiKey" : "eodhdBackupKey";

    await db.settings.update({
      where: { id: "default" },
      data: { [field]: null },
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
    await db.settings.upsert({
      where: { id: "default" },
      update: { theme },
      create: { id: "default", theme },
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

export async function updatePriceSettings(
  enabled: boolean,
  cacheDurationMin: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.settings.upsert({
      where: { id: "default" },
      update: {
        priceUpdateEnabled: enabled,
        priceCacheDurationMin: cacheDurationMin,
      },
      create: {
        id: "default",
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
    // Delete all data in order (respecting foreign keys)
    await db.transaction.deleteMany({});
    await db.price.deleteMany({});
    await db.priceCache.deleteMany({});
    await db.holding.deleteMany({});
    await db.importBatch.deleteMany({});
    await db.asset.deleteMany({});

    // Keep settings but reset Gmail connection
    await db.settings.update({
      where: { id: "default" },
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
    // Fetch all data
    const [assets, transactions, holdings, prices] = await Promise.all([
      db.asset.findMany({ orderBy: { name: "asc" } }),
      db.transaction.findMany({
        orderBy: { date: "desc" },
        include: { asset: { select: { name: true, isin: true } } },
      }),
      db.holding.findMany({
        include: { asset: { select: { name: true, isin: true } } },
      }),
      db.price.findMany({
        orderBy: [{ assetId: "asc" }, { date: "desc" }],
        include: { asset: { select: { name: true, ticker: true } } },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalAssets: assets.length,
        totalTransactions: transactions.length,
        totalHoldings: holdings.length,
        totalPriceRecords: prices.length,
      },
      assets: assets.map((a) => ({
        isin: a.isin,
        ticker: a.ticker,
        name: a.name,
        category: a.category,
        currency: a.currency,
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
      holdings: holdings.map((h) => ({
        asset: h.asset.name,
        isin: h.asset.isin,
        shares: Number(h.shares),
        costBasis: Number(h.costBasis),
        avgPrice: Number(h.avgPrice),
        marketValue: h.marketValue ? Number(h.marketValue) : null,
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
