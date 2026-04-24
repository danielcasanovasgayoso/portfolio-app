import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";
import { MARKET_HOURS, PRICE_CACHE } from "@/lib/constants";

export interface PriceUpdateResult {
  ticker: string;
  success: boolean;
  price?: number;
  error?: string;
}

export interface RefreshPricesResult {
  success: boolean;
  updated: number;
  fromCache: number;
  errors: string[];
  results: PriceUpdateResult[];
}

export interface TradedAsset {
  assetId: string;
  ticker: string;
}

export interface AssetPriceWrite {
  assetId: string;
  ticker: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  priceDate: Date;
}

export function isCacheValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

export function getCacheExpiration(cacheDurationMin: number): Date {
  const now = new Date();
  const hours = now.getUTCHours();

  const isMarketHours =
    hours >= MARKET_HOURS.START_UTC && hours <= MARKET_HOURS.END_UTC;

  const durationMs = isMarketHours
    ? cacheDurationMin * 60 * 1000
    : PRICE_CACHE.AFTER_HOURS_DURATION_HOURS * 60 * 60 * 1000;

  return new Date(now.getTime() + durationMs);
}

export function todayDate(): Date {
  return new Date(new Date().toISOString().split("T")[0]);
}

/**
 * Get active holdings with tickers (excludes manual-priced assets)
 */
export async function getActiveTradedAssets(userId: string): Promise<TradedAsset[]> {
  const holdings = await db.holding.findMany({
    where: { userId, shares: { gt: 0 } },
    include: { asset: true },
  });

  return holdings
    .filter((h) => h.asset.ticker && !h.asset.manualPricing)
    .map((h) => ({ assetId: h.assetId, ticker: h.asset.ticker! }));
}

/**
 * Write price to cache + price table + holding in a single transaction.
 * Shared by the single-asset and batch refresh paths.
 */
export async function persistAssetPrice(
  write: AssetPriceWrite,
  cacheDurationMin: number
): Promise<void> {
  const expiresAt = getCacheExpiration(cacheDurationMin);
  const priceDecimal = new Decimal(write.close);

  await db.$transaction(async (tx) => {
    await tx.priceCache.upsert({
      where: { ticker: write.ticker },
      update: {
        latestPrice: priceDecimal,
        priceDate: write.priceDate,
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        ticker: write.ticker,
        latestPrice: priceDecimal,
        priceDate: write.priceDate,
        fetchedAt: new Date(),
        expiresAt,
      },
    });

    await tx.price.upsert({
      where: {
        assetId_date: { assetId: write.assetId, date: write.priceDate },
      },
      update: {
        open: new Decimal(write.open),
        high: new Decimal(write.high),
        low: new Decimal(write.low),
        close: priceDecimal,
        volume: BigInt(write.volume || 0),
      },
      create: {
        assetId: write.assetId,
        date: write.priceDate,
        open: new Decimal(write.open),
        high: new Decimal(write.high),
        low: new Decimal(write.low),
        close: priceDecimal,
        volume: BigInt(write.volume || 0),
        source: "EODHD",
      },
    });

    // Read holding inside transaction to avoid race conditions
    const holding = await tx.holding.findUnique({ where: { assetId: write.assetId } });
    if (holding && !holding.shares.equals(0)) {
      const marketValue = holding.shares.times(priceDecimal);
      const unrealizedGain = marketValue.minus(holding.costBasis);
      await tx.holding.update({
        where: { assetId: write.assetId },
        data: { marketValue, unrealizedGain },
      });
    }
  });
}
