import { db } from "@/lib/db";
import {
  fetchHistoricalPrices,
  fetchBatchRealTimePrices,
  parseEODHDDate,
  getHistoricalStartDate,
  resolveIsinToSymbol,
  EODHDPrice,
} from "@/lib/eodhd";
import { Decimal } from "@prisma/client/runtime/client";
import { updateHoldingMarketValue } from "./holdings.service";
import { getSettings } from "./settings.service";
import { MARKET_HOURS, PRICE_CACHE } from "@/lib/constants";

interface PriceUpdateResult {
  ticker: string;
  success: boolean;
  price?: number;
  error?: string;
}

interface RefreshPricesResult {
  success: boolean;
  updated: number;
  fromCache: number;
  errors: string[];
  results: PriceUpdateResult[];
}

/**
 * Check if cached price is still valid
 */
function isCacheValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

/**
 * Get cache expiration time based on market hours
 */
function getCacheExpiration(cacheDurationMin: number): Date {
  const now = new Date();
  const hours = now.getUTCHours();

  // Check if within combined market hours window
  const isMarketHours =
    hours >= MARKET_HOURS.START_UTC && hours <= MARKET_HOURS.END_UTC;

  // During market hours: use configured duration
  // After hours: cache for longer
  const durationMs = isMarketHours
    ? cacheDurationMin * 60 * 1000
    : PRICE_CACHE.AFTER_HOURS_DURATION_HOURS * 60 * 60 * 1000;

  return new Date(now.getTime() + durationMs);
}

/**
 * Get cached prices for tickers
 */
export async function getCachedPrices(
  tickers: string[]
): Promise<Map<string, { price: Decimal; date: Date; isValid: boolean }>> {
  const cached = await db.priceCache.findMany({
    where: { ticker: { in: tickers } },
  });

  const result = new Map();

  for (const cache of cached) {
    result.set(cache.ticker, {
      price: cache.latestPrice,
      date: cache.priceDate,
      isValid: isCacheValid(cache.expiresAt),
    });
  }

  return result;
}

/**
 * Update price cache for a ticker
 */
async function updatePriceCache(
  ticker: string,
  price: number,
  priceDate: Date,
  cacheDurationMin: number
): Promise<void> {
  const expiresAt = getCacheExpiration(cacheDurationMin);

  await db.priceCache.upsert({
    where: { ticker },
    update: {
      latestPrice: new Decimal(price),
      priceDate,
      fetchedAt: new Date(),
      expiresAt,
    },
    create: {
      ticker,
      latestPrice: new Decimal(price),
      priceDate,
      fetchedAt: new Date(),
      expiresAt,
    },
  });
}

/**
 * Store historical prices in the Price table using batch operations
 * Uses a transaction to ensure atomicity and improve performance
 */
async function storeHistoricalPrices(
  assetId: string,
  prices: EODHDPrice[]
): Promise<void> {
  if (prices.length === 0) return;

  // Prepare all price records
  const priceRecords = prices.map((price) => {
    const date = parseEODHDDate(price.date);
    return {
      assetId,
      date,
      open: new Decimal(price.open),
      high: new Decimal(price.high),
      low: new Decimal(price.low),
      close: new Decimal(price.close),
      volume: BigInt(price.volume || 0),
      source: "EODHD" as const,
    };
  });

  // Get all dates we're about to insert
  const dates = priceRecords.map((p) => p.date);

  // Use transaction for atomic batch operation
  await db.$transaction(async (tx) => {
    // Delete existing prices for these dates (faster than individual upserts)
    await tx.price.deleteMany({
      where: {
        assetId,
        date: { in: dates },
      },
    });

    // Batch insert all prices
    await tx.price.createMany({
      data: priceRecords,
      skipDuplicates: true,
    });
  });
}

/**
 * Fetch and store latest price for a single asset
 */
