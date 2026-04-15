export type AssetCategory = "FUNDS" | "STOCKS" | "PP" | "OTHERS";

export interface Holding {
  id: string;
  assetId?: string;
  name: string;
  isin: string;
  ticker: string | null;
  category: AssetCategory;
  shares: number;
  costBasis: number;
  avgPrice: number;
  currentPrice: number | null;
  priceDate: string | null;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  manualPricing?: boolean;
  /**
   * True if this holding contains any TRANSFER leg that is not paired to a
   * counterparty. Used to warn the user that the displayed fiscal cost basis
   * may be incomplete — the cost basis of the unpaired leg did not carry over.
   */
  hasUnpairedTransfers?: boolean;
}

export interface CategoryTotal {
  costBasis: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface PortfolioSummary {
  holdings: {
    funds: Holding[];
    stocks: Holding[];
    pp: Holding[];
    others: Holding[];
  };
  totals: {
    funds: CategoryTotal | null;
    stocks: CategoryTotal | null;
    pp: CategoryTotal | null;
    others: CategoryTotal | null;
    invested: CategoryTotal | null;
    grand: CategoryTotal | null;
  };
}

export interface PortfolioStats {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}
