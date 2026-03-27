import { db } from "@/lib/db";
import {
  fetchHistoricalPrices,
  fetchRealTimePrice,
  fetchBatchRealTimePrices,
  parseEODHDDate,
  getHistoricalStartDate,
  resolveIsinToSymbol,
  isFundTicker,
  EODHDPrice,
} from "@/lib/eodhd";
import { Decimal } from "@prisma/client/runtime/client";
import { updateHoldingMarketValue } from "./holdings.service";
import { getSettings } from "./settings.service";
import { MARKET_HOURS, PRICE_CACHE } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import type { SSEEvent } from "@/types/price-refresh";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface TradedAsset {
  assetId: string;
  ticker: string;
}

interface AssetPriceWrite {
  assetId: string;
  ticker: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  priceDate: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCacheValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

function getCacheExpiration(cacheDurationMin: number): Date {
  const now = new Date();
  const hours = now.getUTCHours();

  const isMarketHours =
    hours >= MARKET_HOURS.START_UTC && hours <= MARKET_HOURS.END_UTC;

  const durationMs = isMarketHours
    ? cacheDurationMin * 60 * 1000
    : PRICE_CACHE.AFTER_HOURS_DURATION_HOURS * 60 * 60 * 1000;

  return new Date(now.getTime() + durationMs);
}

function todayDate(): Date {
  return new Date(new Date().toISOString().split("T")[0]);
}

/**
 * Get active holdings with tickers (excludes manual-priced assets)
 */
async function getActiveTradedAssets(userId: string): Promise<TradedAsset[]> {
  const holdings = await db.holding.findMany({
    where: { userId, shares: { gt: 0 } },
    include: { asset: true },
  });

  return holdings
    .filter((h) => h.asset.ticker && !h.asset.manualPricing)
    .map((h) => ({ assetId: h.assetId, ticker: h.asset.ticker! }));
}

/**
 * Write price to cache + price table + holding in a single transaction
 */
async function persistAssetPrice(
  write: AssetPriceWrite,
  cacheDurationMin: number
): Promise<void> {
  const expiresAt = getCacheExpiration(cacheDurationMin);
  const priceDecimal = new Decimal(write.close);

  // Fetch holding data for market value calculation
  const holding = await db.holding.findUnique({ where: { assetId: write.assetId } });

  await db.$transaction(async (tx) => {
    // 1. Update price cache
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

    // 2. Upsert price record
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

    // 3. Update holding market value
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

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Store historical prices (batch)
// ---------------------------------------------------------------------------

async function storeHistoricalPrices(
  assetId: string,
  prices: EODHDPrice[]
): Promise<void> {
  if (prices.length === 0) return;

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

  const dates = priceRecords.map((p) => p.date);

  await db.$transaction(async (tx) => {
    await tx.price.deleteMany({
      where: { assetId, date: { in: dates } },
    });
    await tx.price.createMany({ data: priceRecords, skipDuplicates: true });
  });
}

// ---------------------------------------------------------------------------
// Single asset refresh
// ---------------------------------------------------------------------------

export async function refreshAssetPrice(
  userId: string,
  assetId: string,
  ticker: string
): Promise<PriceUpdateResult> {
  const settings = await getSettings(userId);

  if (!settings.priceUpdateEnabled) {
    return { ticker, success: false, error: "Price updates disabled" };
  }

  const isFund = isFundTicker(ticker);

  try {
    // Try real-time API first for non-fund tickers (matches batch refresh behavior)
    if (!isFund) {
      try {
        const realTime = await fetchRealTimePrice(ticker, {
          apiKey: settings.eodhdApiKey,
        });

        if (realTime && realTime.close !== 0) {
          await persistAssetPrice(
            {
              assetId,
              ticker,
              close: realTime.close,
              open: realTime.open,
              high: realTime.high,
              low: realTime.low,
              volume: realTime.volume || 0,
              priceDate: todayDate(),
            },
            settings.priceCacheDurationMin
          );

          return { ticker, success: true, price: realTime.close };
        }
      } catch {
        // Real-time failed, fall through to EOD
      }
    }

    // Fallback to EOD historical prices (always used for funds, fallback for stocks)
    const prices = await fetchHistoricalPrices(ticker, {
      apiKey: settings.eodhdApiKey,
    });

    if (!prices || prices.length === 0) {
      return { ticker, success: false, error: "No price data returned" };
    }

    const latestPrice = prices[prices.length - 1];
    const priceDate = parseEODHDDate(latestPrice.date);

    await persistAssetPrice(
      {
        assetId,
        ticker,
        close: latestPrice.close,
        open: latestPrice.open,
        high: latestPrice.high,
        low: latestPrice.low,
        volume: latestPrice.volume || 0,
        priceDate,
      },
      settings.priceCacheDurationMin
    );

    return { ticker, success: true, price: latestPrice.close };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ticker, success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Core refresh logic (shared by both batch and streaming callers)
// ---------------------------------------------------------------------------

/**
 * Refresh all prices for a user.
 *
 * @param onAssetDone - Optional callback invoked after each asset is processed
 *   (enables SSE streaming). When omitted the function runs silently.
 */
export async function refreshAllPrices(
  userId: string,
  options?: { resolveIsins?: boolean; forceRefresh?: boolean },
  onAssetDone?: (event: SSEEvent) => void
): Promise<RefreshPricesResult> {
  const settings = await getSettings(userId);

  if (!settings.priceUpdateEnabled) {
    onAssetDone?.({ type: "done", updated: 0, errors: 0 });
    return {
      success: false,
      updated: 0,
      fromCache: 0,
      errors: ["Price updates disabled"],
      results: [],
    };
  }

  // --- Resolve missing tickers and names if requested ---
  if (options?.resolveIsins) {
    const holdingsNeedingResolution = await db.holding.findMany({
      where: { userId, shares: { gt: 0 }, asset: { manualPricing: false } },
      include: { asset: true },
    });
    for (const holding of holdingsNeedingResolution) {
      const asset = holding.asset;
      // Resolve if no ticker yet, OR if name is still the ISIN placeholder
      if (!asset.ticker || asset.name === asset.isin) {
        await resolveAssetTicker(userId, holding.assetId, asset.isin);
      }
    }
  }

  // --- Get tradeable assets ---
  const assetsWithTickers = await getActiveTradedAssets(userId);

  if (assetsWithTickers.length === 0) {
    onAssetDone?.({ type: "done", updated: 0, errors: 0 });
    return { success: true, updated: 0, fromCache: 0, errors: [], results: [] };
  }

  const tickers = assetsWithTickers.map((a) => a.ticker);

  // --- Cache check ---
  const cached = options?.forceRefresh
    ? new Map()
    : await getCachedPrices(tickers);

  // Partition into cached vs to-fetch using Sets for O(1) lookup
  const tickersToFetchSet = new Set<string>();
  const cachedAssets: Array<TradedAsset & { price: Decimal }> = [];

  for (const asset of assetsWithTickers) {
    const cachedPrice = cached.get(asset.ticker);
    if (cachedPrice?.isValid) {
      cachedAssets.push({ ...asset, price: cachedPrice.price });
    } else {
      tickersToFetchSet.add(asset.ticker);
    }
  }

  const results: PriceUpdateResult[] = [];
  let updated = 0;
  let fromCache = 0;
  const errors: string[] = [];

  // --- Process cached assets ---
  for (const { assetId, ticker, price } of cachedAssets) {
    try {
      await updateHoldingMarketValue(assetId, price);
      results.push({ ticker, success: true, price: Number(price) });
      fromCache++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      results.push({ ticker, success: false, error: msg });
      errors.push(`${ticker}: ${msg}`);
    }
  }

  // --- Fetch fresh prices ---
  if (tickersToFetchSet.size > 0) {
    const assetsToFetch = assetsWithTickers.filter((a) => tickersToFetchSet.has(a.ticker));

    // Partition funds vs stocks using Sets
    const fundTickerSet = new Set<string>();
    const stockTickerSet = new Set<string>();
    for (const ticker of tickersToFetchSet) {
      if (isFundTicker(ticker)) {
        fundTickerSet.add(ticker);
      } else {
        stockTickerSet.add(ticker);
      }
    }

    const eodFallbackSet = new Set<string>();

    // Emit start event for streaming
    onAssetDone?.({ type: "start", total: assetsToFetch.length });

    // --- Real-time prices for stocks/ETCs (single batch API call) ---
    let freshPrices = new Map<string, { open: number; high: number; low: number; close: number; volume: number; timestamp: number }>();
    if (stockTickerSet.size > 0) {
      try {
        freshPrices = await fetchBatchRealTimePrices([...stockTickerSet], {
          apiKey: settings.eodhdApiKey,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Batch fetch failed: ${msg}`);
        // All stocks fall back to EOD
        for (const t of stockTickerSet) eodFallbackSet.add(t);
      }
    }

    // Process each stock ticker
    const today = todayDate();
    for (const { assetId, ticker } of assetsToFetch) {
      if (!stockTickerSet.has(ticker)) continue;

      const price = freshPrices.get(ticker);
      if (!price || price.close === 0) {
        eodFallbackSet.add(ticker);
        continue;
      }

      try {
        await persistAssetPrice(
          {
            assetId,
            ticker,
            close: price.close,
            open: price.open,
            high: price.high,
            low: price.low,
            volume: price.volume || 0,
            priceDate: today,
          },
          settings.priceCacheDurationMin
        );

        updated++;
        results.push({ ticker, success: true, price: price.close });
        onAssetDone?.({ type: "price_updated", assetId, ticker });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ ticker, success: false, error: msg });
        errors.push(`${ticker}: ${msg}`);
        onAssetDone?.({ type: "price_error", assetId, ticker, error: msg });
      }
    }

    // --- EOD prices for funds + stock fallbacks (parallel with concurrency limit) ---
    const eodAssets = assetsToFetch.filter(
      (a) => fundTickerSet.has(a.ticker) || eodFallbackSet.has(a.ticker)
    );

    const CONCURRENCY = 5;
    for (let i = 0; i < eodAssets.length; i += CONCURRENCY) {
      const batch = eodAssets.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async ({ assetId, ticker }) => {
          const prices = await fetchHistoricalPrices(ticker, {
            apiKey: settings.eodhdApiKey,
          });

          if (!prices || prices.length === 0) {
            throw new Error("No price data");
          }

          const latestPrice = prices[prices.length - 1];
          const priceDate = parseEODHDDate(latestPrice.date);

          await persistAssetPrice(
            {
              assetId,
              ticker,
              close: latestPrice.close,
              open: latestPrice.open,
              high: latestPrice.high,
              low: latestPrice.low,
              volume: latestPrice.volume || 0,
              priceDate,
            },
            settings.priceCacheDurationMin
          );

          return { assetId, ticker, price: latestPrice.close };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const { assetId, ticker } = batch[j];

        if (result.status === "fulfilled") {
          updated++;
          results.push({ ticker, success: true, price: result.value.price });
          onAssetDone?.({ type: "price_updated", assetId, ticker });
        } else {
          const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          results.push({ ticker, success: false, error: msg });
          errors.push(`${ticker}: ${msg}`);
          onAssetDone?.({ type: "price_error", assetId, ticker, error: msg });
        }
      }
    }
  }

  onAssetDone?.({ type: "done", updated, errors: errors.length });

  return {
    success: errors.length === 0,
    updated,
    fromCache,
    errors,
    results,
  };
}

// ---------------------------------------------------------------------------
// Historical backfill
// ---------------------------------------------------------------------------

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
      apiKey: settings.eodhdApiKey,
    });

    if (!prices || prices.length === 0) {
      return { success: false, count: 0, error: "No historical data available" };
    }

    await storeHistoricalPrices(assetId, prices);

    // Update cache with latest
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

// ---------------------------------------------------------------------------
// Full refresh (background via after())
// ---------------------------------------------------------------------------

export async function refreshAllData(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<void> {
  await refreshAllPrices(userId, { resolveIsins: true, forceRefresh: options?.forceRefresh });

  revalidatePath("/");
  revalidatePath("/portfolio", "layout");

  await backfillAllHistoricalPrices(userId);
}

// ---------------------------------------------------------------------------
// Price queries
// ---------------------------------------------------------------------------

export async function getPriceHistory(
  assetId: string,
  options?: { from?: Date; to?: Date; limit?: number }
): Promise<{ date: Date; close: number; open?: number; high?: number; low?: number }[]> {
  const where: { assetId: string; date?: { gte?: Date; lte?: Date } } = { assetId };

  if (options?.from || options?.to) {
    where.date = {};
    if (options.from) where.date.gte = options.from;
    if (options.to) where.date.lte = options.to;
  }

  const prices = await db.price.findMany({
    where,
    orderBy: { date: "asc" },
    take: options?.limit,
  });

  return prices.map((p) => ({
    date: p.date,
    close: Number(p.close),
    open: p.open ? Number(p.open) : undefined,
    high: p.high ? Number(p.high) : undefined,
    low: p.low ? Number(p.low) : undefined,
  }));
}

export async function getLatestPrice(
  assetId: string
): Promise<{ price: number; date: Date } | null> {
  const price = await db.price.findFirst({
    where: { assetId },
    orderBy: { date: "desc" },
  });

  if (!price) return null;
  return { price: Number(price.close), date: price.date };
}

// ---------------------------------------------------------------------------
// Cache cleanup
// ---------------------------------------------------------------------------

export async function clearExpiredCache(): Promise<number> {
  const result = await db.priceCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

// ---------------------------------------------------------------------------
// Ticker resolution
// ---------------------------------------------------------------------------

export async function resolveAssetTicker(
  userId: string,
  assetId: string,
  isin: string
): Promise<string | null> {
  const settings = await getSettings(userId);

  try {
    const resolved = await resolveIsinToSymbol(isin, {
      apiKey: settings.eodhdApiKey,
    });

    if (resolved) {
      const updateData: { ticker: string; name?: string } = {
        ticker: resolved.symbol,
      };

      if (resolved.name) {
        // Only update name if the current name matches the ISIN (i.e. no user-provided name)
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (asset && asset.name === asset.isin) {
          updateData.name = resolved.name;
        }
      }

      await db.asset.update({
        where: { id: assetId },
        data: updateData,
      });
      return resolved.symbol;
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveAllMissingTickers(userId: string): Promise<{
  resolved: number;
  failed: number;
  results: Array<{ isin: string; ticker: string | null; error?: string }>;
}> {
  const assetsWithoutTickers = await db.asset.findMany({
    where: { userId, ticker: null, isActive: true },
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
