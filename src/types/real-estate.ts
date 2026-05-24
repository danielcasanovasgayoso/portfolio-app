import type { ScheduleRow, MortgageSummary } from "@/services/mortgage.service";

export type MortgageType = "FIXED" | "VARIABLE";
export type AmortizationMode = "REDUCE_TERM" | "REDUCE_INSTALLMENT";

export interface PropertyOwnerDto {
  id: string;
  name: string;
  sharePct: number;
}

export interface PropertyValuationDto {
  id: string;
  date: string;
  value: number;
  note: string | null;
}

export interface PartialAmortizationDto {
  id: string;
  date: string;
  amount: number;
  mode: AmortizationMode;
}

export interface MortgageDto {
  id: string;
  loanAmount: number;
  downPayment: number;
  termMonths: number;
  annualInterestRate: number;
  type: MortgageType;
  startDate: string;
  partialAmortizations: PartialAmortizationDto[];
}

/** Acquisition cost: base price plus taxes and purchase costs. */
export interface AcquisitionCost {
  purchasePrice: number;
  vat: number;
  subtotalWithVat: number;
  transferTax: number;
  purchaseCosts: number;
  total: number;
}

/** Per-owner split of a set of monetary totals. */
export interface OwnerSplit {
  ownerId: string;
  name: string;
  sharePct: number;
  downPayment: number;
  paidToDate: number;
  invested: number;
  remainingBalance: number;
}

export interface PropertyListItem {
  id: string;
  name: string;
  currency: string;
  purchaseDate: string;
  acquisitionTotal: number;
  marketValue: number | null;
  mortgageBalance: number | null;
  equity: number | null;
}

export interface PropertyDetail {
  id: string;
  name: string;
  currency: string;
  purchaseDate: string;
  purchasePrice: number;
  vatRate: number;
  transferTaxRate: number;
  purchaseCosts: number;
  owners: PropertyOwnerDto[];
  valuations: PropertyValuationDto[];
  mortgage: MortgageDto | null;
  acquisition: AcquisitionCost;
  schedule: ScheduleRow[];
  mortgageSummary: MortgageSummary | null;
  ownerSplits: OwnerSplit[];
  marketValue: number | null;
  equity: number | null;
}
