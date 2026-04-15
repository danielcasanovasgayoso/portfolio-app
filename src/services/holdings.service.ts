import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";

/**
 * A FIFO cost-basis lot. For Spanish tax-deferred fund transfers (*traspasos*),
 * both `pricePerShare` and `date` are preserved across transfers so the
 * destination holding reports the original fiscal cost basis and acquisition date.
 */
interface CostBasisLot {
  shares: Decimal;
  pricePerShare: Decimal;
  date: Date;
}

interface FifoDetachResult {
  detachedLots: CostBasisLot[];
  costBasisRemoved: Decimal;
  sharesRemoved: Decimal;
}

/**
 * Detach (remove) shares from lots using FIFO method.
 * Mutates the lots array in place.
 * Returns the detached lots (preserving their original pricePerShare/date)
 * so callers can splice them into another holding (fund transfer case).
 */
function detachFifoLots(
  lots: CostBasisLot[],
  sharesToRemove: Decimal
): FifoDetachResult {
  const detachedLots: CostBasisLot[] = [];
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
      detachedLots.push({
        shares: oldestLot.shares,
        pricePerShare: oldestLot.pricePerShare,
        date: oldestLot.date,
      });
      lots.shift();
    } else {
      // Partial lot removal
      costBasisRemoved = costBasisRemoved.plus(
        remaining.times(oldestLot.pricePerShare)
      );
      sharesRemoved = sharesRemoved.plus(remaining);
      detachedLots.push({
        shares: remaining,
        pricePerShare: oldestLot.pricePerShare,
        date: oldestLot.date,
      });
      oldestLot.shares = oldestLot.shares.minus(remaining);
      remaining = new Decimal(0);
    }
  }

  return { detachedLots, costBasisRemoved, sharesRemoved };
}

/**
 * Attach the given lots to a destination holding, preserving each lot's
 * original pricePerShare and date (for fiscal cost basis carryover).
 * If `destShares` differs from the sum of detachedLots.shares (common due to
 * NAV differences between source and destination fund), the lots are scaled
 * proportionally so total shares equal `destShares` while preserving total
 * cost basis. The per-share fiscal basis on each lot is adjusted so
 * sum(lot.shares * lot.pricePerShare) stays invariant.
 */
function attachCarriedLots(
  destLots: CostBasisLot[],
  detachedLots: CostBasisLot[],
  destShares: Decimal
): { totalCostBasisAdded: Decimal; totalSharesAdded: Decimal } {
  const detachedShareSum = detachedLots.reduce(
    (acc, l) => acc.plus(l.shares),
    new Decimal(0)
  );

  if (detachedShareSum.lessThanOrEqualTo(0) || destShares.lessThanOrEqualTo(0)) {
    return {
      totalCostBasisAdded: new Decimal(0),
      totalSharesAdded: new Decimal(0),
    };
  }

  // Scale factor to map source shares onto dest shares.
  const scale = destShares.div(detachedShareSum);

  let totalSharesAdded = new Decimal(0);
  let totalCostBasisAdded = new Decimal(0);

  for (const lot of detachedLots) {
    const scaledShares = lot.shares.times(scale);
    // Preserve per-lot cost basis by recomputing pricePerShare to keep
    // lot.shares * lot.pricePerShare invariant post-scale.
    const lotCost = lot.shares.times(lot.pricePerShare);
    const scaledPricePerShare = scaledShares.greaterThan(0)
      ? lotCost.div(scaledShares)
      : lot.pricePerShare;

    destLots.push({
      shares: scaledShares,
      pricePerShare: scaledPricePerShare,
      date: lot.date,
    });
    totalSharesAdded = totalSharesAdded.plus(scaledShares);
    totalCostBasisAdded = totalCostBasisAdded.plus(lotCost);
  }

  return { totalCostBasisAdded, totalSharesAdded };
}

/**
 * Add shares to lots as a fresh lot (used for BUY and for unpaired TRANSFER_IN fallback).
 */
