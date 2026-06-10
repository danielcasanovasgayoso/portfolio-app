import type { ScheduleRow, MortgageSummary } from "@/services/mortgage.service";

export type MortgageType = "FIXED" | "VARIABLE";
export type AmortizationMode = "REDUCE_TERM" | "REDUCE_INSTALLMENT";

export interface PropertyOwnerDto {
  id: string;
  name: string;
  sharePct: number;
  isSelf: boolean;
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
  initialInterestAmount: number | null;
  initialInterestDate: string | null;
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
  /** Net equity attributable to the app user (equity × their ownership share). */
  userEquity: number | null;
}

/** Aggregate real-estate figures across all of a user's properties. */
export interface RealEstateSummary {
  marketValue: number;
  mortgageBalance: number;
  equity: number;
  /** Sum of each property's user-share equity — the figure folded into net worth. */
  userEquity: number;
  /**
   * Cash the user has actually invested (user-share), i.e. acquisition cost
   * minus the outstanding mortgage balance: down payment + taxes/fees +
   * principal repaid. Compared against equity on a like-for-like (net-of-debt)
   * basis, mirroring invested → market on the Funds card.
   */
  userCost: number;
  /**
   * Net equity gain attributable to the user: userEquity − userCost. Equals the
   * property's appreciation (marketValue − acquisitionTotal) scaled by the
   * user's ownership share.
   */
  userGain: number;
  /** userGain as a fraction of userCost (0.15 = +15%). */
  userGainPercent: number;
  /** Number of properties tracked (with or without valuations). */
  propertiesCount: number;
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
