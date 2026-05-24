import { db } from "@/lib/db";
import {
  computeSchedule,
  summarize,
  type MortgageInput,
  type PartialAmortizationInput,
} from "@/services/mortgage.service";
import type {
  AcquisitionCost,
  OwnerSplit,
  PropertyDetail,
  PropertyListItem,
} from "@/types/real-estate";
import type { Prisma } from "@prisma/client";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type DbProperty = Prisma.PropertyGetPayload<{
  include: {
    owners: true;
    valuations: true;
    mortgage: { include: { partialAmortizations: true } };
  };
}>;

const propertyInclude = {
  owners: true,
  valuations: { orderBy: { date: "asc" as const } },
  mortgage: { include: { partialAmortizations: { orderBy: { date: "asc" as const } } } },
} as const;

/** Computes the acquisition cost from the base price + tax rates + costs. */
function computeAcquisition(property: DbProperty): AcquisitionCost {
  const purchasePrice = Number(property.purchasePrice);
  const vatRate = Number(property.vatRate);
  const transferTaxRate = Number(property.transferTaxRate);
  const purchaseCosts = Number(property.purchaseCosts);

  const vat = round2(purchasePrice * vatRate);
  const subtotalWithVat = round2(purchasePrice + vat);
  // AJD is levied on the base price (excluding VAT), per Spanish practice.
  const transferTax = round2(purchasePrice * transferTaxRate);
  const total = round2(subtotalWithVat + transferTax + purchaseCosts);

  return {
    purchasePrice,
    vat,
    subtotalWithVat,
    transferTax,
    purchaseCosts,
    total,
  };
}

function toMortgageInput(property: DbProperty): {
  input: MortgageInput;
  partials: PartialAmortizationInput[];
} | null {
  if (!property.mortgage) return null;
  const m = property.mortgage;
  return {
    input: {
      loanAmount: Number(m.loanAmount),
      downPayment: Number(m.downPayment),
      termMonths: m.termMonths,
      annualInterestRate: Number(m.annualInterestRate),
      startDate: m.startDate,
    },
    partials: m.partialAmortizations.map((p) => ({
      date: p.date,
      amount: Number(p.amount),
      mode: p.mode,
    })),
  };
}

function latestValuation(property: DbProperty): number | null {
  if (property.valuations.length === 0) return null;
  // valuations are ordered ascending by date
  return Number(property.valuations[property.valuations.length - 1].value);
}

export async function getProperties(userId: string): Promise<PropertyListItem[]> {
  const properties = await db.property.findMany({
    where: { userId },
    include: propertyInclude,
    orderBy: { createdAt: "asc" },
  });

  return properties.map((property) => {
    const acquisition = computeAcquisition(property);
    const marketValue = latestValuation(property);

    let mortgageBalance: number | null = null;
    const mi = toMortgageInput(property);
    if (mi) {
      const schedule = computeSchedule(mi.input, mi.partials);
      mortgageBalance = summarize(mi.input, schedule).remainingBalance;
    }

    const equity =
      marketValue != null
        ? round2(marketValue - (mortgageBalance ?? 0))
        : null;

    return {
      id: property.id,
      name: property.name,
      currency: property.currency,
      purchaseDate: property.purchaseDate.toISOString().split("T")[0],
      acquisitionTotal: acquisition.total,
      marketValue,
      mortgageBalance,
      equity,
    };
  });
}

export async function getPropertyDetail(
  userId: string,
  propertyId: string
): Promise<PropertyDetail | null> {
  const property = await db.property.findFirst({
    where: { id: propertyId, userId },
    include: propertyInclude,
  });
  if (!property) return null;

  const acquisition = computeAcquisition(property);
  const marketValue = latestValuation(property);

  const mi = toMortgageInput(property);
  const schedule = mi ? computeSchedule(mi.input, mi.partials) : [];
  const mortgageSummary = mi ? summarize(mi.input, schedule) : null;

  const mortgageBalance = mortgageSummary?.remainingBalance ?? null;
  const equity =
    marketValue != null ? round2(marketValue - (mortgageBalance ?? 0)) : null;

  const ownerSplits: OwnerSplit[] = property.owners.map((owner) => {
    const fraction = Number(owner.sharePct) / 100;
    const downPayment = round2((mortgageSummary?.downPayment ?? 0) * fraction);
    const paidToDate = round2((mortgageSummary?.paidToDate ?? 0) * fraction);
    return {
      ownerId: owner.id,
      name: owner.name,
      sharePct: Number(owner.sharePct),
      downPayment,
      paidToDate,
      invested: round2(downPayment + paidToDate),
      remainingBalance: round2((mortgageBalance ?? 0) * fraction),
    };
  });

  return {
    id: property.id,
    name: property.name,
    currency: property.currency,
    purchaseDate: property.purchaseDate.toISOString().split("T")[0],
    purchasePrice: Number(property.purchasePrice),
    vatRate: Number(property.vatRate),
    transferTaxRate: Number(property.transferTaxRate),
    purchaseCosts: Number(property.purchaseCosts),
    owners: property.owners.map((o) => ({
      id: o.id,
      name: o.name,
      sharePct: Number(o.sharePct),
    })),
    valuations: property.valuations.map((v) => ({
      id: v.id,
      date: v.date.toISOString().split("T")[0],
      value: Number(v.value),
      note: v.note,
    })),
    mortgage: property.mortgage
      ? {
          id: property.mortgage.id,
          loanAmount: Number(property.mortgage.loanAmount),
          downPayment: Number(property.mortgage.downPayment),
          termMonths: property.mortgage.termMonths,
          annualInterestRate: Number(property.mortgage.annualInterestRate),
          type: property.mortgage.type,
          startDate: property.mortgage.startDate.toISOString().split("T")[0],
          partialAmortizations: property.mortgage.partialAmortizations.map((p) => ({
            id: p.id,
            date: p.date.toISOString().split("T")[0],
            amount: Number(p.amount),
            mode: p.mode,
          })),
        }
      : null,
    acquisition,
    schedule,
    mortgageSummary,
    ownerSplits,
    marketValue,
    equity,
  };
}
