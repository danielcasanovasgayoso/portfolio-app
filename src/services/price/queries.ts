import { db } from "@/lib/db";

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
