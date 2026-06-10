"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/client";
import { scopedDb } from "@/lib/scoped-db";
import {
  CashMovementInputSchema,
  type CashMovementInput,
} from "@/lib/validators";
import type { ActionResult } from "@/lib/action-utils";
import { getUserId } from "@/lib/auth";
import { toUtcMidnight } from "@/lib/utils";
import type { SerializedCashMovement } from "@/services/wallet.service";

function revalidateWallet() {
  revalidatePath("/wallet");
  revalidatePath("/"); // dashboard aggregates the wallet balance
}

export async function createCashMovement(
  data: CashMovementInput
): Promise<ActionResult<SerializedCashMovement>> {
  try {
    const userId = await getUserId();
    const validated = CashMovementInputSchema.parse(data);

    const movement = await scopedDb(userId).cashMovement.create({
      data: {
        userId,
        type: validated.type,
        date: toUtcMidnight(validated.date),
        amount: new Decimal(validated.amount),
        note: validated.note?.trim() || null,
      },
    });

    revalidateWallet();

    return {
      success: true,
      data: {
        id: movement.id,
        type: movement.type,
        date: movement.date.toISOString(),
        amount: Number(movement.amount),
        note: movement.note,
        createdAt: movement.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to create cash movement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create movement",
      code: "OPERATION_FAILED",
    };
  }
}

export async function updateCashMovement(
  id: string,
  data: CashMovementInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();
    const validated = CashMovementInputSchema.parse(data);

    const existing = await scopedDb(userId).cashMovement.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Movement not found", code: "OPERATION_FAILED" };
    }

    await scopedDb(userId).cashMovement.updateMany({
      where: { id },
      data: {
        type: validated.type,
        date: toUtcMidnight(validated.date),
        amount: new Decimal(validated.amount),
        note: validated.note?.trim() || null,
      },
    });

    revalidateWallet();
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to update cash movement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update movement",
      code: "OPERATION_FAILED",
    };
  }
}

export async function deleteCashMovement(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();

    const existing = await scopedDb(userId).cashMovement.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Movement not found", code: "OPERATION_FAILED" };
    }

    await scopedDb(userId).cashMovement.deleteMany({ where: { id } });

    revalidateWallet();
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete cash movement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete movement",
      code: "OPERATION_FAILED",
    };
  }
}
