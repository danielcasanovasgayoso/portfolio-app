import { formatCurrency, formatPercent, getGainClass } from "@/lib/formatters";
import type { CategoryTotal } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";

interface PortfolioSummaryCardProps {
  grand: CategoryTotal | null;
  invested: CategoryTotal | null;
}

export function PortfolioSummaryCard({
  grand,
  invested,
}: PortfolioSummaryCardProps) {
  const displayTotals = invested || grand;

  if (!grand) {
    return (
      <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-8 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className="label-sm">Net Worth</span>
        </div>
        <p className="text-4xl font-mono font-bold tracking-tight text-muted-foreground">
          —
        </p>
      </article>
    );
  }

  const gainClass = getGainClass(displayTotals?.gainLoss ?? 0);
  const isPositive = gainClass === "positive";

  return (
    <article className="dark bg-hero-gradient rounded-xl border-0 shadow-ambient p-6 sm:p-8 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <span className="label-sm">Total Net Worth</span>
      </div>

      {/* Main Value */}
      <div className="mb-4 sm:mb-8">
        <p className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tighter text-foreground">
          {formatCurrency(grand.marketValue)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Invested */}
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="label-sm text-muted-foreground">Invested</span>
          </div>
          <p className="text-sm sm:text-lg md:text-xl font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(displayTotals?.costBasis ?? 0)}
          </p>
        </div>

        {/* Gain/Loss */}
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            {isPositive ? (
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gain" />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-loss" />
            )}
            <span className="label-sm text-muted-foreground">Gain/Loss</span>
          </div>
          <p
            className={cn(
              "text-sm sm:text-lg md:text-xl font-mono font-semibold tabular-nums",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {(displayTotals?.gainLoss ?? 0) >= 0 ? "+" : ""}
            {formatCurrency(displayTotals?.gainLoss ?? 0)}
          </p>
        </div>

        {/* Return */}
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="label-sm text-muted-foreground">Return</span>
          </div>
          <p
            className={cn(
              "text-sm sm:text-lg md:text-xl font-mono font-semibold tabular-nums",
              isPositive ? "text-gain" : "text-loss"
            )}
          >
            {formatPercent(displayTotals?.gainLossPercent ?? 0)}
          </p>
        </div>
      </div>
    </article>
  );
}
