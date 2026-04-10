import { db } from "@/lib/db";
import type { PortfolioSummary, Holding, CategoryTotal } from "@/types/portfolio";
import type { Prisma, TransactionType, TransferType } from "@prisma/client";

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

/**
 * Computes historical portfolio net worth from transaction history + price history.
 * Returns data points compatible with PriceChart: { date: string, close: number }[]
 */
export async function getPortfolioValueHistory(
  userId: string
): Promise<{ date: string; close: number }[]> {
  // 1. Fetch all data upfront (3 queries)
  const [transactions, assets, prices] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { assetId: true, type: true, date: true, shares: true, transferType: true, totalAmount: true },
    }),
    db.asset.findMany({
      where: { userId },
      select: { id: true, manualPricing: true },
    }),
    db.price.findMany({
      where: {
        asset: { userId },
      },
      orderBy: { date: "asc" },
      select: { assetId: true, date: true, close: true },
    }),
  ]);

  if (prices.length === 0) return [];

  // 2. Build set of manual asset IDs (from ALL assets, not just current holdings)
  const manualAssetIds = new Set<string>();
  for (const a of assets) {
    if (a.manualPricing) manualAssetIds.add(a.id);
  }

  // 3. Build prices by date: dateStr → Map<assetId, close>
  const dateSet = new Set<string>();
  const priceMap = new Map<string, Map<string, number>>();

  for (const p of prices) {
    const dateStr = p.date.toISOString().split("T")[0];
    dateSet.add(dateStr);
    if (!priceMap.has(dateStr)) {
      priceMap.set(dateStr, new Map());
    }
    priceMap.get(dateStr)!.set(p.assetId, Number(p.close));
  }

  const sortedDates = Array.from(dateSet).sort();

  // 4. Pre-process transactions into a date-indexed structure
  type TxnEntry = { assetId: string; type: TransactionType; shares: number; transferType: TransferType | null; totalAmount: number };
  const txnsByDate = new Map<string, TxnEntry[]>();
  for (const t of transactions) {
    const dateStr = t.date.toISOString().split("T")[0];
    if (!txnsByDate.has(dateStr)) {
      txnsByDate.set(dateStr, []);
    }
    txnsByDate.get(dateStr)!.push({
      assetId: t.assetId,
      type: t.type,
      shares: Number(t.shares),
      transferType: t.transferType,
      totalAmount: Number(t.totalAmount),
    });
  }

  // 5. Walk through dates computing portfolio value
  const sharesMap = new Map<string, number>(); // assetId → cumulative shares
  const costBasisMap = new Map<string, number>(); // assetId → historical costBasis
  const lastKnownPrice = new Map<string, number>(); // assetId → last known close
  let inTransit = 0; // Tracks value between TRANSFER OUT and TRANSFER IN
  const result: { date: string; close: number }[] = [];

  // Collect all txn dates <= current price date
  const allTxnDates = Array.from(txnsByDate.keys()).sort();
  let txnDateIdx = 0;

  for (const dateStr of sortedDates) {
    // Apply all transactions up to and including this date
    while (txnDateIdx < allTxnDates.length && allTxnDates[txnDateIdx] <= dateStr) {
      const dayTxns = txnsByDate.get(allTxnDates[txnDateIdx])!;
      for (const txn of dayTxns) {
        const currentShares = sharesMap.get(txn.assetId) || 0;
        const currentCost = costBasisMap.get(txn.assetId) || 0;
        if (txn.type === "BUY" || (txn.type === "TRANSFER" && txn.transferType === "IN")) {
          sharesMap.set(txn.assetId, currentShares + txn.shares);
          costBasisMap.set(txn.assetId, currentCost + txn.totalAmount);
          if (txn.type === "TRANSFER") {
            inTransit = Math.max(0, inTransit - txn.totalAmount);
          }
        } else if (txn.type === "SELL" || (txn.type === "TRANSFER" && txn.transferType === "OUT")) {
          const avgCost = currentShares > 0 ? currentCost / currentShares : 0;
          const newShares = currentShares - txn.shares;
          sharesMap.set(txn.assetId, newShares);
          costBasisMap.set(txn.assetId, newShares > 0 ? newShares * avgCost : 0);
          if (txn.type === "TRANSFER") {
            inTransit += txn.totalAmount;
          }
        }
        // DIVIDEND and FEE don't change shares
      }
      txnDateIdx++;
    }

    // Update last known prices for this date
    const dayPrices = priceMap.get(dateStr);
    if (dayPrices) {
      for (const [assetId, close] of dayPrices) {
        lastKnownPrice.set(assetId, close);
      }
    }

    // Compute portfolio value
    let totalValue = 0;
    for (const [assetId, shares] of sharesMap) {
      if (shares <= 0) continue;
      if (manualAssetIds.has(assetId)) {
        // Manual assets: use historical costBasis
        totalValue += costBasisMap.get(assetId) ?? 0;
      } else {
        const price = lastKnownPrice.get(assetId);
        if (price) {
          totalValue += shares * price;
        } else {
          // No price data yet for this asset — use historical costBasis as fallback
          totalValue += costBasisMap.get(assetId) ?? 0;
        }
      }
    }

    // Include in-transit value from pending transfers
    totalValue += inTransit;

    result.push({ date: dateStr, close: Math.round(totalValue * 100) / 100 });
  }

  return result;
}