function addFreshLot(
  lots: CostBasisLot[],
  shares: Decimal,
  pricePerShare: Decimal,
  date: Date
): void {
  lots.push({ shares, pricePerShare, date });
}

interface InFlightTransfer {
  detachedLots: CostBasisLot[];
  sharesRemoved: Decimal;
  costBasisRemoved: Decimal;
}

interface PendingIn {
  assetId: string;
  shares: Decimal;
  pricePerShare: Decimal;
  date: Date;
}

/**
 * Recalculates holdings for ALL of a user's assets in a single pass, walking
 * transactions chronologically and carrying FIFO lots across assets for paired
 * fund transfers (*traspasos*). Because Spanish traspasos are tax-deferred,
 * the destination fund must inherit the source fund's fiscal cost basis and
 * acquisition dates — not the NAV at transfer time.
 *
 * Unpaired TRANSFER transactions are treated as standalone events (non-fiscal).
 */
export async function recalculateAllHoldings(userId: string): Promise<{
  recalculated: number;
  errors: string[];
}> {
  const transactions = await db.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Per-asset FIFO state
  const lotsByAsset = new Map<string, CostBasisLot[]>();
  const sharesByAsset = new Map<string, Decimal>();
  const costBasisByAsset = new Map<string, Decimal>();
  const touchedAssets = new Set<string>();

  // Paired-transfer state
  const inFlight = new Map<string, InFlightTransfer>(); // OUT seen, awaiting IN
  const pendingIn = new Map<string, PendingIn>(); // IN seen first (rare), awaiting OUT

  const getLots = (assetId: string) => {
    let lots = lotsByAsset.get(assetId);
    if (!lots) {
      lots = [];
      lotsByAsset.set(assetId, lots);
    }
    return lots;
  };
  const addShares = (assetId: string, delta: Decimal) => {
    sharesByAsset.set(
      assetId,
      (sharesByAsset.get(assetId) || new Decimal(0)).plus(delta)
    );
  };
  const addCost = (assetId: string, delta: Decimal) => {
    costBasisByAsset.set(
      assetId,
      (costBasisByAsset.get(assetId) || new Decimal(0)).plus(delta)
    );
  };

  const errors: string[] = [];

  for (const txn of transactions) {
    touchedAssets.add(txn.assetId);
    const shares = txn.shares;
    const pricePerShare = txn.pricePerShare || new Decimal(0);

    switch (txn.type) {
      case "BUY": {
        const lots = getLots(txn.assetId);
        addFreshLot(lots, shares, pricePerShare, txn.date);
        addShares(txn.assetId, shares);
        addCost(txn.assetId, shares.times(pricePerShare));
        break;
      }

      case "SELL": {
        const lots = getLots(txn.assetId);
        const { costBasisRemoved } = detachFifoLots(lots, shares);
        addShares(txn.assetId, shares.negated());
        addCost(txn.assetId, costBasisRemoved.negated());
        break;
      }

      case "TRANSFER": {
        const lots = getLots(txn.assetId);

        if (txn.transferPairId) {
          // Paired transfer — carry fiscal cost basis across the pair.
          if (txn.transferType === "OUT") {
            const pending = pendingIn.get(txn.transferPairId);
            if (pending) {
              // IN arrived first (same day, earlier createdAt). Process OUT then splice into the already-noted IN.
              const detach = detachFifoLots(lots, shares);
              addShares(txn.assetId, shares.negated());
              addCost(txn.assetId, detach.costBasisRemoved.negated());

              const destLots = getLots(pending.assetId);
              const { totalCostBasisAdded, totalSharesAdded } = attachCarriedLots(
                destLots,
                detach.detachedLots,
                pending.shares
              );
              addShares(pending.assetId, totalSharesAdded);
              addCost(pending.assetId, totalCostBasisAdded);
              touchedAssets.add(pending.assetId);
              pendingIn.delete(txn.transferPairId);
            } else {
              // Normal case: OUT seen first. Detach and stash.
              const detach = detachFifoLots(lots, shares);
              addShares(txn.assetId, shares.negated());
              addCost(txn.assetId, detach.costBasisRemoved.negated());
              inFlight.set(txn.transferPairId, {
                detachedLots: detach.detachedLots,
                sharesRemoved: detach.sharesRemoved,
                costBasisRemoved: detach.costBasisRemoved,
              });
            }
          } else if (txn.transferType === "IN") {
            const inFlightEntry = inFlight.get(txn.transferPairId);
            if (inFlightEntry) {
              // Splice detached lots onto this asset at `shares` destination count.
              const { totalCostBasisAdded, totalSharesAdded } = attachCarriedLots(
                lots,
                inFlightEntry.detachedLots,
                shares
              );
              addShares(txn.assetId, totalSharesAdded);
              addCost(txn.assetId, totalCostBasisAdded);
              inFlight.delete(txn.transferPairId);
            } else {
              // IN first — stash and wait for OUT.
              pendingIn.set(txn.transferPairId, {
                assetId: txn.assetId,
                shares,
                pricePerShare,
                date: txn.date,
              });
            }
          }
        } else {
          // Unpaired — handle as standalone event (non-fiscal).
          console.warn(
            `Unpaired TRANSFER transaction ${txn.id} (${txn.transferType}) on asset ${txn.assetId} — cost basis will not carry over.`
          );
          if (txn.transferType === "OUT") {
            const { costBasisRemoved } = detachFifoLots(lots, shares);
            addShares(txn.assetId, shares.negated());
            addCost(txn.assetId, costBasisRemoved.negated());
          } else {
            addFreshLot(lots, shares, pricePerShare, txn.date);
            addShares(txn.assetId, shares);
            addCost(txn.assetId, shares.times(pricePerShare));
          }
        }
        break;
      }

      case "DIVIDEND":
      case "FEE":
        // No share or cost-basis change.
        break;
    }
  }

  // Any still-pending transfers are stray (partner leg missing or mis-paired).
  for (const [pairId, pending] of pendingIn) {
    console.warn(
      `Transfer pair ${pairId}: TRANSFER_IN without matching OUT; treating as unpaired.`
    );
    const lots = getLots(pending.assetId);
    addFreshLot(lots, pending.shares, pending.pricePerShare, pending.date);
    addShares(pending.assetId, pending.shares);
    addCost(pending.assetId, pending.shares.times(pending.pricePerShare));
    touchedAssets.add(pending.assetId);
  }
  for (const [pairId, inFlightEntry] of inFlight) {
    console.warn(
      `Transfer pair ${pairId}: TRANSFER_OUT without matching IN; basis detached but never re-attached.`
    );
    // Lots already detached from source; nothing more to do.
    void inFlightEntry;
  }

  // Upsert holdings for every touched asset.
  let recalculated = 0;
  for (const assetId of touchedAssets) {
    try {
      const rawShares = sharesByAsset.get(assetId) || new Decimal(0);
      const rawCost = costBasisByAsset.get(assetId) || new Decimal(0);
      const totalShares = Decimal.max(rawShares, new Decimal(0));
      const totalCostBasis = Decimal.max(rawCost, new Decimal(0));
      const avgPrice = totalShares.greaterThan(0)
        ? totalCostBasis.div(totalShares)
        : new Decimal(0);

      await db.holding.upsert({
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

      if (totalShares.equals(0)) {
        await db.holding.delete({ where: { assetId } }).catch(() => {
          // Ignore if already deleted.
        });
      }
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
 * Backwards-compatible wrapper. Because fund transfers can move cost basis
 * across assets, a correct fiscal recalc must walk the entire user's history.
 * This wrapper simply triggers the global pass.
 */
export async function recalculateHolding(
  userId: string,
  _assetId: string
): Promise<void> {
  void _assetId;
  await recalculateAllHoldings(userId);
}

/**
 * Updates market value and unrealized gains for a holding.
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
 * Gets holding summary for an asset.
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