export async function refreshAssetPrice(
  userId: string,
  assetId: string,
  ticker: string
): Promise<PriceUpdateResult> {
  const settings = await getSettings(userId);

  if (!settings.priceUpdateEnabled) {
    return { ticker, success: false, error: "Price updates disabled" };
  }

  try {
    const prices = await fetchHistoricalPrices(ticker, {
      primaryKey: settings.eodhdApiKey,
      backupKey: settings.eodhdBackupKey,
    });

    if (!prices || prices.length === 0) {
      return { ticker, success: false, error: "No price data returned" };
    }

    // Get the latest price
    const latestPrice = prices[prices.length - 1];
    const priceDate = parseEODHDDate(latestPrice.date);

    // Update cache
    await updatePriceCache(
      ticker,
      latestPrice.close,
      priceDate,
      settings.priceCacheDurationMin
    );

    // Store in Price table
    await storeHistoricalPrices(assetId, [latestPrice]);

    // Update holding market value
    await updateHoldingMarketValue(assetId, new Decimal(latestPrice.close));

    return { ticker, success: true, price: latestPrice.close };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ticker, success: false, error: message };
  }
}

/**
 * Refresh prices for all holdings of a user
 * Uses caching to minimize API calls
 * @param userId - The user ID
 * @param resolveIsins - If true, attempt to resolve tickers for assets without them
 */
