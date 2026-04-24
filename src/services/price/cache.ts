import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";
import { isCacheValid } from "./internal";

export async function getCachedPrices(
  tickers: string[]
): Promise<Map<string, { price: Decimal; date: Date; isValid: boolean }>> {
  const cached = await db.priceCache.findMany({
    where: { ticker: { in: tickers } },
  });

  const result = new Map<string, { price: Decimal; date: Date; isValid: boolean }>();
  for (const entry of cached) {
    result.set(entry.ticker, {
      price: entry.latestPrice,
      date: entry.priceDate,
      isValid: isCacheValid(entry.expiresAt),
    });
  }
  return result;
}

export async function clearExpiredCache(): Promise<number> {
  const result = await db.priceCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
