export type AssetClass = "FUND" | "ETF" | "STOCK" | "PENSION";

export interface Holding {
  id: string;
  assetId?: string;
  name: string;
  isin: string;
  ticker: string | null;
  category: AssetClass;
  shares: number;
  costBasis: number;
  avgPrice: number;
  currentPrice: number | null;
  priceDate: string | null;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  manualPricing?: boolean;
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
    etfs: Holding[];
    stocks: Holding[];
    pensions: Holding[];
  };
  totals: {
    funds: CategoryTotal | null;
    etfs: CategoryTotal | null;
    stocks: CategoryTotal | null;
    pensions: CategoryTotal | null;
    total: CategoryTotal | null;
  };
}

export interface PortfolioStats {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}
