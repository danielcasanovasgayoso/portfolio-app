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
import { recalculateHolding } from "@/services/holdings.service";
import type { ActionResult } from "@/lib/action-utils";
import type {
  TransactionWithAsset,
  SerializedTransaction,
  PaginatedResult,
} from "@/types/transaction";
import { getUserId } from "@/lib/auth";

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
      const isin = `MANUAL-${crypto.randomUUID()}`;
      const newAsset = await db.asset.create({
        data: {
          userId,
          isin,
          ticker: null,
          name: validated.newAssetName.trim(),
          category: validated.newAssetCategory || "OTHERS",
          manualPricing: true,
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

    // Recalculate holdings for the affected asset
    await recalculateHolding(userId, assetId);

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath(`/portfolio/${assetId}`);

    return { success: true, data: serializeTransaction(transaction) };
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
      select: { assetId: true },
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

    // Recalculate holdings for affected assets
    await recalculateHolding(userId, transaction.assetId);
    if (existingTx.assetId !== transaction.assetId) {
      await recalculateHolding(userId, existingTx.assetId);
    }

    revalidatePath("/transactions");
    revalidatePath("/");
    revalidatePath(`/portfolio/${transaction.assetId}`);

    return { success: true, data: serializeTransaction(transaction) };
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
      select: { assetId: true },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    await db.transaction.delete({ where: { id } });

    // Recalculate holdings for the affected asset
    await recalculateHolding(userId, transaction.assetId);

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
