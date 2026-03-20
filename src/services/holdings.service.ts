import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";

interface CostBasisLot {
  shares: Decimal;
  pricePerShare: Decimal;
  date: Date;
}

interface FifoRemovalResult {
  costBasisRemoved: Decimal;
  sharesRemoved: Decimal;
}

/**
 * Remove shares from lots using FIFO method
 * Mutates the lots array in place
 * @returns The cost basis of removed shares
 */
function removeFifoShares(
  lots: CostBasisLot[],
  sharesToRemove: Decimal
): FifoRemovalResult {
  let costBasisRemoved = new Decimal(0);
  let sharesRemoved = new Decimal(0);
  let remaining = sharesToRemove;

  while (remaining.greaterThan(0) && lots.length > 0) {
    const oldestLot = lots[0];

    if (oldestLot.shares.lessThanOrEqualTo(remaining)) {
      // Remove entire lot
      remaining = remaining.minus(oldestLot.shares);
      costBasisRemoved = costBasisRemoved.plus(
        oldestLot.shares.times(oldestLot.pricePerShare)
      );
      sharesRemoved = sharesRemoved.plus(oldestLot.shares);
      lots.shift();
    } else {
      // Partial lot removal
      costBasisRemoved = costBasisRemoved.plus(
        remaining.times(oldestLot.pricePerShare)
      );
      sharesRemoved = sharesRemoved.plus(remaining);
      oldestLot.shares = oldestLot.shares.minus(remaining);
      remaining = new Decimal(0);
    }
  }

  return { costBasisRemoved, sharesRemoved };
}

/**
 * Add shares to lots
 */
function addToLots(
  lots: CostBasisLot[],
  shares: Decimal,
  pricePerShare: Decimal,
  date: Date
): void {
  lots.push({ shares, pricePerShare, date });
}

/**
 * Recalculates holdings for a specific asset using FIFO method
 * FIFO: First In, First Out - oldest shares are sold first
 */
export async function recalculateHolding(assetId: string): Promise<void> {
  // Get all transactions for this asset, ordered by date
  const transactions = await db.transaction.findMany({
    where: { assetId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Initialize cost basis lots (for FIFO tracking)
  const lots: CostBasisLot[] = [];
  let totalShares = new Decimal(0);
  let totalCostBasis = new Decimal(0);

  for (const txn of transactions) {
    const shares = txn.shares;
    const pricePerShare = txn.pricePerShare || new Decimal(0);

    switch (txn.type) {
      case "BUY":
      case "TRANSFER": {
        if (txn.type === "TRANSFER" && txn.transferType === "OUT") {
          // Transfer out - remove shares using FIFO
          const { costBasisRemoved } = removeFifoShares(lots, shares);
          totalCostBasis = totalCostBasis.minus(costBasisRemoved);
          totalShares = totalShares.minus(shares);
        } else {
          // BUY or TRANSFER IN - add to lots
          addToLots(lots, shares, pricePerShare, txn.date);
          totalShares = totalShares.plus(shares);
          totalCostBasis = totalCostBasis.plus(shares.times(pricePerShare));
        }
        break;
      }

      case "SELL": {
        // FIFO: remove shares from oldest lots first
        const { costBasisRemoved } = removeFifoShares(lots, shares);
        totalCostBasis = totalCostBasis.minus(costBasisRemoved);
        totalShares = totalShares.minus(shares);
        break;
      }

      case "DIVIDEND":
      case "FEE":
        // These don't affect share count or cost basis
        break;
    }
  }

  // Ensure non-negative values
  totalShares = Decimal.max(totalShares, new Decimal(0));
  totalCostBasis = Decimal.max(totalCostBasis, new Decimal(0));

  // Calculate average price
  const avgPrice = totalShares.greaterThan(0)
    ? totalCostBasis.div(totalShares)
    : new Decimal(0);

  // Upsert the holding record
  await db.holding.upsert({
    where: { assetId },
    update: {
      shares: totalShares,
      costBasis: totalCostBasis,
      avgPrice,
      lastCalculatedAt: new Date(),
    },
    create: {
      assetId,
      shares: totalShares,
      costBasis: totalCostBasis,
      avgPrice,
    },
  });

  // Delete holding if no shares remaining
  if (totalShares.equals(0)) {
    await db.holding.delete({ where: { assetId } }).catch(() => {
      // Ignore if holding doesn't exist
    });
  }
}

/**
 * Recalculates holdings for all assets
 */
export async function recalculateAllHoldings(): Promise<{
  recalculated: number;
  errors: string[];
}> {
  // Get all unique asset IDs from transactions
  const assetIds = await db.transaction.groupBy({
    by: ["assetId"],
  });

  let recalculated = 0;
  const errors: string[] = [];

  for (const { assetId } of assetIds) {
    try {
      await recalculateHolding(assetId);
      recalculated++;
    } catch (error) {
      errors.push(
        `Failed to recalculate ${assetId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return { recalculated, errors };
}

/**
 * Updates market value and unrealized gains for a holding
 */
export async function updateHoldingMarketValue(
  assetId: string,
  currentPrice: Decimal
): Promise<void> {
  const holding = await db.holding.findUnique({ where: { assetId } });

  if (!holding || holding.shares.equals(0)) {
    return;
  }

  const marketValue = holding.shares.times(currentPrice);
  const unrealizedGain = marketValue.minus(holding.costBasis);

  await db.holding.update({
    where: { assetId },
    data: {
      marketValue,
      unrealizedGain,
    },
  });
}

/**
 * Gets holding summary for an asset
 */
export async function getHoldingSummary(assetId: string) {
  const holding = await db.holding.findUnique({
    where: { assetId },
    include: { asset: true },
  });

  if (!holding) {
    return null;
  }

  const unrealizedGainPercent =
    holding.costBasis.greaterThan(0) && holding.unrealizedGain
      ? holding.unrealizedGain.div(holding.costBasis).times(100)
      : null;

  return {
    ...holding,
    unrealizedGainPercent,
  };
}
