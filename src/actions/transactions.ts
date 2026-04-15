"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import {
  TransactionCreateSchema,
  TransactionUpdateSchema,
  TransactionFiltersSchema,
  type TransactionCreateInput,
  type TransactionFiltersInput,
} from "@/lib/validators";
import { recalculateAllHoldings } from "@/services/holdings.service";
import type { ActionResult } from "@/lib/action-utils";
import type {
  TransactionWithAsset,
  SerializedTransaction,
  PaginatedResult,
} from "@/types/transaction";
import { getUserId } from "@/lib/auth";

// Helper to serialize Decimal and Date fields for client components
function serializeTransaction(
  tx: TransactionWithAsset,
  counterpartAssetId: string | null = null
): SerializedTransaction {
  return {
    ...tx,
    shares: Number(tx.shares),
    pricePerShare: tx.pricePerShare ? Number(tx.pricePerShare) : null,
    totalAmount: Number(tx.totalAmount),
    fees: tx.fees ? Number(tx.fees) : null,
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    counterpartAssetId,
  };
}

// For a set of transactions, build a map from transferPairId -> counterpart assetId
// by looking up the other leg of each pair. Used to pre-fill the transfer source/
// destination field when editing a paired TRANSFER transaction.
async function buildCounterpartAssetMap(
  userId: string,
  transactions: { id: string; transferPairId: string | null }[]
): Promise<Map<string, string>> {
  const pairIds = Array.from(
    new Set(
      transactions
        .map((t) => t.transferPairId)
        .filter((pid): pid is string => !!pid)
    )
  );

  const map = new Map<string, string>();
  if (pairIds.length === 0) return map;

  const ownIds = new Set(transactions.map((t) => t.id));

  const partners = await db.transaction.findMany({
    where: {
      userId,
      transferPairId: { in: pairIds },
    },
    select: { id: true, assetId: true, transferPairId: true },
  });

  for (const partner of partners) {
    if (!partner.transferPairId) continue;
    // Skip rows that are themselves in the result set; we want the OTHER leg.
    if (ownIds.has(partner.id) && map.has(partner.transferPairId)) continue;
    if (!ownIds.has(partner.id)) {
      map.set(partner.transferPairId, partner.assetId);
    }
  }

  return map;
}

