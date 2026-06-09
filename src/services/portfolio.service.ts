// Investments domain: holdings aggregation and value history.
// This service never touches the wallet or real-estate domains.

import { db } from "@/lib/db";
import { scopedDb } from "@/lib/scoped-db";
import type { PortfolioSummary, Holding, CategoryTotal } from "@/types/portfolio";
import type { Prisma, TransactionType } from "@prisma/client";

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
 * Fetches all holdings for a user, grouped by asset class
 */
export async function getPortfolioData(userId: string): Promise<PortfolioSummary> {
  const dbHoldings = await scopedDb(userId).holding.findMany({
    where: {
      shares: { gt: 0 },
    },
    include: holdingInclude,
  });

  const holdings: Holding[] = dbHoldings.map(mapDbHoldingToDto);

  // Sort by market value descending
  const sortByValue = (a: Holding, b: Holding) => b.marketValue - a.marketValue;

  // Group by asset class and sort each group
  const funds = holdings.filter((h) => h.category === "FUND").sort(sortByValue);
  const etfs = holdings.filter((h) => h.category === "ETF").sort(sortByValue);
  const stocks = holdings.filter((h) => h.category === "STOCK").sort(sortByValue);
  const pensions = holdings.filter((h) => h.category === "PENSION").sort(sortByValue);

  return {
    holdings: { funds, etfs, stocks, pensions },
    totals: {
      funds: calculateCategoryTotal(funds),
      etfs: calculateCategoryTotal(etfs),
      stocks: calculateCategoryTotal(stocks),
      pensions: calculateCategoryTotal(pensions),
      total: calculateCategoryTotal(holdings),
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
 * Read-only summary of the investments domain, for cross-domain aggregation
 * (dashboard). Exposes totals only — no entities leak out.
 */
export async function getInvestmentsSummary(userId: string): Promise<{
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  holdingsCount: number;
}> {
  const data = await getPortfolioData(userId);
  const total = data.totals.total;
  const holdingsCount =
    data.holdings.funds.length +
    data.holdings.etfs.length +
    data.holdings.stocks.length +
    data.holdings.pensions.length;

  return {
    marketValue: total?.marketValue ?? 0,
    costBasis: total?.costBasis ?? 0,
    gainLoss: total?.gainLoss ?? 0,
    gainLossPercent: total?.gainLossPercent ?? 0,
    holdingsCount,
  };
}

/**
 * Gets a single holding by holding ID for a user
 */
export async function getHoldingById(userId: string, holdingId: string): Promise<Holding | null> {
  const dbHolding = await scopedDb(userId).holding.findFirst({
    where: { id: holdingId },
    include: holdingInclude,
  });

  if (!dbHolding) return null;

  return mapDbHoldingToDto(dbHolding);
}

/**
 * Gets transactions for a specific asset belonging to a user
 */
export async function getAssetTransactions(userId: string, assetId: string) {
  const transactions = await scopedDb(userId).transaction.findMany({
    where: { assetId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
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
  // 1. Fetch all data upfront (3 queries). Transactions and assets are
  // user-scoped automatically; Price is a global table so it stays on the raw
  // client and is scoped via its `asset` relation.
  const sdb = scopedDb(userId);
  const [transactions, assets, prices] = await Promise.all([
    sdb.transaction.findMany({
      orderBy: { date: "asc" },
      select: { assetId: true, type: true, date: true, shares: true, totalAmount: true },
    }),
    sdb.asset.findMany({
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

  // 4. Pre-process transactions into a date-indexed structure. Transaction
  // dates are also folded into the date grid so the series starts at the first
  // transaction rather than the first price date — holdings held before any
  // price exists are valued at cost basis (handled in step 5), which avoids a
  // phantom vertical jump on the first day with price data.
  type TxnEntry = { assetId: string; type: TransactionType; shares: number; totalAmount: number };
  const txnsByDate = new Map<string, TxnEntry[]>();
  for (const t of transactions) {
    const dateStr = t.date.toISOString().split("T")[0];
    dateSet.add(dateStr);
    if (!txnsByDate.has(dateStr)) {
      txnsByDate.set(dateStr, []);
    }
    txnsByDate.get(dateStr)!.push({
      assetId: t.assetId,
      type: t.type,
      shares: Number(t.shares),
      totalAmount: Number(t.totalAmount),
    });
  }

  const sortedDates = Array.from(dateSet).sort();

  // 5. Walk through dates computing portfolio value
  const sharesMap = new Map<string, number>(); // assetId → cumulative shares
  const costBasisMap = new Map<string, number>(); // assetId → historical costBasis
  const lastKnownPrice = new Map<string, number>(); // assetId → last known close
  let inTransit = 0; // Tracks value between TRANSFER_OUT and TRANSFER_IN
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
        if (txn.type === "BUY" || txn.type === "TRANSFER_IN") {
          sharesMap.set(txn.assetId, currentShares + txn.shares);
          costBasisMap.set(txn.assetId, currentCost + txn.totalAmount);
          if (txn.type === "TRANSFER_IN") {
            inTransit = Math.max(0, inTransit - txn.totalAmount);
          }
        } else if (txn.type === "SELL" || txn.type === "TRANSFER_OUT") {
          const avgCost = currentShares > 0 ? currentCost / currentShares : 0;
          const newShares = currentShares - txn.shares;
          sharesMap.set(txn.assetId, newShares);
          costBasisMap.set(txn.assetId, newShares > 0 ? newShares * avgCost : 0);
          if (txn.type === "TRANSFER_OUT") {
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
