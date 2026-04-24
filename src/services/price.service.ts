/**
 * Price service barrel.
 *
 * The implementation is split across focused modules under `./price/`:
 *   - cache.ts           — PriceCache reads/cleanup
 *   - fetcher.ts         — single-asset + batch refresh against EODHD
 *   - backfill.ts        — historical backfill
 *   - queries.ts         — read-side Price queries
 *   - ticker-resolver.ts — ISIN → symbol resolution
 *   - internal.ts        — shared helpers (persist, expiration, etc.)
 *
 * Public API is re-exported here so callers can keep importing from
 * `@/services/price.service`.
 */

import { revalidatePath } from "next/cache";
import { refreshAllPrices } from "./price/fetcher";
import { backfillAllHistoricalPrices } from "./price/backfill";

export { getCachedPrices, clearExpiredCache } from "./price/cache";
export { refreshAssetPrice, refreshAllPrices } from "./price/fetcher";
export {
  backfillHistoricalPrices,
  backfillAllHistoricalPrices,
} from "./price/backfill";
export { getPriceHistory, getLatestPrice } from "./price/queries";
export {
  resolveAssetTicker,
  resolveAllMissingTickers,
} from "./price/ticker-resolver";

/**
 * Full refresh orchestrator. Runs a price refresh (with ISIN resolution),
 * revalidates portfolio surfaces, then backfills historical prices in the
 * background. Invoked from the `/api/prices/refresh` route via `after()`.
 */
export async function refreshAllData(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<void> {
  await refreshAllPrices(userId, {
    resolveIsins: true,
    forceRefresh: options?.forceRefresh,
  });

  revalidatePath("/");
  revalidatePath("/portfolio", "layout");

  await backfillAllHistoricalPrices(userId);
}
