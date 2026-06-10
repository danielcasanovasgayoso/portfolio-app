"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { db } from "@/lib/db";
import {
  TransactionCreateSchema,
  TransactionUpdateSchema,
  TransactionFiltersSchema,
  type TransactionCreateInput,
  type TransactionFiltersInput,
} from "@/lib/validators";
import { recalculateHolding } from "@/services/holdings.service";
import { scopedDb } from "@/lib/scoped-db";
import type { ActionResult } from "@/lib/action-utils";
import type {
  TransactionWithAsset,
  SerializedTransaction,
  PaginatedResult,
} from "@/types/transaction";
import { getUserId } from "@/lib/auth";
import { toUtcMidnight } from "@/lib/utils";

// Helper to serialize Decimal and Date fields for client components
function serializeTransaction(tx: TransactionWithAsset): SerializedTransaction {
  return {
    ...tx,
    shares: Number(tx.shares),
    pricePerShare: tx.pricePerShare ? Number(tx.pricePerShare) : null,
    totalAmount: Number(tx.totalAmount),
    fees: tx.fees ? Number(tx.fees) : null,
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

// Get paginated transactions with filters
export async function getTransactions(
  filters: TransactionFiltersInput
): Promise<PaginatedResult<SerializedTransaction>> {
  const userId = await getUserId();
  const validated = TransactionFiltersSchema.parse(filters);
  const { types, dateFrom, dateTo, assetId, page, perPage } = validated;

  // userId is injected by the scoped client below.
  const where: Prisma.TransactionWhereInput = {};

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

  const sdb = scopedDb(userId);
  const [transactions, total] = await Promise.all([
    sdb.transaction.findMany({
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
    sdb.transaction.count({ where }),
  ]);

  return {
    data: transactions.map(serializeTransaction),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// Get all assets for dropdown (user-specific)
export async function getAssets() {
  const userId = await getUserId();
  return scopedDb(userId).asset.findMany({
    where: { isActive: true },
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

// Create a new transaction (optionally creating a new asset first)
export async function createTransaction(
  data: TransactionCreateInput
): Promise<ActionResult<SerializedTransaction>> {
  try {
    const userId = await getUserId();
    const validated = TransactionCreateSchema.parse(data);

    const creatingNewAsset = validated.assetId === "__new__" && !!validated.newAssetName;

    // Read-only ownership check before opening the write transaction.
    if (!creatingNewAsset) {
      const asset = await scopedDb(userId).asset.findFirst({
        where: { id: validated.assetId },
      });
      if (!asset) {
        return { success: false, error: "Asset not found", code: "ASSET_NOT_FOUND" };
      }
    }

    // Asset creation (if any), the transaction insert, and the holding
    // recalculation must commit or roll back together, otherwise a failed
    // recalculation would leave a persisted transaction with a stale holding.
    const transaction = await db.$transaction(async (tx) => {
      let assetId = validated.assetId;

      if (creatingNewAsset) {
        const hasIsin = validated.newAssetIsin && validated.newAssetIsin.trim() !== "";
        const isin = hasIsin ? validated.newAssetIsin!.trim() : `MANUAL-${crypto.randomUUID()}`;
        const newAsset = await tx.asset.create({
          data: {
            userId,
            isin,
            ticker: null,
            name: validated.newAssetName!.trim(),
            category: validated.newAssetCategory || "FUND",
            manualPricing: !hasIsin,
          },
        });
        assetId = newAsset.id;
      }

      const created = await tx.transaction.create({
        data: {
          userId,
          assetId,
          type: validated.type,
          date: toUtcMidnight(validated.date),
          shares: new Decimal(validated.shares),
          pricePerShare: validated.pricePerShare
            ? new Decimal(validated.pricePerShare)
            : null,
          totalAmount: new Decimal(validated.totalAmount),
          fees: validated.fees ? new Decimal(validated.fees) : new Decimal(0),
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

      await recalculateHolding(userId, assetId, tx);

      // Optional convenience: mirror the cash leg in the Wallet domain so a
      // BUY funded with wallet cash (or a SELL returning cash) doesn't need a
      // second manual entry. Application-level orchestration only — there is
      // no FK or model coupling between the movement and the transaction.
      const walletMovementType =
        validated.type === "BUY"
          ? ("WITHDRAWAL" as const)
          : validated.type === "SELL"
            ? ("DEPOSIT" as const)
            : null;
      if (validated.walletSync && walletMovementType) {
        await tx.cashMovement.create({
          data: {
            userId,
            type: walletMovementType,
            date: toUtcMidnight(validated.date),
            amount: new Decimal(validated.totalAmount).abs(),
            note: created.asset.name,
          },
        });
      }

      return created;
    });

    revalidatePath("/investments/transactions");
    revalidatePath("/");
    revalidatePath(`/investments/assets/${transaction.assetId}`);
    revalidatePath("/investments");
    if (validated.walletSync) {
      revalidatePath("/wallet");
    }

    return { success: true, data: serializeTransaction(transaction) };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message, code: "OPERATION_FAILED" };
    }
    return { success: false, error: "Failed to create transaction", code: "OPERATION_FAILED" };
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
    const existingTx = await scopedDb(userId).transaction.findFirst({
      where: { id },
      select: { assetId: true },
    });
    if (!existingTx) {
      return { success: false, error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" };
    }

    const updateData: Prisma.TransactionUpdateInput = {};

    if (validated.assetId) {
      // Verify new asset belongs to user
      const asset = await scopedDb(userId).asset.findFirst({
        where: { id: validated.assetId },
      });
      if (!asset) {
        return { success: false, error: "Asset not found", code: "ASSET_NOT_FOUND" };
      }
      updateData.asset = { connect: { id: validated.assetId } };
    }
    if (validated.type) updateData.type = validated.type;
    if (validated.date) updateData.date = toUtcMidnight(validated.date);
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

    // The update and recalculation of every affected holding (both the new and
    // the previous asset when the transaction is reassigned) must be atomic.
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
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

      await recalculateHolding(userId, updated.assetId, tx);
      if (existingTx.assetId !== updated.assetId) {
        await recalculateHolding(userId, existingTx.assetId, tx);
      }

      return updated;
    });

    revalidatePath("/investments/transactions");
    revalidatePath("/");
    revalidatePath(`/investments/assets/${transaction.assetId}`);
    revalidatePath("/investments");

    return { success: true, data: serializeTransaction(transaction) };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message, code: "OPERATION_FAILED" };
    }
    return { success: false, error: "Failed to update transaction", code: "OPERATION_FAILED" };
  }
}

// Delete a transaction
export async function deleteTransaction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();

    // Verify transaction belongs to user
    const transaction = await scopedDb(userId).transaction.findFirst({
      where: { id },
      select: { assetId: true },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" };
    }

    // Delete and holding recalculation must commit or roll back together.
    await db.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id } });
      await recalculateHolding(userId, transaction.assetId, tx);
    });

    revalidatePath("/investments/transactions");
    revalidatePath("/");
    revalidatePath(`/investments/assets/${transaction.assetId}`);
    revalidatePath("/investments");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message, code: "OPERATION_FAILED" };
    }
    return { success: false, error: "Failed to delete transaction", code: "OPERATION_FAILED" };
  }
}

// Get a single transaction by ID
export async function getTransaction(
  id: string
): Promise<TransactionWithAsset | null> {
  const userId = await getUserId();
  return scopedDb(userId).transaction.findFirst({
    where: { id },
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
