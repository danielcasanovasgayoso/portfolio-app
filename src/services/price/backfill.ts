import { db } from "@/lib/db";
import {
  fetchHistoricalPrices,
  parseEODHDDate,
  EODHDPrice,
} from "@/lib/eodhd";
import { Decimal } from "@prisma/client/runtime/client";
import { getSettings } from "../settings.service";
import { getActiveTradedAssets, getCacheExpiration } from "./internal";

async function storeHistoricalPrices(
  assetId: string,
  prices: EODHDPrice[]
): Promise<void> {
  if (prices.length === 0) return;

  const priceRecords = prices.map((price) => ({
    assetId,
    date: parseEODHDDate(price.date),
    open: new Decimal(price.open),
    high: new Decimal(price.high),
    low: new Decimal(price.low),
    close: new Decimal(price.close),
    volume: BigInt(price.volume || 0),
    source: "EODHD" as const,
  }));

  const dates = priceRecords.map((p) => p.date);

  await db.$transaction(async (tx) => {
    await tx.price.deleteMany({
      where: { assetId, date: { in: dates } },
    });
    await tx.price.createMany({ data: priceRecords, skipDuplicates: true });
  });
}

export async function backfillHistoricalPrices(
  userId: string,
  assetId: string,
  ticker: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const settings = await getSettings(userId);

  try {
    const prices = await fetchHistoricalPrices(ticker, {
      to: new Date(),
      period: "d",
      apiKey: settings.eodhdApiKey,
    });

    if (!prices || prices.length === 0) {
      return { success: false, count: 0, error: "No historical data available" };
    }

    await storeHistoricalPrices(assetId, prices);

    const latest = prices[prices.length - 1];
    const expiresAt = getCacheExpiration(settings.priceCacheDurationMin);
    await db.priceCache.upsert({
      where: { ticker },
      update: {
        latestPrice: new Decimal(latest.close),
        priceDate: parseEODHDDate(latest.date),
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        ticker,
        latestPrice: new Decimal(latest.close),
        priceDate: parseEODHDDate(latest.date),
        fetchedAt: new Date(),
        expiresAt,
      },
    });

    return { success: true, count: prices.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Backfill historical prices for all active traded assets of a user.
 * Best-effort: errors on individual assets are logged but don't stop the process.
 */
export async function backfillAllHistoricalPrices(userId: string): Promise<void> {
  const assets = await getActiveTradedAssets(userId);

  for (const { assetId, ticker } of assets) {
    try {
      await backfillHistoricalPrices(userId, assetId, ticker);
    } catch {
      // Best-effort; continue with remaining assets
    }
  }
}
