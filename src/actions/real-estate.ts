"use server";

import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { scopedDb } from "@/lib/scoped-db";
import { getUserId } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-utils";
import {
  PropertyInputSchema,
  MortgageInputSchema,
  ValuationInputSchema,
  PartialAmortizationInputSchema,
} from "@/lib/validators";

function fail(error: unknown, fallback: string): ActionResult<never> {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return {
      success: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed",
      code: "VALIDATION_ERROR",
    };
  }
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

async function ensurePropertyOwnership(userId: string, propertyId: string) {
  const property = await scopedDb(userId).property.findFirst({ where: { id: propertyId } });
  if (!property) throw new Error("Property not found");
  return property;
}

// ----- Property ------------------------------------------------------------

export async function createProperty(
  input: z.input<typeof PropertyInputSchema>
): Promise<ActionResult<{ propertyId: string }>> {
  try {
    const userId = await getUserId();
    const data = PropertyInputSchema.parse(input);

    // Nested create: scopedDb only injects userId at the top level, so the
    // property and its nested owners both set userId explicitly on the raw client.
    const property = await db.property.create({
      data: {
        userId,
        name: data.name,
        purchaseDate: data.purchaseDate,
        currency: data.currency,
        purchasePrice: new Decimal(data.purchasePrice),
        vatRate: new Decimal(data.vatRate),
        transferTaxRate: new Decimal(data.transferTaxRate),
        purchaseCosts: new Decimal(data.purchaseCosts),
        owners: {
          create: data.owners.map((o) => ({
            userId,
            name: o.name,
            sharePct: new Decimal(o.sharePct),
            isSelf: o.isSelf,
          })),
        },
      },
    });

    revalidatePath("/real-estate");
    return { success: true, data: { propertyId: property.id } };
  } catch (error) {
    return fail(error, "Failed to create property");
  }
}

export async function updateProperty(
  propertyId: string,
  input: z.input<typeof PropertyInputSchema>
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    const data = PropertyInputSchema.parse(input);

    // Replace owners atomically.
    await db.$transaction([
      db.property.update({
        where: { id: propertyId },
        data: {
          name: data.name,
          purchaseDate: data.purchaseDate,
          currency: data.currency,
          purchasePrice: new Decimal(data.purchasePrice),
          vatRate: new Decimal(data.vatRate),
          transferTaxRate: new Decimal(data.transferTaxRate),
          purchaseCosts: new Decimal(data.purchaseCosts),
        },
      }),
      db.propertyOwner.deleteMany({ where: { propertyId } }),
      db.propertyOwner.createMany({
        data: data.owners.map((o) => ({
          userId,
          propertyId,
          name: o.name,
          sharePct: new Decimal(o.sharePct),
          isSelf: o.isSelf,
        })),
      }),
    ]);

    revalidatePath("/real-estate");
    revalidatePath(`/real-estate/${propertyId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to update property");
  }
}

export async function deleteProperty(propertyId: string): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    await db.property.delete({ where: { id: propertyId } });
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to delete property");
  }
}

// ----- Mortgage ------------------------------------------------------------

export async function upsertMortgage(
  propertyId: string,
  input: z.input<typeof MortgageInputSchema>
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    const data = MortgageInputSchema.parse(input);

    const values = {
      userId,
      loanAmount: new Decimal(data.loanAmount),
      downPayment: new Decimal(data.downPayment),
      termMonths: data.termMonths,
      annualInterestRate: new Decimal(data.annualInterestRate),
      type: data.type,
      startDate: data.startDate,
      initialInterestAmount:
        data.initialInterestAmount != null
          ? new Decimal(data.initialInterestAmount)
          : null,
      initialInterestDate: data.initialInterestDate ?? null,
    };

    await db.mortgage.upsert({
      where: { propertyId },
      create: { propertyId, ...values },
      update: values,
    });

    revalidatePath(`/real-estate/${propertyId}`);
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to save mortgage");
  }
}

export async function deleteMortgage(propertyId: string): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    await scopedDb(userId).mortgage.deleteMany({ where: { propertyId } });
    revalidatePath(`/real-estate/${propertyId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to delete mortgage");
  }
}

// ----- Valuations ----------------------------------------------------------

export async function addValuation(
  propertyId: string,
  input: z.input<typeof ValuationInputSchema>
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    const data = ValuationInputSchema.parse(input);

    await db.propertyValuation.upsert({
      where: { propertyId_date: { propertyId, date: data.date } },
      create: {
        userId,
        propertyId,
        date: data.date,
        value: new Decimal(data.value),
        note: data.note || null,
      },
      update: { value: new Decimal(data.value), note: data.note || null },
    });

    revalidatePath(`/real-estate/${propertyId}`);
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to add valuation");
  }
}

export async function deleteValuation(
  valuationId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    // Ownership is enforced by the scoped read; the delete-by-id then runs on
    // the raw client (delete targets a unique selector, which scopedDb rejects).
    const valuation = await scopedDb(userId).propertyValuation.findFirst({
      where: { id: valuationId },
    });
    if (!valuation) return { success: false, error: "Valuation not found" };
    await db.propertyValuation.delete({ where: { id: valuationId } });
    revalidatePath(`/real-estate/${valuation.propertyId}`);
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to delete valuation");
  }
}

// ----- Partial amortizations ----------------------------------------------

export async function addPartialAmortization(
  propertyId: string,
  input: z.input<typeof PartialAmortizationInputSchema>
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    await ensurePropertyOwnership(userId, propertyId);
    const mortgage = await scopedDb(userId).mortgage.findFirst({ where: { propertyId } });
    if (!mortgage) return { success: false, error: "Mortgage not found" };
    const data = PartialAmortizationInputSchema.parse(input);

    await db.partialAmortization.create({
      data: {
        userId,
        mortgageId: mortgage.id,
        date: data.date,
        amount: new Decimal(data.amount),
        mode: data.mode,
      },
    });

    revalidatePath(`/real-estate/${propertyId}`);
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to add amortization");
  }
}

export async function deletePartialAmortization(
  amortizationId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    const amortization = await scopedDb(userId).partialAmortization.findFirst({
      where: { id: amortizationId },
      include: { mortgage: true },
    });
    if (!amortization) return { success: false, error: "Amortization not found" };
    await db.partialAmortization.delete({ where: { id: amortizationId } });
    revalidatePath(`/real-estate/${amortization.mortgage.propertyId}`);
    revalidatePath("/real-estate");
    return { success: true, data: undefined };
  } catch (error) {
    return fail(error, "Failed to delete amortization");
  }
}
