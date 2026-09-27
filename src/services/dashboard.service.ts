// Dashboard: the ONLY place where the three domains (wallet, investments,
// real estate) are aggregated, and strictly read-only. It composes each
// domain's public summary — it never reaches into another domain's entities.

import { getWalletSummary, getWalletBalanceHistory } from "@/services/wallet.service";
import {
  getInvestmentsSummary,
  getPortfolioValueHistory,
} from "@/services/portfolio.service";
import {
  getRealEstateSummary,
  getRealEstateEquityHistory,
} from "@/services/real-estate.service";
import type { SeriesPoint } from "@/lib/series";
import type { NetWorthDomain } from "@/lib/net-worth-filter";

export interface DashboardData {
  netWorth: number;
  wallet: {
    balance: number;
    movementsCount: number;
  };
  investments: {
    marketValue: number;
    gainLoss: number;
    gainLossPercent: number;
    holdingsCount: number;
  };
  realEstate: {
    userEquity: number;
    userGain: number;
    userGainPercent: number;
    propertiesCount: number;
  };
  /**
   * Per-domain evolution series (wallet balance, investments value, RE
   * equity), kept separate so the dashboard can fold only the domains the user
   * chose to include into the net-worth line.
   */
  histories: Record<NetWorthDomain, SeriesPoint[]>;
  isEmpty: boolean;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    wallet,
    investments,
    realEstate,
    walletHistory,
    investmentsHistory,
    realEstateHistory,
  ] = await Promise.all([
    getWalletSummary(userId),
    getInvestmentsSummary(userId),
    getRealEstateSummary(userId),
    getWalletBalanceHistory(userId),
    getPortfolioValueHistory(userId),
    getRealEstateEquityHistory(userId),
  ]);

  const netWorth =
    wallet.balance + investments.marketValue + realEstate.userEquity;

  return {
    netWorth: Math.round(netWorth * 100) / 100,
    wallet: {
      balance: wallet.balance,
      movementsCount: wallet.movementsCount,
    },
    investments: {
      marketValue: investments.marketValue,
      gainLoss: investments.gainLoss,
      gainLossPercent: investments.gainLossPercent,
      holdingsCount: investments.holdingsCount,
    },
    realEstate: {
      userEquity: realEstate.userEquity,
      userGain: realEstate.userGain,
      userGainPercent: realEstate.userGainPercent,
      propertiesCount: realEstate.propertiesCount,
    },
    histories: {
      wallet: walletHistory,
      investments: investmentsHistory,
      realEstate: realEstateHistory,
    },
    isEmpty:
      wallet.movementsCount === 0 &&
      investments.holdingsCount === 0 &&
      realEstate.propertiesCount === 0,
  };
}