export async function refreshAllPrices(
  userId: string,
  options?: { resolveIsins?: boolean }
): Promise<RefreshPricesResult> {
  const settings = await getSettings(userId);

  if (!settings.priceUpdateEnabled) {
    return {
      success: false,
      updated: 0,
      fromCache: 0,
      errors: ["Price updates disabled"],
      results: [],
    };
  }

  // Get all holdings with their assets for this user
  const holdings = await db.holding.findMany({
    where: { userId, shares: { gt: 0 } },
    include: { asset: true },
  });

  // If resolveIsins is enabled, attempt to resolve tickers for assets without them
  if (options?.resolveIsins) {
    const assetsWithoutTickers = holdings.filter((h) => !h.asset.ticker);
    for (const holding of assetsWithoutTickers) {
      await resolveAssetTicker(userId, holding.assetId, holding.asset.isin);
    }

    // Refresh holdings data after ticker resolution
    const refreshedHoldings = await db.holding.findMany({
      where: { userId, shares: { gt: 0 } },
      include: { asset: true },
    });
    holdings.length = 0;
    holdings.push(...refreshedHoldings);
  }

  // Filter to assets with tickers
  const assetsWithTickers = holdings
    .filter((h) => h.asset.ticker)
    .map((h) => ({
      assetId: h.assetId,
      ticker: h.asset.ticker!,
    }));

  if (assetsWithTickers.length === 0) {
    return {
      success: true,
      updated: 0,
      fromCache: 0,
      errors: [],
      results: [],
    };
  }

  const tickers = assetsWithTickers.map((a) => a.ticker);

  // Check cache
  const cached = await getCachedPrices(tickers);
  const tickersToFetch: string[] = [];
  let fromCache = 0;

  for (const ticker of tickers) {
    const cachedPrice = cached.get(ticker);
    if (cachedPrice?.isValid) {
      fromCache++;
    } else {
      tickersToFetch.push(ticker);
    }
  }

  const results: PriceUpdateResult[] = [];
  let updated = 0;
  const errors: string[] = [];

  // Use cached prices for valid entries
  for (const { assetId, ticker } of assetsWithTickers) {
    const cachedPrice = cached.get(ticker);
    if (cachedPrice?.isValid) {
      try {
        await updateHoldingMarketValue(assetId, cachedPrice.price);
        results.push({ ticker, success: true, price: Number(cachedPrice.price) });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ ticker, success: false, error: msg });
        errors.push(`${ticker}: ${msg}`);
      }
    }
  }

  // Fetch fresh prices for stale/missing entries
  if (tickersToFetch.length > 0) {
    // Separate funds (EOD only) from stocks (real-time available)
    const fundTickers = tickersToFetch.filter((t) => t.includes(".EUFUND"));
    const stockTickers = tickersToFetch.filter((t) => !t.includes(".EUFUND"));

    // Fetch real-time prices for stocks/ETCs
    if (stockTickers.length > 0) {
      try {
        const freshPrices = await fetchBatchRealTimePrices(stockTickers, {
          primaryKey: settings.eodhdApiKey,
          backupKey: settings.eodhdBackupKey,
        });

        for (const { assetId, ticker } of assetsWithTickers) {
          if (!stockTickers.includes(ticker)) continue;

          const price = freshPrices.get(ticker);
          if (price) {
            try {
              await updatePriceCache(
                ticker,
                price.close,
                new Date(price.timestamp * 1000),
                settings.priceCacheDurationMin
              );

              await db.price.upsert({
                where: {
                  assetId_date: {
                    assetId,
                    date: new Date(new Date().toISOString().split("T")[0]),
                  },
                },
                update: {
                  open: new Decimal(price.open),
                  high: new Decimal(price.high),
                  low: new Decimal(price.low),
                  close: new Decimal(price.close),
                  volume: BigInt(price.volume || 0),
                },
                create: {
                  assetId,
                  date: new Date(new Date().toISOString().split("T")[0]),
                  open: new Decimal(price.open),
                  high: new Decimal(price.high),
                  low: new Decimal(price.low),
                  close: new Decimal(price.close),
                  volume: BigInt(price.volume || 0),
                  source: "EODHD",
                },
              });

              await updateHoldingMarketValue(assetId, new Decimal(price.close));

              updated++;
              results.push({ ticker, success: true, price: price.close });
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              results.push({ ticker, success: false, error: msg });
              errors.push(`${ticker}: ${msg}`);
            }
          } else {
            // Real-time not available, will fall back to EOD below
            fundTickers.push(ticker);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Batch fetch failed: ${msg}`);
      }
    }

    // Fetch EOD prices for funds and any stocks that failed real-time
    for (const { assetId, ticker } of assetsWithTickers) {
      if (!fundTickers.includes(ticker)) continue;

      try {
        const prices = await fetchHistoricalPrices(ticker, {
          primaryKey: settings.eodhdApiKey,
          backupKey: settings.eodhdBackupKey,
        });

        if (prices && prices.length > 0) {
          const latestPrice = prices[prices.length - 1];
          const priceDate = parseEODHDDate(latestPrice.date);

          await updatePriceCache(
            ticker,
            latestPrice.close,
            priceDate,
            settings.priceCacheDurationMin
          );

          await db.price.upsert({
            where: {
              assetId_date: {
                assetId,
                date: priceDate,
              },
            },
            update: {
              open: new Decimal(latestPrice.open),
              high: new Decimal(latestPrice.high),
              low: new Decimal(latestPrice.low),
              close: new Decimal(latestPrice.close),
              volume: BigInt(latestPrice.volume || 0),
            },
            create: {
              assetId,
              date: priceDate,
              open: new Decimal(latestPrice.open),
              high: new Decimal(latestPrice.high),
              low: new Decimal(latestPrice.low),
              close: new Decimal(latestPrice.close),
              volume: BigInt(latestPrice.volume || 0),
              source: "EODHD",
            },
          });

          await updateHoldingMarketValue(assetId, new Decimal(latestPrice.close));

          updated++;
          results.push({ ticker, success: true, price: latestPrice.close });
        } else {
          results.push({ ticker, success: false, error: "No price data" });
          errors.push(`${ticker}: No price data returned`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ ticker, success: false, error: msg });
        errors.push(`${ticker}: ${msg}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    updated,
    fromCache,
    errors,
    results,
  };
}

/**
 * Backfill historical prices for an asset
 * Called when a new asset is added
 */
export async function backfillHistoricalPrices(
  userId: string,
  assetId: string,
  ticker: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const settings = await getSettings(userId);

  try {
    const from = getHistoricalStartDate();
    const to = new Date();

    const prices = await fetchHistoricalPrices(ticker, {
      from,
      to,
      period: "d",
      primaryKey: settings.eodhdApiKey,
      backupKey: settings.eodhdBackupKey,
    });

    if (!prices || prices.length === 0) {
      return { success: false, count: 0, error: "No historical data available" };
    }

    await storeHistoricalPrices(assetId, prices);

    // Update cache with latest
    const latest = prices[prices.length - 1];
    await updatePriceCache(
      ticker,
      latest.close,
      parseEODHDDate(latest.date),
      settings.priceCacheDurationMin
    );

    return { success: true, count: prices.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, count: 0, error: message };
  }
}

// Keep track of failed backfill attempts in memory to avoid API spam
const failedBackfills = new Set<string>();

/**
 * Get price history for an asset
 */
export async function getPriceHistory(
  assetId: string,
  options?: {
    from?: Date;
    to?: Date;
    limit?: number;
  }
): Promise<{ date: Date; close: number; open?: number; high?: number; low?: number }[]> {
  const where: { assetId: string; date?: { gte?: Date; lte?: Date } } = { assetId };

  if (options?.from || options?.to) {
    where.date = {};
    if (options.from) where.date.gte = options.from;
    if (options.to) where.date.lte = options.to;
  }

  let prices = await db.price.findMany({
    where,
    orderBy: { date: "asc" },
    take: options?.limit,
  });

  // Lazy backfill if we have very little to no history (meaning it was probably just imported)
  if (prices.length < 10 && !failedBackfills.has(assetId)) {
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    
    if (asset && asset.ticker) {
      console.log(`[PriceService] Lazy backfilling historical prices for ${asset.ticker}`);
      try {
        const result = await backfillHistoricalPrices(asset.userId, asset.id, asset.ticker);
        
        if (result.success && result.count > 0) {
          // Re-fetch now that we have history
          prices = await db.price.findMany({
            where,
            orderBy: { date: "asc" },
            take: options?.limit,
          });
        } else {
          // Mark as failed so we don't keep trying this session
          failedBackfills.add(assetId);
        }
      } catch (e) {
        console.error(`[PriceService] Failed to lazy backfill ${asset.ticker}:`, e);
        failedBackfills.add(assetId);
      }
    } else {
      failedBackfills.add(assetId);
    }
  }

  return prices.map((p) => ({
    date: p.date,
    close: Number(p.close),
    open: p.open ? Number(p.open) : undefined,
    high: p.high ? Number(p.high) : undefined,
    low: p.low ? Number(p.low) : undefined,
  }));
}

/**
 * Get latest price for an asset
 */
export async function getLatestPrice(
  assetId: string
): Promise<{ price: number; date: Date } | null> {
  const price = await db.price.findFirst({
    where: { assetId },
    orderBy: { date: "desc" },
  });

  if (!price) return null;

  return {
    price: Number(price.close),
    date: price.date,
  };
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const result = await db.priceCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return result.count;
}

/**
 * Resolve ISIN to ticker for an asset and save it
 * Returns the resolved ticker or null if resolution failed
 */
export async function resolveAssetTicker(
  userId: string,
  assetId: string,
  isin: string
): Promise<string | null> {
  const settings = await getSettings(userId);

  try {
    const ticker = await resolveIsinToSymbol(isin, {
      primaryKey: settings.eodhdApiKey,
      backupKey: settings.eodhdBackupKey,
    });

    if (ticker) {
      // Update the asset with the resolved ticker
      await db.asset.update({
        where: { id: assetId },
        data: { ticker },
      });

      console.log(`Resolved ISIN ${isin} to ticker ${ticker}`);
      return ticker;
    }

    console.log(`Could not resolve ISIN ${isin} to a ticker`);
    return null;
  } catch (error) {
    console.error(`Error resolving ISIN ${isin}:`, error);
    return null;
  }
}

/**
 * Resolve tickers for all assets without tickers for a user
 * Useful for batch processing newly imported assets
 */
export async function resolveAllMissingTickers(userId: string): Promise<{
  resolved: number;
  failed: number;
  results: Array<{ isin: string; ticker: string | null; error?: string }>;
}> {
  const assetsWithoutTickers = await db.asset.findMany({
    where: {
      userId,
      ticker: null,
      isActive: true,
    },
  });

  const results: Array<{ isin: string; ticker: string | null; error?: string }> = [];
  let resolved = 0;
  let failed = 0;

  for (const asset of assetsWithoutTickers) {
    try {
      const ticker = await resolveAssetTicker(userId, asset.id, asset.isin);
      if (ticker) {
        resolved++;
        results.push({ isin: asset.isin, ticker });
      } else {
        failed++;
        results.push({ isin: asset.isin, ticker: null, error: "Resolution failed" });
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      results.push({ isin: asset.isin, ticker: null, error: message });
    }
  }

  return { resolved, failed, results };
}
