import { db } from "@/lib/db";
import {
  fetchHistoricalPrices,
  fetchRealTimePrice,
  fetchBatchRealTimePrices,
  parseEODHDDate,
  isFundTicker,
} from "@/lib/eodhd";
import { Decimal } from "@prisma/client/runtime/client";
import { updateHoldingMarketValue } from "../holdings.service";
import { getSettings } from "../settings.service";
import type { SSEEvent } from "@/types/price-refresh";
import {
  getActiveTradedAssets,
  persistAssetPrice,
  todayDate,
  type PriceUpdateResult,
  type RefreshPricesResult,
  type TradedAsset,
} from "./internal";
import { getCachedPrices } from "./cache";
import { resolveAssetTicker } from "./ticker-resolver";

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

    // Fallback to EOD historical prices
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

  if (options?.resolveIsins) {
    const holdingsNeedingResolution = await db.holding.findMany({
      where: { userId, shares: { gt: 0 }, asset: { manualPricing: false } },
      include: { asset: true },
    });
    for (const holding of holdingsNeedingResolution) {
      const asset = holding.asset;
      if (!asset.ticker || asset.name === asset.isin) {
        await resolveAssetTicker(userId, holding.assetId, asset.isin);
      }
    }
  }

  const assetsWithTickers = await getActiveTradedAssets(userId);

  if (assetsWithTickers.length === 0) {
    onAssetDone?.({ type: "done", updated: 0, errors: 0 });
    return { success: true, updated: 0, fromCache: 0, errors: [], results: [] };
  }

  const tickers = assetsWithTickers.map((a) => a.ticker);

  const cached = options?.forceRefresh
    ? new Map<string, { price: Decimal; date: Date; isValid: boolean }>()
    : await getCachedPrices(tickers);

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

  if (tickersToFetchSet.size > 0) {
    const assetsToFetch = assetsWithTickers.filter((a) => tickersToFetchSet.has(a.ticker));

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

    onAssetDone?.({ type: "start", total: assetsToFetch.length });

    let freshPrices = new Map<
      string,
      { open: number; high: number; low: number; close: number; volume: number; timestamp: number }
    >();
    if (stockTickerSet.size > 0) {
      try {
        freshPrices = await fetchBatchRealTimePrices([...stockTickerSet], {
          apiKey: settings.eodhdApiKey,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Batch fetch failed: ${msg}`);
        for (const t of stockTickerSet) eodFallbackSet.add(t);
      }
    }

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

    // EOD prices for funds + stock fallbacks (parallel with concurrency limit)
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
          const msg =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
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
