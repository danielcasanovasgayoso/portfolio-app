import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";
import type { Prisma } from "@prisma/client";
import { computeHolding } from "./holdings.calc";

// Either the root client or an interactive-transaction client. Accepting both
// lets callers run a recalculation inside a larger transaction (so a write and
// its holding update commit or roll back together).
type PrismaClientOrTx = typeof db | Prisma.TransactionClient;

/**
 * Reads an asset's transactions, recomputes its holding via FIFO, and persists
 * the result using the provided client. Assumes it is already running inside a
 * transaction (no nested transaction is opened here).
 */
async function persistHolding(
  client: PrismaClientOrTx,
  userId: string,
  assetId: string
): Promise<void> {
  // Ordered chronologically so FIFO lots are consumed oldest-first.
  const transactions = await client.transaction.findMany({
    where: { userId, assetId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const { totalShares, totalCostBasis, avgPrice } = computeHolding(transactions);

  if (totalShares.equals(0)) {
    await client.holding.deleteMany({ where: { assetId } });
    return;
  }

  await client.holding.upsert({
    where: { assetId },
    update: {
      shares: totalShares,
      costBasis: totalCostBasis,
      avgPrice,
      lastCalculatedAt: new Date(),
    },
    create: {
      userId,
      assetId,
      shares: totalShares,
      costBasis: totalCostBasis,
      avgPrice,
    },
  });
}

/**
 * Recalculates the holding for a specific asset using the FIFO method.
 *
 * When `client` is supplied (an interactive-transaction client), the work joins
 * that transaction so the triggering write and the holding update are atomic.
 * When omitted, a dedicated transaction is opened — this also keeps the
 * upsert/zero-shares cleanup atomic so the holding never momentarily lingers as
 * a zero-shares row visible to concurrent readers.
 */
export async function recalculateHolding(
  userId: string,
  assetId: string,
  client?: Prisma.TransactionClient
): Promise<void> {
  if (client) {
    await persistHolding(client, userId, assetId);
    return;
  }

  await db.$transaction((tx) => persistHolding(tx, userId, assetId));
}

/**
 * Recalculates holdings for all assets belonging to a user
 */
export async function recalculateAllHoldings(userId: string): Promise<{
  recalculated: number;
  errors: string[];
}> {
  // Get all unique asset IDs from user's transactions
  const assetIds = await db.transaction.groupBy({
    by: ["assetId"],
    where: { userId },
  });

  let recalculated = 0;
  const errors: string[] = [];

  for (const { assetId } of assetIds) {
    try {
      await recalculateHolding(userId, assetId);
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
export async function getHoldingSummary(userId: string, assetId: string) {
  const holding = await db.holding.findFirst({
    where: { userId, assetId },
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