// Get paginated transactions with filters
export async function getTransactions(
  filters: TransactionFiltersInput
): Promise<PaginatedResult<SerializedTransaction>> {
  const userId = await getUserId();
  const validated = TransactionFiltersSchema.parse(filters);
  const { types, dateFrom, dateTo, assetId, page, perPage } = validated;

  const where: Prisma.TransactionWhereInput = { userId };

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = dateFrom;
    if (dateTo) where.date.lte = dateTo;
  }

  if (assetId) {
    where.assetId = assetId;
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            isin: true,
            ticker: true,
            category: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.transaction.count({ where }),
  ]);

  const counterpartMap = await buildCounterpartAssetMap(userId, transactions);

  return {
    data: transactions.map((tx) =>
      serializeTransaction(
        tx,
        tx.transferPairId ? counterpartMap.get(tx.transferPairId) ?? null : null
      )
    ),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// Get all assets for dropdown (user-specific)
export async function getAssets() {
  const userId = await getUserId();
  return db.asset.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      isin: true,
      ticker: true,
      category: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Attempts to pair a just-created TRANSFER with an existing un-paired counterpart.
 * Matches on same-day, matching share count, and crossed asset identity.
 * If a match is found, assigns a shared `transferPairId` to both rows.
 */
async function tryPairTransfer(
  userId: string,
  createdTx: {
    id: string;
    assetId: string;
    transferType: "IN" | "OUT" | null;
    date: Date;
    shares: Prisma.Decimal;
  },
  counterpartAssetId: string | undefined
): Promise<void> {
  if (!createdTx.transferType) return;
  if (!counterpartAssetId) return;

  const oppositeDirection = createdTx.transferType === "IN" ? "OUT" : "IN";
  const dayStart = new Date(createdTx.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(createdTx.date);
  dayEnd.setHours(23, 59, 59, 999);

  const match = await db.transaction.findFirst({
    where: {
      userId,
      type: "TRANSFER",
      transferType: oppositeDirection,
      transferPairId: null,
      assetId: counterpartAssetId,
      date: { gte: dayStart, lte: dayEnd },
      shares: createdTx.shares,
      id: { not: createdTx.id },
    },
    select: { id: true },
  });

  if (match) {
    const pairId = crypto.randomUUID();
    await db.$transaction([
      db.transaction.update({
        where: { id: createdTx.id },
        data: { transferPairId: pairId },
      }),
      db.transaction.update({
        where: { id: match.id },
        data: { transferPairId: pairId },
      }),
    ]);
  }
}

// Create a new transaction (optionally creating a new asset first)
export async function createTransaction(
  data: TransactionCreateInput
): Promise<ActionResult<SerializedTransaction>> {
  try {
    const userId = await getUserId();
    const validated = TransactionCreateSchema.parse(data);

    let assetId = validated.assetId;

    if (assetId === "__new__" && validated.newAssetName) {
      // Create a new asset first
      const hasIsin = validated.newAssetIsin && validated.newAssetIsin.trim() !== "";
      const isin = hasIsin ? validated.newAssetIsin!.trim() : `MANUAL-${crypto.randomUUID()}`;
      const newAsset = await db.asset.create({
        data: {
          userId,
          isin,
          ticker: null,
          name: validated.newAssetName.trim(),
          category: validated.newAssetCategory || "OTHERS",
          manualPricing: !hasIsin,
        },
      });
      assetId = newAsset.id;
    } else {
      // Verify asset belongs to user
      const asset = await db.asset.findFirst({
        where: { id: assetId, userId },
      });
      if (!asset) {
        return { success: false, error: "Asset not found" };
      }
    }

    const transaction = await db.transaction.create({
      data: {
        userId,
        assetId,
        type: validated.type,
        date: validated.date,
        shares: new Decimal(validated.shares),
        pricePerShare: validated.pricePerShare
          ? new Decimal(validated.pricePerShare)
          : null,
        totalAmount: new Decimal(validated.totalAmount),
        fees: validated.fees ? new Decimal(validated.fees) : new Decimal(0),
        transferType: validated.transferType || null,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            isin: true,
            ticker: true,
            category: true,
          },
        },
      },
    });

    // Pair with counterpart if provided
    if (
      transaction.type === "TRANSFER" &&
      validated.counterpartAssetId &&
      validated.counterpartAssetId !== "" &&
      validated.counterpartAssetId !== assetId
    ) {
      // Verify counterpart belongs to user
      const counterpart = await db.asset.findFirst({
        where: { id: validated.counterpartAssetId, userId },
        select: { id: true },
      });
      if (counterpart) {
        await tryPairTransfer(
          userId,
          {
            id: transaction.id,
            assetId: transaction.assetId,
            transferType: transaction.transferType,
            date: transaction.date,
            shares: transaction.shares,
          },
          counterpart.id
        );
      }
    }

    // Recalculate holdings globally so fiscal basis flows across any new pair.
    await recalculateAllHoldings(userId);

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath(`/portfolio/${assetId}`);

    const counterpartMap = await buildCounterpartAssetMap(userId, [transaction]);
    return {
      success: true,
      data: serializeTransaction(
        transaction,
        transaction.transferPairId
          ? counterpartMap.get(transaction.transferPairId) ?? null
          : null
      ),
    };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create transaction" };
  }
}

// Update an existing transaction
export async function updateTransaction(
  id: string,
  data: Partial<TransactionCreateInput>
): Promise<ActionResult<SerializedTransaction>> {
  try {
    const userId = await getUserId();
    const validated = TransactionUpdateSchema.parse(data);

    // Verify transaction belongs to user
    const existingTx = await db.transaction.findFirst({
      where: { id, userId },
      select: { assetId: true, transferPairId: true, type: true },
    });
    if (!existingTx) {
      return { success: false, error: "Transaction not found" };
    }

    const updateData: Prisma.TransactionUpdateInput = {};

    if (validated.assetId) {
      // Verify new asset belongs to user
      const asset = await db.asset.findFirst({
        where: { id: validated.assetId, userId },
      });
      if (!asset) {
        return { success: false, error: "Asset not found" };
      }
      updateData.asset = { connect: { id: validated.assetId } };
    }
    if (validated.type) updateData.type = validated.type;
    if (validated.date) updateData.date = validated.date;
    if (validated.shares) updateData.shares = new Decimal(validated.shares);
    if (validated.pricePerShare !== undefined) {
      updateData.pricePerShare = validated.pricePerShare
        ? new Decimal(validated.pricePerShare)
        : null;
    }
    if (validated.totalAmount) updateData.totalAmount = new Decimal(validated.totalAmount);
    if (validated.fees !== undefined) {
      updateData.fees = validated.fees ? new Decimal(validated.fees) : new Decimal(0);
    }
    if (validated.transferType !== undefined) {
      updateData.transferType = validated.transferType || null;
    }

    // Key fields that affect pairing (asset/type/direction/date/shares) changed?
    // Clear any stale pair on this leg AND its partner; we'll try to re-pair after.
    const pairingKeyFieldsChanged =
      validated.assetId !== undefined ||
      validated.type !== undefined ||
      validated.transferType !== undefined ||
      validated.date !== undefined ||
      validated.shares !== undefined;

    if (existingTx.transferPairId && pairingKeyFieldsChanged) {
      await db.transaction.updateMany({
        where: { userId, transferPairId: existingTx.transferPairId },
        data: { transferPairId: null },
      });
    }

    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            isin: true,
            ticker: true,
            category: true,
          },
        },
      },
    });

    // Re-try pairing if this is a TRANSFER and the user picked a counterpart
    if (
      transaction.type === "TRANSFER" &&
      validated.counterpartAssetId &&
      validated.counterpartAssetId !== "" &&
      validated.counterpartAssetId !== transaction.assetId
    ) {
      const counterpart = await db.asset.findFirst({
        where: { id: validated.counterpartAssetId, userId },
        select: { id: true },
      });
      if (counterpart) {
        await tryPairTransfer(
          userId,
          {
            id: transaction.id,
            assetId: transaction.assetId,
            transferType: transaction.transferType,
            date: transaction.date,
            shares: transaction.shares,
          },
          counterpart.id
        );
      }
    }

    // Recalculate all holdings globally
    await recalculateAllHoldings(userId);

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath(`/portfolio/${transaction.assetId}`);
    if (existingTx.assetId !== transaction.assetId) {
      revalidatePath(`/portfolio/${existingTx.assetId}`);
    }

    const counterpartMap = await buildCounterpartAssetMap(userId, [transaction]);
    return {
      success: true,
      data: serializeTransaction(
        transaction,
        transaction.transferPairId
          ? counterpartMap.get(transaction.transferPairId) ?? null
          : null
      ),
    };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update transaction" };
  }
}

// Delete a transaction
export async function deleteTransaction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();

    // Verify transaction belongs to user
    const transaction = await db.transaction.findFirst({
      where: { id, userId },
      select: { assetId: true, transferPairId: true },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    // If this transaction was part of a transfer pair, clear the other leg's
    // pair id so it reverts to the unpaired (non-fiscal) fallback, with a UI warning.
    if (transaction.transferPairId) {
      await db.transaction.updateMany({
        where: {
          userId,
          transferPairId: transaction.transferPairId,
          id: { not: id },
        },
        data: { transferPairId: null },
      });
    }

    await db.transaction.delete({ where: { id } });

    // Recalculate all holdings globally
    await recalculateAllHoldings(userId);

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath(`/portfolio/${transaction.assetId}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete transaction" };
  }
}

// Get a single transaction by ID
export async function getTransaction(
  id: string
): Promise<TransactionWithAsset | null> {
  const userId = await getUserId();
  return db.transaction.findFirst({
    where: { id, userId },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          isin: true,
          ticker: true,
          category: true,
        },
      },
    },
  });
}
