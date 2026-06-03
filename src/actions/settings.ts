"use server";

import { db } from "@/lib/db";
import { scopedDb } from "@/lib/scoped-db";
import { testApiKey } from "@/lib/eodhd";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import { setUserLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";
import { z } from "zod";
import { encryptIfConfigured, decryptIfEncrypted } from "@/lib/crypto";
import type { ErrorCode } from "@/lib/errors";

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
    // Decrypt then mask API key for display (only show last 4 chars)
    eodhdApiKey: settings.eodhdApiKey
      ? (() => {
          try {
            const decrypted = decryptIfEncrypted(settings.eodhdApiKey);
            return `${"•".repeat(20)}${decrypted.slice(-4)}`;
          } catch {
            return `${"•".repeat(20)}****`;
          }
        })()
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
): Promise<{ success: boolean; error?: string; code?: ErrorCode }> {
  try {
    const userId = await getUserId();

    // Test the API key before saving
    const isValid = await testApiKey(apiKey);
    if (!isValid) {
      return { success: false, error: "Invalid API key", code: "INVALID_API_KEY" };
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

export async function removeApiKey(): Promise<{
  success: boolean;
  error?: string;
}> {
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
): Promise<{ success: boolean; error?: string; code?: ErrorCode }> {
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
): Promise<{ success: boolean; error?: string; code?: ErrorCode }> {
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
): Promise<{ success: boolean; error?: string; code?: ErrorCode }> {
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
  code?: ErrorCode;
}> {
  try {
    const userId = await getUserId();

    // Each deleteMany runs independently to avoid Supabase pooler's
    // idle_in_transaction_session_timeout on accounts with many rows.
    // Order respects foreign keys; on partial failure the user can retry.
    const sdb = scopedDb(userId);
    const userAssets = await sdb.asset.findMany({
      select: { id: true, ticker: true },
    });
    const assetIds = userAssets.map((a) => a.id);
    const tickers = userAssets.map((a) => a.ticker).filter(Boolean) as string[];

    // 1. Transactions (reference assets and importBatches)
    await sdb.transaction.deleteMany({});
    // 2. Holdings (reference assets)
    await sdb.holding.deleteMany({});
    // 3. Prices and PriceCache are global tables keyed by assetId/ticker (not
    //    userId), so they stay on the raw client, scoped to this user's assets.
    if (assetIds.length > 0) {
      await db.price.deleteMany({ where: { assetId: { in: assetIds } } });
    }
    if (tickers.length > 0) {
      await db.priceCache.deleteMany({ where: { ticker: { in: tickers } } });
    }
    // 4. Assets
    await sdb.asset.deleteMany({});
    // 5. Import batches (now safe since transactions are deleted)
    await sdb.importBatch.deleteMany({});

    // Reset Gmail connection in settings (keyed by userId on the raw client)
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
      code: "OPERATION_FAILED",
    };
  }
}

export async function exportPortfolioData(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
  code?: ErrorCode;
}> {
  try {
    const userId = await getUserId();

    // Fetch all user's data
    const sdb = scopedDb(userId);
    const [assets, transactions, properties] = await Promise.all([
      sdb.asset.findMany({ orderBy: { name: "asc" } }),
      sdb.transaction.findMany({
        orderBy: { date: "desc" },
        include: { asset: { select: { name: true, isin: true } } },
      }),
      sdb.property.findMany({
        orderBy: { name: "asc" },
        include: {
          owners: true,
          valuations: { orderBy: { date: "asc" } },
          mortgage: {
            include: { partialAmortizations: { orderBy: { date: "asc" } } },
          },
        },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalAssets: assets.length,
        totalTransactions: transactions.length,
        totalProperties: properties.length,
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
      properties: properties.map((p) => ({
        name: p.name,
        purchaseDate: p.purchaseDate.toISOString().split("T")[0],
        currency: p.currency,
        purchasePrice: Number(p.purchasePrice),
        vatRate: Number(p.vatRate),
        transferTaxRate: Number(p.transferTaxRate),
        purchaseCosts: Number(p.purchaseCosts),
        owners: p.owners.map((o) => ({
          name: o.name,
          sharePct: Number(o.sharePct),
          isSelf: o.isSelf,
        })),
        valuations: p.valuations.map((v) => ({
          date: v.date.toISOString().split("T")[0],
          value: Number(v.value),
          note: v.note,
        })),
        mortgage: p.mortgage
          ? {
              loanAmount: Number(p.mortgage.loanAmount),
              downPayment: Number(p.mortgage.downPayment),
              termMonths: p.mortgage.termMonths,
              annualInterestRate: Number(p.mortgage.annualInterestRate),
              type: p.mortgage.type,
              startDate: p.mortgage.startDate.toISOString().split("T")[0],
              initialInterestAmount:
                p.mortgage.initialInterestAmount != null
                  ? Number(p.mortgage.initialInterestAmount)
                  : null,
              initialInterestDate:
                p.mortgage.initialInterestDate
                  ? p.mortgage.initialInterestDate.toISOString().split("T")[0]
                  : null,
              partialAmortizations: p.mortgage.partialAmortizations.map((a) => ({
                date: a.date.toISOString().split("T")[0],
                amount: Number(a.amount),
                mode: a.mode,
              })),
            }
          : null,
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
      code: "OPERATION_FAILED",
    };
  }
}

// Zod schemas for import validation
const ImportAssetSchema = z.object({
  // Supports both standard ISINs and app-generated manual IDs like MANUAL-<uuid>.
  isin: z.string().min(1).max(100),
  ticker: z.string().max(20).nullable().optional(),
  name: z.string().min(1).max(200),
  category: z.enum(["FUNDS", "STOCKS", "PP", "OTHERS"]).optional(),
  currency: z.string().length(3).optional(),
  manualPricing: z.boolean().optional(),
});

const ImportTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  asset: z.string().optional(),
  // Matches the asset import schema so manual assets can be restored from backups.
  isin: z.string().min(1).max(100),
  type: z.enum(["BUY", "SELL", "DIVIDEND", "FEE", "TRANSFER"]),
  transferType: z.enum(["IN", "OUT"]).nullable().optional(),
  shares: z.number().finite(),
  pricePerShare: z.number().finite().nullable().optional(),
  totalAmount: z.number().finite(),
  fees: z.number().finite().min(0).optional(),
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const ImportPropertyOwnerSchema = z.object({
  name: z.string().min(1).max(200),
  sharePct: z.number().finite().min(0).max(100),
  isSelf: z.boolean().optional(),
});

const ImportPropertyValuationSchema = z.object({
  date: dateOnly,
  value: z.number().finite(),
  note: z.string().max(2000).nullable().optional(),
});

const ImportPartialAmortizationSchema = z.object({
  date: dateOnly,
  amount: z.number().finite(),
  mode: z.enum(["REDUCE_TERM", "REDUCE_INSTALLMENT"]).optional(),
});

const ImportMortgageSchema = z.object({
  loanAmount: z.number().finite(),
  downPayment: z.number().finite(),
  termMonths: z.number().int().positive(),
  annualInterestRate: z.number().finite(),
  type: z.enum(["FIXED", "VARIABLE"]).optional(),
  startDate: dateOnly,
  initialInterestAmount: z.number().finite().nullable().optional(),
  initialInterestDate: dateOnly.nullable().optional(),
  partialAmortizations: z.array(ImportPartialAmortizationSchema).max(1000).optional(),
});

const ImportPropertySchema = z.object({
  name: z.string().min(1).max(200),
  purchaseDate: dateOnly,
  currency: z.string().length(3).optional(),
  purchasePrice: z.number().finite().optional(),
  vatRate: z.number().finite().optional(),
  transferTaxRate: z.number().finite().optional(),
  purchaseCosts: z.number().finite().optional(),
  owners: z.array(ImportPropertyOwnerSchema).max(50).optional(),
  valuations: z.array(ImportPropertyValuationSchema).max(5000).optional(),
  mortgage: ImportMortgageSchema.nullable().optional(),
});

const ImportDataSchema = z.object({
  exportedAt: z.string().optional(),
  assets: z.array(ImportAssetSchema).max(5000),
  transactions: z.array(ImportTransactionSchema).max(50000),
  properties: z.array(ImportPropertySchema).max(1000).optional(),
});

type ImportData = z.infer<typeof ImportDataSchema>;

export async function importPortfolioData(jsonData: string): Promise<{
  success: boolean;
  data?: {
    assetsImported: number;
    transactionsImported: number;
    assetsSkipped: number;
    transactionsSkipped: number;
    propertiesImported: number;
    propertiesSkipped: number;
  };
  error?: string;
  code?: ErrorCode;
}> {
  try {
    const userId = await getUserId();

    // Parse JSON
    let raw: unknown;
    try {
      raw = JSON.parse(jsonData);
    } catch {
      return { success: false, error: "Invalid JSON format", code: "INVALID_JSON" };
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
    let propertiesImported = 0;
    let propertiesSkipped = 0;

    // Map to track ISIN -> assetId for transaction creation
    const isinToAssetId = new Map<string, string>();
    const sdb = scopedDb(userId);

    // Get existing assets for this user
    const existingAssets = await sdb.asset.findMany({
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

    // Import real estate properties (skip duplicates by name + purchase date)
    if (data.properties && data.properties.length > 0) {
      // Key existing properties by name + purchase date to avoid duplicates on re-import.
      const existingProperties = await sdb.property.findMany({
        select: { name: true, purchaseDate: true },
      });
      const propertyKey = (name: string, purchaseDate: Date) =>
        `${name} ${purchaseDate.toISOString().split("T")[0]}`;
      const existingPropertyKeys = new Set(
        existingProperties.map((p) => propertyKey(p.name, p.purchaseDate))
      );

      for (const property of data.properties) {
        if (existingPropertyKeys.has(propertyKey(property.name, new Date(property.purchaseDate)))) {
          propertiesSkipped++;
          continue;
        }

        try {
          const mortgage = property.mortgage;
          // Nested create (owners/valuations/mortgage/partials): scopedDb only
          // injects userId at the top level, so every level sets it explicitly
          // on the raw client.
          await db.property.create({
            data: {
              userId,
              name: property.name,
              purchaseDate: new Date(property.purchaseDate),
              currency: property.currency || "EUR",
              purchasePrice: property.purchasePrice ?? 0,
              vatRate: property.vatRate ?? 0.1,
              transferTaxRate: property.transferTaxRate ?? 0.015,
              purchaseCosts: property.purchaseCosts ?? 0,
              owners: property.owners
                ? {
                    create: property.owners.map((o) => ({
                      userId,
                      name: o.name,
                      sharePct: o.sharePct,
                      isSelf: o.isSelf ?? false,
                    })),
                  }
                : undefined,
              valuations: property.valuations
                ? {
                    create: property.valuations.map((v) => ({
                      userId,
                      date: new Date(v.date),
                      value: v.value,
                      note: v.note ?? null,
                    })),
                  }
                : undefined,
              mortgage: mortgage
                ? {
                    create: {
                      userId,
                      loanAmount: mortgage.loanAmount,
                      downPayment: mortgage.downPayment,
                      termMonths: mortgage.termMonths,
                      annualInterestRate: mortgage.annualInterestRate,
                      type: mortgage.type || "FIXED",
                      startDate: new Date(mortgage.startDate),
                      initialInterestAmount: mortgage.initialInterestAmount ?? null,
                      initialInterestDate: mortgage.initialInterestDate
                        ? new Date(mortgage.initialInterestDate)
                        : null,
                      partialAmortizations: mortgage.partialAmortizations
                        ? {
                            create: mortgage.partialAmortizations.map((a) => ({
                              userId,
                              date: new Date(a.date),
                              amount: a.amount,
                              mode: a.mode || "REDUCE_TERM",
                            })),
                          }
                        : undefined,
                    },
                  }
                : undefined,
            },
          });
          existingPropertyKeys.add(propertyKey(property.name, new Date(property.purchaseDate)));
          propertiesImported++;
        } catch (error) {
          console.error(`Failed to import property ${property.name}:`, error);
          propertiesSkipped++;
        }
      }
    }

    // Recalculate holdings for all affected assets
    const { recalculateAllHoldings } = await import("@/services/holdings.service");
    await recalculateAllHoldings(userId);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/real-estate");
    revalidatePath("/settings");

    return {
      success: true,
      data: {
        assetsImported,
        transactionsImported,
        assetsSkipped,
        transactionsSkipped,
        propertiesImported,
        propertiesSkipped,
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
