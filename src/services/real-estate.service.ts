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
  RealEstateSummary,
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
      initialInterest:
        m.initialInterestAmount != null && m.initialInterestDate != null
          ? {
              date: m.initialInterestDate,
              amount: Number(m.initialInterestAmount),
            }
          : undefined,
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

/**
 * Fraction of a property's equity attributable to the app user.
 * - No owners listed → 1.0 (sole implied owner).
 * - One+ owners marked `isSelf` → sum of their shares / 100.
 * - Owners listed but none marked `isSelf` → 1.0 (back-compat default, so
 *   existing properties keep counting fully until the user marks co-owners).
 */
function userShareFraction(property: DbProperty): number {
  if (property.owners.length === 0) return 1;
  const selfOwners = property.owners.filter((o) => o.isSelf);
  if (selfOwners.length === 0) return 1;
  const pct = selfOwners.reduce((sum, o) => sum + Number(o.sharePct), 0);
  return pct / 100;
}

/** Outstanding mortgage balance for a property today, or null if no mortgage. */
function mortgageBalanceOf(property: DbProperty): number | null {
  const mi = toMortgageInput(property);
  if (!mi) return null;
  const schedule = computeSchedule(mi.input, mi.partials);
  return summarize(mi.input, schedule).remainingBalance;
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
    const mortgageBalance = mortgageBalanceOf(property);

    const equity =
      marketValue != null
        ? round2(marketValue - (mortgageBalance ?? 0))
        : null;
    const userEquity =
      equity != null ? round2(equity * userShareFraction(property)) : null;

    return {
      id: property.id,
      name: property.name,
      currency: property.currency,
      purchaseDate: property.purchaseDate.toISOString().split("T")[0],
      acquisitionTotal: acquisition.total,
      marketValue,
      mortgageBalance,
      equity,
      userEquity,
    };
  });
}

/**
 * Aggregate real-estate figures across all of a user's properties.
 * `userEquity` is the figure folded into the dashboard Total Net Worth.
 */
export async function getRealEstateSummary(
  userId: string
): Promise<RealEstateSummary> {
  const properties = await db.property.findMany({
    where: { userId },
    include: propertyInclude,
  });

  const summary: RealEstateSummary = {
    marketValue: 0,
    mortgageBalance: 0,
    equity: 0,
    userEquity: 0,
  };

  for (const property of properties) {
    const marketValue = latestValuation(property);
    if (marketValue == null) continue; // no valuation → no contribution
    const mortgageBalance = mortgageBalanceOf(property) ?? 0;
    const equity = marketValue - mortgageBalance;
    const fraction = userShareFraction(property);

    summary.marketValue += marketValue;
    summary.mortgageBalance += mortgageBalance;
    summary.equity += equity;
    summary.userEquity += equity * fraction;
  }

  return {
    marketValue: round2(summary.marketValue),
    mortgageBalance: round2(summary.mortgageBalance),
    equity: round2(summary.equity),
    userEquity: round2(summary.userEquity),
  };
}

/**
 * User-share real-estate equity over time, as a { date, close }[] series
 * compatible with PriceChart. For each property we build step functions for
 * market value (latest valuation on/before a date) and outstanding mortgage
 * balance (latest schedule row on/before a date), take the difference, scale by
 * the user's ownership share, and sum across properties on the union of dates.
 */
export async function getRealEstateEquityHistory(
  userId: string
): Promise<{ date: string; close: number }[]> {
  const properties = await db.property.findMany({
    where: { userId },
    include: propertyInclude,
  });

  type Series = { value: (d: string) => number };
  const propertySeries: Series[] = [];
  const allDates = new Set<string>();
  // Cap the series to today — the amortization schedule extends years into the
  // future, but the historical net-worth chart must stop at the present.
  const today = new Date().toISOString().split("T")[0];

  for (const property of properties) {
    // Market value step points: each valuation date.
    const valuations = property.valuations
      .map((v) => ({
        date: v.date.toISOString().split("T")[0],
        value: Number(v.value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (valuations.length === 0) continue; // no valuation → no contribution

    // Mortgage outstanding step points from the amortization schedule.
    const mi = toMortgageInput(property);
    const schedule = mi ? computeSchedule(mi.input, mi.partials) : [];
    const loanAmount = mi ? mi.input.loanAmount : 0;
    const fraction = userShareFraction(property);

    const valueAt = (d: string): number => {
      // Market value: latest valuation on/before d (none yet → 0, skip below).
      let mv = 0;
      let hasMv = false;
      for (const v of valuations) {
        if (v.date <= d) {
          mv = v.value;
          hasMv = true;
        } else break;
      }
      if (!hasMv) return 0;

      // Outstanding mortgage: latest schedule balance on/before d.
      let balance = 0;
      if (mi) {
        // Before the first installment the full loan is outstanding.
        balance = loanAmount;
        for (const row of schedule) {
          if (row.paymentDate <= d) {
            balance = row.balance;
          } else break;
        }
      }
      return (mv - balance) * fraction;
    };

    // Step points for this property: valuation dates + past schedule payment
    // dates. Future installments are skipped so the chart stops at today.
    for (const v of valuations) {
      if (v.date <= today) allDates.add(v.date);
    }
    for (const row of schedule) {
      if (row.paymentDate <= today) allDates.add(row.paymentDate);
    }
    propertySeries.push({ value: valueAt });
  }

  if (propertySeries.length === 0) return [];

  // Always include a point at today so the equity line reaches the present
  // (reflecting the current outstanding balance between installments).
  allDates.add(today);

  const sortedDates = Array.from(allDates)
    .filter((d) => d <= today)
    .sort();
  return sortedDates.map((d) => {
    const total = propertySeries.reduce((sum, s) => sum + s.value(d), 0);
    return { date: d, close: round2(total) };
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
      isSelf: o.isSelf,
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
          initialInterestAmount:
            property.mortgage.initialInterestAmount != null
              ? Number(property.mortgage.initialInterestAmount)
              : null,
          initialInterestDate:
            property.mortgage.initialInterestDate != null
              ? property.mortgage.initialInterestDate.toISOString().split("T")[0]
              : null,
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
