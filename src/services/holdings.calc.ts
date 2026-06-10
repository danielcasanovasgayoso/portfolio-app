// Pure FIFO cost-basis math for a single asset's holding.
//
// This module deliberately has no database or framework dependencies so the
// financial logic can be unit-tested in isolation and reused inside DB
// transactions. Persistence lives in holdings.service.ts.

import { Decimal } from "@prisma/client/runtime/client";
import type { TransactionType } from "@prisma/client";

/** Minimal transaction shape required to compute a holding. */
export interface HoldingTransaction {
  type: TransactionType;
  shares: Decimal;
  pricePerShare: Decimal | null;
}

/** Aggregated holding result derived from a transaction history. */
export interface HoldingTotals {
  totalShares: Decimal;
  totalCostBasis: Decimal;
  avgPrice: Decimal;
}

interface CostBasisLot {
  shares: Decimal;
  pricePerShare: Decimal;
}

interface FifoRemovalResult {
  costBasisRemoved: Decimal;
  sharesRemoved: Decimal;
}

/**
 * Remove shares from lots using FIFO (oldest first). Mutates `lots` in place.
 * @returns The cost basis and number of shares actually removed.
 */
export function removeFifoShares(
  lots: CostBasisLot[],
  sharesToRemove: Decimal
): FifoRemovalResult {
  let costBasisRemoved = new Decimal(0);
  let sharesRemoved = new Decimal(0);
  let remaining = sharesToRemove;

  while (remaining.greaterThan(0) && lots.length > 0) {
    const oldestLot = lots[0];

    if (oldestLot.shares.lessThanOrEqualTo(remaining)) {
      // Consume the entire lot.
      remaining = remaining.minus(oldestLot.shares);
      costBasisRemoved = costBasisRemoved.plus(
        oldestLot.shares.times(oldestLot.pricePerShare)
      );
      sharesRemoved = sharesRemoved.plus(oldestLot.shares);
      lots.shift();
    } else {
      // Partially consume the oldest lot.
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
 * Computes total shares, cost basis and average price for an asset using the
 * FIFO method (first in, first out — oldest shares are sold first).
 *
 * Transactions MUST be provided in chronological processing order
 * (date ascending, then createdAt ascending) — the caller is responsible for
 * ordering, mirroring how lots are consumed in real life.
 *
 * - BUY / TRANSFER_IN   → add a lot
 * - SELL / TRANSFER_OUT → remove shares from the oldest lots
 * - DIVIDEND / FEE      → no effect on shares or cost basis
 *
 * Results are clamped to non-negative values to guard against histories that
 * sell more shares than were ever bought.
 */
export function computeHolding(
  transactions: HoldingTransaction[]
): HoldingTotals {
  const lots: CostBasisLot[] = [];
  let totalShares = new Decimal(0);
  let totalCostBasis = new Decimal(0);

  for (const txn of transactions) {
    const shares = txn.shares;
    const pricePerShare = txn.pricePerShare ?? new Decimal(0);

    switch (txn.type) {
      case "BUY":
      case "TRANSFER_IN": {
        lots.push({ shares, pricePerShare });
        totalShares = totalShares.plus(shares);
        totalCostBasis = totalCostBasis.plus(shares.times(pricePerShare));
        break;
      }

      case "SELL":
      case "TRANSFER_OUT": {
        const { costBasisRemoved } = removeFifoShares(lots, shares);
        totalCostBasis = totalCostBasis.minus(costBasisRemoved);
        totalShares = totalShares.minus(shares);
        break;
      }

      case "DIVIDEND":
      case "FEE":
        // No effect on share count or cost basis.
        break;
    }
  }

  totalShares = Decimal.max(totalShares, new Decimal(0));
  totalCostBasis = Decimal.max(totalCostBasis, new Decimal(0));

  const avgPrice = totalShares.greaterThan(0)
    ? totalCostBasis.div(totalShares)
    : new Decimal(0);

  return { totalShares, totalCostBasis, avgPrice };
}
