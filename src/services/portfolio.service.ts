import { db } from "@/lib/db";
import type { PortfolioSummary, Holding, CategoryTotal } from "@/types/portfolio";
import type { Prisma } from "@prisma/client";

/** Prisma return type for a holding with asset + latest price */
type DbHoldingWithAsset = Prisma.HoldingGetPayload<{
  include: { asset: { include: { prices: true } } };
}>;

/** Shared include clause for holding queries */
const holdingInclude = {
  asset: {
    include: {
      prices: {
        orderBy: { date: "desc" as const },
        take: 1,
      },
    },
  },
} as const;

/**
 * Maps a Prisma holding row to the Holding DTO
 */
function mapDbHoldingToDto(h: DbHoldingWithAsset): Holding {
  const latestPrice = h.asset.prices[0];
  const currentPrice = latestPrice?.close ? Number(latestPrice.close) : null;
  const shares = Number(h.shares);
  const costBasis = Number(h.costBasis);
  const avgPrice = Number(h.avgPrice);
  const isManual = h.asset.manualPricing;
  const marketValue = isManual ? costBasis : (currentPrice ? shares * currentPrice : costBasis);
  const gainLoss = marketValue - costBasis;
  const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;

  return {
    id: h.id,
    assetId: h.assetId,
    name: h.asset.name,
    isin: h.asset.isin,
    ticker: h.asset.ticker ?? null,
    category: h.asset.category,
    shares,
    costBasis,
    avgPrice,
    currentPrice: isManual ? costBasis : currentPrice,
    priceDate: latestPrice?.date?.toISOString().split("T")[0] || null,
    marketValue,
    gainLoss,
    gainLossPercent,
    manualPricing: isManual,
  };
}

/**
 * Fetches all holdings for a user and formats them for the portfolio view
 */
export async function getPortfolioData(userId: string): Promise<PortfolioSummary> {
  const dbHoldings = await db.holding.findMany({
    where: {
      userId,
      shares: { gt: 0 },
    },
    include: holdingInclude,
  });

  const holdings: Holding[] = dbHoldings.map(mapDbHoldingToDto);

  // Sort by market value descending
  const sortByValue = (a: Holding, b: Holding) => b.marketValue - a.marketValue;

  // Group by category and sort each group
  const funds = holdings.filter((h) => h.category === "FUNDS").sort(sortByValue);
  const stocks = holdings.filter((h) => h.category === "STOCKS").sort(sortByValue);
  const pp = holdings.filter((h) => h.category === "PP").sort(sortByValue);
  const others = holdings.filter((h) => h.category === "OTHERS").sort(sortByValue);

  // Calculate totals
  const fundsTotals = calculateCategoryTotal(funds);
  const stocksTotals = calculateCategoryTotal(stocks);
  const ppTotals = calculateCategoryTotal(pp);
  const othersTotals = calculateCategoryTotal(others);

  // Invested = funds + stocks + pp (not others like cash)
  const investedHoldings = [...funds, ...stocks, ...pp];
  const investedTotals = calculateCategoryTotal(investedHoldings);

  // Grand = all including others
  const grandTotals = calculateCategoryTotal(holdings);

  return {
    holdings: { funds, stocks, pp, others },
    totals: {
      funds: fundsTotals,
      stocks: stocksTotals,
      pp: ppTotals,
      others: othersTotals,
      invested: investedTotals,
      grand: grandTotals,
    },
  };
}

function calculateCategoryTotal(holdings: Holding[]): CategoryTotal | null {
  if (holdings.length === 0) return null;

  const costBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const marketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const gainLoss = marketValue - costBasis;
  const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;

  return { costBasis, marketValue, gainLoss, gainLossPercent };
}

/**
 * Gets a single holding by holding ID for a user
 */
export async function getHoldingById(userId: string, holdingId: string): Promise<Holding | null> {
  const dbHolding = await db.holding.findFirst({
    where: { id: holdingId, userId },
    include: holdingInclude,
  });

  if (!dbHolding) return null;

  return mapDbHoldingToDto(dbHolding);
}

/**
 * Gets transactions for a specific asset belonging to a user
 */
export async function getAssetTransactions(userId: string, assetId: string) {
  const transactions = await db.transaction.findMany({
    where: { userId, assetId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    transferType: t.transferType,
    date: t.date.toISOString().split("T")[0],
    shares: Number(t.shares),
    pricePerShare: t.pricePerShare ? Number(t.pricePerShare) : null,
    totalAmount: Number(t.totalAmount),
    fees: t.fees ? Number(t.fees) : 0,
  }));
}
